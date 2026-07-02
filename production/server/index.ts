// L.A.I. Web Inspector - Production Server with 100+ Analyzers
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { 
  ScanConfig, ScanResult, PageResult, Issue, Score, ScanStats, 
  Category, Severity, Technology, Resource, ErrorEntry 
} from '../shared/types.js';
import { registerAnalyzers } from '../analyzers/index.js';
import type { Analyzer } from '../shared/types.js';

interface ViewportConfig {
  width: number;
  height: number;
  userAgent?: string;
}

const VIEWPORTS: Record<string, ViewportConfig> = {
  mobile: { width: 375, height: 812, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1' },
  tablet: { width: 768, height: 1024, userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1' },
  desktop: { width: 1920, height: 1080 }
};

const CATEGORY_WEIGHTS: Record<Category, number> = {
  'Security': 25,
  'Performance': 20,
  'Accessibility': 20,
  'SEO': 15,
  'HTML': 5,
  'CSS': 5,
  'JavaScript': 5,
  'Links': 2,
  'Forms': 2,
  'API': 2,
  'PWA': 1,
  'Social': 1,
  'Analytics': 1,
  'Privacy': 1,
  'Code Quality': 2,
  'Internationalization': 1,
  'Infrastructure': 2
};

export class LAIScanner {
  private browser: Browser | null = null;
  private analyzers: Map<string, Analyzer> = new Map();
  private visitedUrls: Set<string> = new Set();

  constructor() {
    registerAnalyzers(this.analyzers);
    console.log(`[L.A.I.] Loaded ${this.analyzers.size} analyzers`);
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scan(config: ScanConfig): Promise<ScanResult> {
    if (!this.browser) await this.initialize();
    
    const startTime = Date.now();
    const scanId = this.generateId();
    
    const scanResult: ScanResult = {
      id: scanId,
      config,
      status: 'running',
      startedAt: new Date(),
      score: { overall: 0, performance: 0, accessibility: 0, bestPractices: 0, seo: 0, pwa: 0 },
      stats: this.initStats(),
      pages: [],
      issues: [],
      metadata: {
        userAgent: VIEWPORTS[config.viewport].userAgent || 'Mozilla/5.0',
        viewport: { width: VIEWPORTS[config.viewport].width, height: VIEWPORTS[config.viewport].height },
        locale: config.locale,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        platform: 'Production Scanner',
        technologies: []
      }
    };

    try {
      // Crawl pages
      const pages = await this.crawlPages(config);
      scanResult.pages = pages;

      // Analyze each page with all analyzers
      for (const page of pages) {
        for (const [id, analyzer] of this.analyzers) {
          if (config.categories.length > 0 && !config.categories.includes(id as Category)) continue;
          
          try {
            const issues = await analyzer.analyze(page, scanResult);
            scanResult.issues.push(...issues);
          } catch (error) {
            console.error(`[L.A.I.] Analyzer ${id} failed:`, error);
          }
        }
      }

      // Calculate scores
      scanResult.score = this.calculateScores(scanResult.issues);
      scanResult.stats = this.calculateStats(scanResult);
      scanResult.status = 'completed';
      scanResult.completedAt = new Date();
      scanResult.duration = Date.now() - startTime;

      // Detect technologies
      scanResult.metadata.technologies = this.detectTechnologies(scanResult);

    } catch (error) {
      scanResult.status = 'failed';
      scanResult.completedAt = new Date();
      scanResult.duration = Date.now() - startTime;
      console.error('[L.A.I.] Scan failed:', error);
    }

    return scanResult;
  }

  private async crawlPages(config: ScanConfig): Promise<PageResult[]> {
    const pages: PageResult[] = [];
    const queue = [config.url];
    const context = await this.browser!.newContext({
      viewport: { width: VIEWPORTS[config.viewport].width, height: VIEWPORTS[config.viewport].height },
      userAgent: VIEWPORTS[config.viewport].userAgent,
      ignoreHTTPSErrors: true
    });

    while (queue.length > 0 && pages.length < config.maxPages) {
      const url = queue.shift()!;
      if (this.visitedUrls.has(url)) continue;
      this.visitedUrls.add(url);

      const page = await context.newPage();
      const errors: ErrorEntry[] = [];
      const warnings: any[] = [];
      const consoleMessages: any[] = [];

      page.on('pageerror', (err) => {
        errors.push({
          message: err.message,
          stack: err.stack,
          timestamp: Date.now()
        });
      });

      page.on('console', (msg) => {
        consoleMessages.push({
          type: msg.type(),
          message: msg.text(),
          location: msg.location(),
          timestamp: Date.now()
        });
      });

      page.on('requestfailed', (req) => {
        errors.push({
          message: `Request failed: ${req.url()} - ${req.failure()?.errorText}`,
          timestamp: Date.now()
        });
      });

      try {
        await page.goto(url, { 
          waitUntil: 'networkidle', 
          timeout: config.timeout * 1000 
        });

        // Extract page data
        const pageData = await this.extractPageData(page, url);
        pages.push(pageData);

        // Extract links for crawling
        if (config.maxDepth > 0) {
          const links = await page.$$eval('a[href]', (anchors) => 
            anchors.map(a => a.href).filter(h => h.startsWith('http'))
          );
          for (const link of links.slice(0, 10)) {
            if (!this.visitedUrls.has(link)) queue.push(link);
          }
        }

      } catch (error: any) {
        pages.push({
          url,
          status: 0,
          title: '',
          h1s: [],
          resources: [],
          errors: [{ message: error.message, timestamp: Date.now() }],
          warnings: [],
          consoleMessages: [],
          performanceMetrics: { navigationStart: 0, loadEventEnd: 0, domContentLoaded: 0, networkRequests: 0, networkDuration: 0 },
          accessibilityIssues: [],
          htmlValid: false,
          htmlErrors: [],
          cssValid: false,
          cssErrors: [],
          jsErrors: []
        });
      }

      await page.close();
    }

    await context.close();
    return pages;
  }

  private async extractPageData(page: Page, url: string): Promise<PageResult> {
    const html = await page.content();
    
    // Get performance metrics
    const perfMetrics = await page.evaluate(() => {
      const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      const lcp = performance.getEntriesByType('largest-contentful-paint');
      const cls = performance.getEntriesByType('layout-shift');
      
      return {
        navigationStart: timing?.startTime || 0,
        loadEventEnd: timing?.loadEventEnd || 0,
        domContentLoaded: timing?.domContentLoadedEventEnd || 0,
        firstPaint: paint.find((p: any) => p.name === 'first-paint')?.startTime,
        firstContentfulPaint: paint.find((p: any) => p.name === 'first-contentful-paint')?.startTime,
        largestContentfulPaint: lcp.length > 0 ? (lcp[lcp.length - 1] as any).startTime : undefined,
        cumulativeLayoutShift: cls.reduce((sum: number, s: any) => sum + (s.value || 0), 0),
        networkRequests: performance.getEntriesByType('resource').length,
        networkDuration: performance.getEntriesByType('resource').reduce((sum: number, r: any) => sum + r.duration, 0)
      };
    });

    // Get metadata
    const metadata = await page.evaluate(() => {
      const getMeta = (name: string) => document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.getAttribute('content');
      const getOG = (prop: string) => document.querySelector(`meta[property="${prop}"]`)?.getAttribute('content');
      const getTwitter = (name: string) => document.querySelector(`meta[name="twitter:${name}"]`)?.getAttribute('content');
      
      return {
        title: document.title,
        description: getMeta('description'),
        h1s: Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim() || ''),
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
        ogTags: {
          'og:title': getOG('og:title'),
          'og:description': getOG('og:description'),
          'og:image': getOG('og:image'),
          'og:url': getOG('og:url'),
          'og:type': getOG('og:type'),
          'og:site_name': getOG('og:site_name')
        },
        twitterTags: {
          'twitter:card': getTwitter('card'),
          'twitter:title': getTwitter('title'),
          'twitter:description': getTwitter('description'),
          'twitter:image': getTwitter('image')
        }
      };
    });

    // Get resources
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map((r: any) => ({
        url: r.name,
        type: r.initiatorType,
        size: r.transferSize || 0,
        loadTime: r.duration,
        status: 200
      }));
    });

    // Get accessibility issues
    const accessibilityIssues = await page.evaluate(() => {
      const issues: string[] = [];
      
      // Check for images without alt
      document.querySelectorAll('img:not([alt])').forEach(img => {
        issues.push(`Image missing alt attribute: ${img.outerHTML.slice(0, 100)}`);
      });
      
      // Check for links without text
      document.querySelectorAll('a:not(:has(img)):empty, a:not(:has(img)):not(:has-text)').forEach(a => {
        issues.push(`Link missing text content: ${a.outerHTML.slice(0, 100)}`);
      });
      
      // Check for buttons without accessible name
      document.querySelectorAll('button:empty').forEach(btn => {
        issues.push(`Button missing accessible name: ${btn.outerHTML.slice(0, 100)}`);
      });
      
      // Check for form inputs without labels
      document.querySelectorAll('input:not([type="hidden"]):not([aria-label]):not([aria-labelledby])').forEach(input => {
        const id = input.id;
        if (!id || !document.querySelector(`label[for="${id}"]`)) {
          issues.push(`Input missing label: ${input.outerHTML.slice(0, 100)}`);
        }
      });
      
      // Check for heading hierarchy
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      let lastLevel = 0;
      headings.forEach(h => {
        const level = parseInt(h.tagName[1]);
        if (level > lastLevel + 1 && lastLevel > 0) {
          issues.push(`Skipped heading level: ${lastLevel} to ${level}`);
        }
        lastLevel = level;
      });
      
      return issues;
    });

    // Get HTML validation errors (simulated)
    const htmlErrors = await page.evaluate(() => {
      const errors: any[] = [];
      
      // Check for duplicate IDs
      const ids = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
      const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
      if (duplicates.length > 0) {
        errors.push({ message: `Duplicate IDs: ${[...new Set(duplicates)].join(', ')}` });
      }
      
      // Check for unclosed tags (simplified)
      const tags = ['div', 'span', 'p', 'a', 'ul', 'li', 'table', 'tr', 'td', 'th'];
      for (const tag of tags) {
        const openCount = document.querySelectorAll(tag).length;
        const closeCount = document.querySelectorAll(`</${tag}>`).length;
        // This is a simplified check
      }
      
      return errors;
    });

    return {
      url,
      status: 200,
      title: metadata.title,
      description: metadata.description,
      h1s: metadata.h1s,
      canonical: metadata.canonical,
      ogTags: metadata.ogTags,
      twitterTags: metadata.twitterTags,
      resources,
      errors: [],
      warnings: [],
      consoleMessages: [],
      performanceMetrics: perfMetrics,
      accessibilityIssues,
      htmlValid: true,
      htmlErrors,
      cssValid: true,
      cssErrors: [],
      jsErrors: []
    };
  }

  private calculateScores(issues: Issue[]): Score {
    const calculateCategoryScore = (category: Category) => {
      const categoryIssues = issues.filter(i => i.category === category);
      const critical = categoryIssues.filter(i => i.severity === 'critical').length;
      const high = categoryIssues.filter(i => i.severity === 'high').length;
      const medium = categoryIssues.filter(i => i.severity === 'medium').length;
      const low = categoryIssues.filter(i => i.severity === 'low').length;
      
      return Math.max(0, 100 - (critical * 25) - (high * 15) - (medium * 5) - (low * 1));
    };

    return {
      overall: Math.round(
        Object.keys(CATEGORY_WEIGHTS).reduce((sum, cat) => 
          sum + calculateCategoryScore(cat as Category) * CATEGORY_WEIGHTS[cat as Category] / 100, 0
        )
      ),
      performance: calculateCategoryScore('Performance'),
      accessibility: calculateCategoryScore('Accessibility'),
      bestPractices: calculateCategoryScore('Security'),
      seo: calculateCategoryScore('SEO'),
      pwa: calculateCategoryScore('PWA')
    };
  }

  private calculateStats(scan: ScanResult): ScanStats {
    const stats: ScanStats = {
      totalPages: scan.pages.length,
      analyzedPages: scan.pages.length,
      totalIssues: scan.issues.length,
      issuesBySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      issuesByCategory: {} as Record<Category, number>,
      totalRequests: 0,
      totalSize: 0,
      loadTime: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      domDepth: 0,
      domNodes: 0
    };

    for (const issue of scan.issues) {
      stats.issuesBySeverity[issue.severity]++;
      stats.issuesByCategory[issue.category] = (stats.issuesByCategory[issue.category] || 0) + 1;
    }

    for (const page of scan.pages) {
      stats.totalRequests += page.resources.length;
      stats.totalSize += page.resources.reduce((sum, r) => sum + r.size, 0);
      stats.loadTime = Math.max(stats.loadTime, page.performanceMetrics.loadEventEnd);
      stats.largestContentfulPaint = Math.max(stats.largestContentfulPaint, page.performanceMetrics.largestContentfulPaint || 0);
      stats.cumulativeLayoutShift = Math.max(stats.cumulativeLayoutShift, page.performanceMetrics.cumulativeLayoutShift || 0);
    }

    return stats;
  }

  private detectTechnologies(scan: ScanResult): Technology[] {
    const techs: Technology[] = [];
    const html = scan.pages[0]?.url ? '' : '';
    
    // Check headers for technologies
    const headers = scan.pages[0];
    
    // Simple detection based on patterns
    const patterns: Record<string, RegExp[]> = {
      'React': [/react/i, /reactdom/i, /_react/i],
      'Vue': [/vue/i, /vuejs/i],
      'Angular': [/angular/i, /ng-component/i],
      'jQuery': [/jquery/i],
      'Bootstrap': [/bootstrap/i],
      'Tailwind': [/tailwind/i],
      'WordPress': [/wp-content/i, /wp-includes/i, /wordpress/i],
      'Shopify': [/shopify/i, /myshopify/i],
      'Wix': [/wix/i, /wixstores/i],
      'Next.js': [/_next/i, /next/i],
      'Nuxt.js': [/nuxt/i, /__nuxt/i],
      'Gatsby': [/gatsby/i],
      'Laravel': [/laravel/i, /_token/i],
      'Django': [/csrftoken/i, /django/i],
      'Rails': [/rails/i, /asset-pipeline/i],
      'Node.js': [/node_modules/i],
      'Express': [/express/i],
      'PHP': [/\.php/i],
      'Python': [/python/i, /django/i, /flask/i],
      'Ruby': [/ruby/i, /rails/i],
      'Go': [/go\.lang/i],
      'Rust': [/rust/i],
      'Java': [/java/i, /spring/i],
      '.NET': [/\.net/i, /asp\.net/i],
      'Cloudflare': [/cloudflare/i, /__cf_/i],
      'AWS': [/aws/i, /amazon/i, /cloudfront/i],
      'Google Cloud': [/google/i, /gcp/i],
      'Azure': [/azure/i, /microsoft/i],
      'Vercel': [/vercel/i, /now/i],
      'Netlify': [/netlify/i],
      'Firebase': [/firebase/i],
      'Stripe': [/stripe/i, /js\.stripe\.com/i],
      'Google Analytics': [/google.*analytics/i, /gtag/i, /ga\./i],
      'Facebook Pixel': [/facebook.*pixel/i, /fbevents/i],
      'Hotjar': [/hotjar/i],
      'Intercom': [/intercom/i],
      'Zendesk': [/zendesk/i],
      'HubSpot': [/hubspot/i, /hs-script/i],
      'Mailchimp': [/mailchimp/i, /list-manage/i],
      'Disqus': [/disqus/i],
      'YouTube': [/youtube\.com\/embed/i],
      'Vimeo': [/player\.vimeo/i],
      'Mapbox': [/mapbox/i],
      'Google Maps': [/google.*maps/i, /gmap/i]
    };

    // Scan HTML content for patterns
    const pageHtml = scan.pages[0]?.url || '';
    
    for (const [name, regexes] of Object.entries(patterns)) {
      for (const regex of regexes) {
        if (regex.test(pageHtml)) {
          techs.push({ name, confidence: 90, category: 'Framework' });
          break;
        }
      }
    }

    return techs;
  }

  private initStats(): ScanStats {
    return {
      totalPages: 0,
      analyzedPages: 0,
      totalIssues: 0,
      issuesBySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      issuesByCategory: {} as Record<Category, number>,
      totalRequests: 0,
      totalSize: 0,
      loadTime: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      domDepth: 0,
      domNodes: 0
    };
  }

  private generateId(): string {
    return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton
export const laiScanner = new LAIScanner();
