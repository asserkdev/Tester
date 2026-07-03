import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class RobotsTxtAnalyzer extends BaseAnalyzer {
  readonly id = 'robots-txt-analyzer';
  readonly name = 'Robots.txt Analyzer';
  readonly category = AnalyzerCategory.SEO;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Validates robots.txt file for SEO and crawlability issues';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { url } = context.page;

    let robotsUrl = '';
    try {
      const parsed = new URL(url);
      robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
    } catch {
      return results;
    }

    // Check if robots.txt resource was loaded
    const robotsResource = context.page.resources.find(r =>
      r.url.includes('/robots.txt')
    );

    if (!robotsResource || robotsResource.status === 404) {
      results.push(this.createResult(context, {
        title: 'robots.txt File Not Found',
        description: 'No robots.txt file found at the standard location.',
        severity: Severity.MEDIUM,
        location: { url: robotsUrl },
        whyItMatters: 'Without robots.txt, search engines have no guidance on which pages to crawl. Important pages may be missed, or sensitive admin areas may be indexed.',
        possibleCause: 'robots.txt not created, or not served from the root of the domain.',
        recommendedFix: 'Create a robots.txt file at the root of your domain with crawl directives and a Sitemap reference.',
        estimatedImpact: 'Medium - Search engines have no crawl guidance',
        confidenceScore: 0.9,
      }));
    }

    // Analyze robots.txt content if available via page HTML inspection
    // Look for meta robots tags as fallback
    const { html } = context.page;
    const metaRobotsMatch = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i);
    if (metaRobotsMatch) {
      const content = metaRobotsMatch[1]?.toLowerCase() ?? '';
      if (content.includes('noindex')) {
        results.push(this.createResult(context, {
          title: 'Page Set to noindex',
          description: 'This page has a meta robots tag with "noindex", preventing it from appearing in search results.',
          severity: Severity.HIGH,
          location: { url },
          evidence: `<meta name="robots" content="${metaRobotsMatch[1]}">`,
          whyItMatters: 'noindex completely removes this page from search engine results. If this is unintentional, the page will receive no organic traffic.',
          possibleCause: 'Tag added during development to prevent indexing and not removed before launch.',
          recommendedFix: 'Remove "noindex" from the meta robots tag if this page should appear in search results.',
          estimatedImpact: 'High - Page excluded from all search results',
          confidenceScore: 0.95,
        }));
      }
      if (content.includes('nofollow')) {
        results.push(this.createResult(context, {
          title: 'Page Links Set to nofollow',
          description: 'Meta robots "nofollow" prevents search engines from following any links on this page.',
          severity: Severity.LOW,
          location: { url },
          evidence: `<meta name="robots" content="${metaRobotsMatch[1]}">`,
          whyItMatters: 'nofollow on the page level prevents link equity from flowing through any links on this page, which may be unintentional.',
          possibleCause: 'Broadly applied robots tag.',
          recommendedFix: 'Use nofollow only on specific links that should not pass equity, not at the page level unless intentional.',
          estimatedImpact: 'Low - Link equity not passed from this page',
          confidenceScore: 0.9,
        }));
      }
    }

    // Check for X-Robots-Tag in response headers
    context.page.resources.forEach(r => {
      const headers = (r as any).headers || {};
      const xRobots = headers['x-robots-tag'];
      if (xRobots && xRobots.includes('noindex')) {
        results.push(this.createResult(context, {
          title: 'X-Robots-Tag: noindex Found in Response Header',
          description: `Resource "${r.url}" returns X-Robots-Tag: ${xRobots} header, excluding it from indexing.`,
          severity: Severity.MEDIUM,
          location: { url: r.url },
          evidence: `X-Robots-Tag: ${xRobots}`,
          whyItMatters: 'X-Robots-Tag in headers can exclude pages or resources from search engine indexing.',
          possibleCause: 'Server-level noindex directive.',
          recommendedFix: 'Verify this header is intentional. Remove if the page should be indexed.',
          estimatedImpact: 'Medium - Prevents indexing of this resource',
          confidenceScore: 0.9,
        }));
      }
    });

    return results;
  }
}
