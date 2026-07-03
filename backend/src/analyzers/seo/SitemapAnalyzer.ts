import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class SitemapAnalyzer extends BaseAnalyzer {
  readonly id = 'sitemap-analyzer';
  readonly name = 'Sitemap Analyzer';
  readonly category = AnalyzerCategory.SEO;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Checks for XML sitemap presence and validates sitemap structure';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { url, resources } = context.page;

    let sitemapUrl = '';
    try {
      const parsed = new URL(url);
      sitemapUrl = `${parsed.protocol}//${parsed.host}/sitemap.xml`;
    } catch {
      return results;
    }

    // Check if sitemap resource was fetched
    const sitemapResource = resources.find(r =>
      r.url.includes('sitemap') && (r.url.endsWith('.xml') || r.url.includes('sitemap'))
    );

    if (!sitemapResource) {
      results.push(this.createResult(context, {
        title: 'XML Sitemap Not Found',
        description: 'No sitemap.xml found at standard location.',
        severity: Severity.MEDIUM,
        location: { url: sitemapUrl },
        whyItMatters: 'Sitemaps help search engines discover and index all pages on your site. Without a sitemap, search engines may miss important pages, especially newly added ones.',
        possibleCause: 'Sitemap not created or not located at /sitemap.xml.',
        recommendedFix: 'Create an XML sitemap at /sitemap.xml. Add a reference to it in robots.txt: "Sitemap: https://yourdomain.com/sitemap.xml". Tools like Yoast SEO (WordPress) or next-sitemap (Next.js) can generate it automatically.',
        estimatedImpact: 'Medium - Pages may not be discovered by search engines',
        confidenceScore: 0.75,
      }));
    } else if (sitemapResource.status === 404) {
      results.push(this.createResult(context, {
        title: 'Sitemap Returns 404',
        description: 'Sitemap URL returns a 404 Not Found response.',
        severity: Severity.HIGH,
        location: { url: sitemapUrl },
        evidence: 'HTTP 404',
        whyItMatters: 'A broken sitemap reference in robots.txt causes Google Search Console errors and prevents sitemap-guided crawling.',
        possibleCause: 'Sitemap not deployed, or path is wrong.',
        recommendedFix: 'Ensure sitemap.xml is deployed and accessible. Update robots.txt to point to the correct URL.',
        estimatedImpact: 'High - Crawling guidance broken',
        confidenceScore: 0.9,
      }));
    }

    return results;
  }
}
