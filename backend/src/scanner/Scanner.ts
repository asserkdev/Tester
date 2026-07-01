import { chromium, Browser, Page, BrowserContext } from 'playwright';
import type {
  PageData,
  PageMetadata,
  ResourceData,
  ConsoleMessage,
  PerformanceMetrics,
  Viewport,
  ScanOptions,
} from '../types/index.js';

interface ViewportConfig {
  width: number;
  height: number;
  userAgent?: string;
}

const VIEWPORT_PRESETS: Record<Viewport, ViewportConfig> = {
  mobile: { width: 375, height: 812, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15' },
  tablet: { width: 768, height: 1024, userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15' },
  desktop: { width: 1920, height: 1080 },
};

export class Scanner {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private visitedUrls: Set<string> = new Set();

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({ headless: true });
    this.visitedUrls.clear();
  }

  async close(): Promise<void> {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    this.page = null;
    this.context = null;
    this.browser = null;
  }

  async scanPage(url: string, options: ScanOptions): Promise<PageData> {
    if (!this.browser) await this.initialize();

    const viewport = VIEWPORT_PRESETS[options.viewport];
    
    this.context = await this.browser!.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      userAgent: viewport.userAgent,
      ignoreHTTPSErrors: true,
    });

    this.page = await this.context.newPage();
    const consoleMessages: ConsoleMessage[] = [];
    const resources: ResourceData[] = [];

    this.page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type() as ConsoleMessage['type'],
        message: msg.text(),
        location: msg.location()?.url,
        timestamp: Date.now(),
      });
    });

    this.page.on('response', (response) => {
      const respUrl = response.url();
      const size = parseInt(response.headers()['content-length'] || '0', 10);
      resources.push({
        url: respUrl,
        type: this.getResourceType(respUrl, response.headers()['content-type'] || ''),
        size,
        loadTime: 0,
        status: response.status(),
        fromCache: false,
      });
    });

    await this.page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: options.timeout * 1000 
    });

    const html = await this.page.content();
    const metadata = await this.extractMetadata();
    const performanceMetrics = await this.extractPerformanceMetrics();

    const pageData: PageData = {
      url,
      html,
      dom: await this.page.evaluate(() => document.body?.innerHTML || ''),
      resources,
      consoleMessages,
      metadata,
      performanceMetrics,
    };

    if (this.visitedUrls.has(url)) {
      return pageData;
    }
    this.visitedUrls.add(url);

    return pageData;
  }

  private async extractMetadata(): Promise<PageMetadata> {
    if (!this.page) throw new Error('Page not initialized');

    return await this.page.evaluate(() => {
      const getMetaContent = (name: string): string | undefined => {
        const meta = document.querySelector(`meta[name="${name}"]`) || 
                     document.querySelector(`meta[property="${name}"]`);
        return meta?.getAttribute('content') || undefined;
      };

      const ogTags: Record<string, string> = {};
      document.querySelectorAll('meta[property^="og:"]').forEach((meta) => {
        const property = meta.getAttribute('property');
        const content = meta.getAttribute('content');
        if (property && content) ogTags[property] = content;
      });

      const twitterCards: Record<string, string> = {};
      document.querySelectorAll('meta[name^="twitter:"]').forEach((meta) => {
        const name = meta.getAttribute('name')?.replace('twitter:', '');
        const content = meta.getAttribute('content');
        if (name && content) twitterCards[name] = content;
      });

      return {
        title: document.title || undefined,
        description: getMetaContent('description'),
        keywords: getMetaContent('keywords'),
        author: getMetaContent('author'),
        ogTags: Object.keys(ogTags).length > 0 ? ogTags : undefined,
        twitterCards: Object.keys(twitterCards).length > 0 ? twitterCards : undefined,
        robots: getMetaContent('robots'),
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || undefined,
        viewport: getMetaContent('viewport'),
        charset: document.characterSet || undefined,
      };
    });
  }

  private async extractPerformanceMetrics(): Promise<PerformanceMetrics> {
    if (!this.page) throw new Error('Page not initialized');

    return await this.page.evaluate(() => {
      const timing = (performance as any).timing;
      const paint = (performance as any).getEntriesByType('paint');

      const getFCP = (): number | undefined => {
        const fcp = paint.find((entry: any) => entry.name === 'first-contentful-paint');
        return fcp ? fcp.startTime : undefined;
      };

      const getLCP = (): number | undefined => {
        const entries = (performance as any).getEntriesByType('largest-contentful-paint');
        return entries.length > 0 ? entries[entries.length - 1].startTime : undefined;
      };

      return {
        domContentLoaded: timing ? timing.domContentLoadedEventEnd - timing.navigationStart : 0,
        loadComplete: timing ? timing.loadEventEnd - timing.navigationStart : 0,
        firstContentfulPaint: getFCP(),
        largestContentfulPaint: getLCP(),
        cumulativeLayoutShift: 0,
      };
    });
  }

  private getResourceType(url: string, contentType: string): ResourceData['type'] {
    if (contentType.includes('javascript') || url.endsWith('.js')) return 'script';
    if (contentType.includes('css') || url.endsWith('.css')) return 'style';
    if (contentType.includes('image') || /\.(jpg|jpeg|png|gif|svg|webp|ico)/.test(url)) return 'image';
    if (contentType.includes('font') || /\.(woff|woff2|ttf|otf|eot)/.test(url)) return 'font';
    if (contentType.includes('html') || url.endsWith('.html') || url.endsWith('.htm')) return 'document';
    return 'other';
  }

  getVisitedUrls(): string[] {
    return Array.from(this.visitedUrls);
  }
}

export const scanner = new Scanner();
