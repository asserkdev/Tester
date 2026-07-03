import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class CompressionAnalyzer extends BaseAnalyzer {
  readonly id = 'compression-analyzer';
  readonly name = 'HTTP Compression Analyzer';
  readonly category = AnalyzerCategory.PERFORMANCE;
  readonly defaultSeverity = Severity.HIGH;
  readonly description = 'Checks if text resources are served with gzip/Brotli compression';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { url, resources } = context.page;

    const textResourceTypes = ['script', 'style', 'document', 'xhr', 'fetch'];
    const textResources = resources.filter(r =>
      textResourceTypes.includes(r.type) && r.size > 1000
    );

    const uncompressedResources: Array<{ url: string; size: number }> = [];
    const brotliResources: string[] = [];

    for (const resource of textResources) {
      const headers = (resource as any).headers || {};
      const encoding = headers['content-encoding'] ?? headers['Content-Encoding'] ?? '';

      if (!encoding) {
        uncompressedResources.push({ url: resource.url, size: resource.size });
      } else if (encoding.includes('br')) {
        brotliResources.push(resource.url);
      }
    }

    if (uncompressedResources.length > 0) {
      const totalUncompressedSize = uncompressedResources.reduce((sum, r) => sum + r.size, 0);
      const estimatedSavings = Math.round(totalUncompressedSize * 0.7 / 1024);

      results.push(this.createResult(context, {
        title: `${uncompressedResources.length} Text Resource(s) Served Without Compression`,
        description: `${uncompressedResources.length} text resource(s) have no gzip/Brotli compression. ~${estimatedSavings}KB potential savings.`,
        severity: Severity.HIGH,
        location: { url },
        evidence: uncompressedResources.slice(0, 5).map(r => `${r.url} (${Math.round(r.size / 1024)}KB)`).join('\n'),
        whyItMatters: 'Uncompressed text resources are typically 60-80% larger than their compressed versions. Enabling compression costs nothing server-side but dramatically reduces transfer times.',
        possibleCause: 'Web server compression not configured (gzip/deflate/brotli module not enabled).',
        recommendedFix: 'Enable gzip/Brotli compression on your web server:\n• Nginx: add "gzip on;" to nginx.conf\n• Apache: use mod_deflate\n• Node.js: use the compression middleware\n• Cloudflare: enable compression in settings',
        estimatedImpact: `High - ~${estimatedSavings}KB potential savings (60-80% reduction)`,
        confidenceScore: 0.85,
      }));
    }

    if (uncompressedResources.length === 0 && textResources.length > 0 && brotliResources.length === 0) {
      // gzip is used but not Brotli
      results.push(this.createResult(context, {
        title: 'Resources Not Using Brotli Compression',
        description: 'Resources use gzip but not Brotli compression. Brotli provides 15-25% better compression.',
        severity: Severity.LOW,
        location: { url },
        evidence: 'gzip detected, Brotli not detected',
        whyItMatters: 'Brotli (developed by Google) provides 15-25% better compression ratios than gzip for text resources. All modern browsers support it.',
        possibleCause: 'Server configured for gzip only, Brotli module not installed/enabled.',
        recommendedFix: 'Enable Brotli compression:\n• Nginx: use ngx_brotli module\n• Cloudflare: automatically uses Brotli for supported browsers\n• Vercel/Netlify: Brotli enabled by default',
        estimatedImpact: 'Low - Additional 15-25% compression savings',
        confidenceScore: 0.75,
      }));
    }

    return results;
  }
}
