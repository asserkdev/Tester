import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class CacheHeadersAnalyzer extends BaseAnalyzer {
  readonly id = 'cache-headers-analyzer';
  readonly name = 'Cache Headers Analyzer';
  readonly category = AnalyzerCategory.PERFORMANCE;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Validates HTTP caching headers for static assets and pages';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { url, resources } = context.page;

    const staticTypes = ['script', 'style', 'image', 'font'];
    const staticResources = resources.filter(r => staticTypes.includes(r.type));

    const noCacheAssets: string[] = [];
    const shortCacheAssets: string[] = [];
    const noEtagNoCacheControl: string[] = [];

    for (const resource of staticResources) {
      const headers = (resource as any).headers || {};
      const cacheControl = headers['cache-control'] ?? headers['Cache-Control'] ?? '';
      const expires = headers['expires'] ?? '';
      const etag = headers['etag'] ?? headers['ETag'] ?? '';
      const lastModified = headers['last-modified'] ?? '';

      if (!cacheControl && !expires) {
        noCacheAssets.push(resource.url);
      } else if (cacheControl) {
        if (cacheControl.includes('no-cache') || cacheControl.includes('no-store')) {
          noCacheAssets.push(resource.url);
        } else {
          const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
          if (maxAgeMatch) {
            const maxAge = parseInt(maxAgeMatch[1] ?? '0', 10);
            if (maxAge < 3600 && !etag && !lastModified) {
              shortCacheAssets.push(`${resource.url} (max-age=${maxAge}s)`);
            }
          }
        }
      }

      if (!etag && !lastModified && !cacheControl.includes('immutable')) {
        noEtagNoCacheControl.push(resource.url);
      }
    }

    if (noCacheAssets.length > 0) {
      results.push(this.createResult(context, {
        title: `${noCacheAssets.length} Static Asset(s) Not Cached`,
        description: `${noCacheAssets.length} static resource(s) (JS/CSS/images) have no caching headers. They are re-downloaded on every page load.`,
        severity: Severity.HIGH,
        location: { url },
        evidence: noCacheAssets.slice(0, 5).join('\n'),
        whyItMatters: 'Without caching, every page load downloads all assets from scratch. Repeat visitors experience the same full load time as first-time visitors, wasting bandwidth and slowing the site.',
        possibleCause: 'Web server not configured with caching headers, or cache-control: no-store set globally.',
        recommendedFix: 'Add long-duration cache headers (1 year) for fingerprinted assets: Cache-Control: public, max-age=31536000, immutable. Use content hashing in filenames for cache busting.',
        estimatedImpact: 'High - Repeat visitors load all assets fresh every time',
        confidenceScore: 0.85,
      }));
    }

    if (shortCacheAssets.length > 0) {
      results.push(this.createResult(context, {
        title: `${shortCacheAssets.length} Static Asset(s) with Short Cache Duration`,
        description: `${shortCacheAssets.length} asset(s) have cache duration under 1 hour without revalidation headers.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: shortCacheAssets.slice(0, 5).join('\n'),
        whyItMatters: 'Short cache duration means assets are re-downloaded frequently. Repeat visitors cannot benefit from browser caching.',
        possibleCause: 'Conservative caching policy without content fingerprinting.',
        recommendedFix: 'Use content hashing (e.g., main.a8f3c91b.js) and set max-age to 1 year. The hash change automatically busts the cache when files change.',
        estimatedImpact: 'Medium - Suboptimal repeat visit performance',
        confidenceScore: 0.8,
      }));
    }

    // Check for CDN usage
    const cdnDomains = ['cloudfront.net', 'cdn.', 'cdnjs.', 'jsdelivr.net', 'unpkg.com', 'fastly', 'akamai'];
    const cdnAssets = resources.filter(r => cdnDomains.some(cdn => r.url.includes(cdn)));
    const nonCdnLargeAssets = resources.filter(r =>
      !cdnDomains.some(cdn => r.url.includes(cdn)) &&
      r.size > 50000 &&
      staticTypes.includes(r.type)
    );

    if (nonCdnLargeAssets.length > 3 && cdnAssets.length === 0) {
      results.push(this.createResult(context, {
        title: 'Static Assets Not Served via CDN',
        description: `${nonCdnLargeAssets.length} large static assets are served from the origin server without a CDN.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: nonCdnLargeAssets.slice(0, 3).map(r => `${r.url} (${Math.round(r.size / 1024)}KB)`).join('\n'),
        whyItMatters: 'CDNs serve assets from edge nodes close to users, reducing latency. Without a CDN, all users download from a central server, increasing load times for geographically distant users.',
        possibleCause: 'CDN not configured for static assets.',
        recommendedFix: 'Use a CDN like Cloudflare, CloudFront, or Fastly to serve static assets. Point your asset URLs to the CDN origin.',
        estimatedImpact: 'Medium - Higher latency for distant users',
        confidenceScore: 0.75,
      }));
    }

    return results;
  }
}
