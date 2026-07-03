import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class MixedContentAnalyzer extends BaseAnalyzer {
  readonly id = 'mixed-content-analyzer';
  readonly name = 'Mixed Content Deep Analyzer';
  readonly category = AnalyzerCategory.NETWORK;
  readonly defaultSeverity = Severity.HIGH;
  readonly description = 'Performs deep analysis of mixed HTTP/HTTPS content in HTML source';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    if (!url.startsWith('https://')) return results;

    // Check for HTTP src in various elements
    const checks = [
      { pattern: /<script[^>]+src=["'](http:\/\/[^"']+)["']/gi, type: 'Script', severity: Severity.CRITICAL },
      { pattern: /<link[^>]+href=["'](http:\/\/[^"']+\.css[^"']*)["']/gi, type: 'Stylesheet', severity: Severity.HIGH },
      { pattern: /<img[^>]+src=["'](http:\/\/[^"']+)["']/gi, type: 'Image', severity: Severity.MEDIUM },
      { pattern: /<iframe[^>]+src=["'](http:\/\/[^"']+)["']/gi, type: 'IFrame', severity: Severity.HIGH },
      { pattern: /<audio[^>]+src=["'](http:\/\/[^"']+)["']/gi, type: 'Audio', severity: Severity.MEDIUM },
      { pattern: /<video[^>]+src=["'](http:\/\/[^"']+)["']/gi, type: 'Video', severity: Severity.MEDIUM },
      { pattern: /<source[^>]+src=["'](http:\/\/[^"']+)["']/gi, type: 'Source', severity: Severity.MEDIUM },
      { pattern: /url\(['"]?(http:\/\/[^'")\s]+)['"]?\)/gi, type: 'CSS URL', severity: Severity.MEDIUM },
    ];

    for (const check of checks) {
      const urls: string[] = [];
      let match;
      const pattern = new RegExp(check.pattern.source, check.pattern.flags);
      while ((match = pattern.exec(html)) !== null) {
        const foundUrl = match[1] ?? '';
        if (!foundUrl.includes('localhost') && !foundUrl.includes('127.0.0.1')) {
          urls.push(foundUrl);
        }
        if (urls.length >= 5) break;
      }

      if (urls.length > 0) {
        results.push(this.createResult(context, {
          title: `Mixed Content: ${urls.length} HTTP ${check.type}(s) in HTML`,
          description: `Found ${urls.length} ${check.type.toLowerCase()}(s) referenced with http:// in the page source.`,
          severity: check.severity,
          location: { url },
          evidence: urls.join('\n'),
          whyItMatters: `HTTP ${check.type.toLowerCase()}s on an HTTPS page ${check.severity === Severity.CRITICAL ? 'will be blocked by modern browsers' : 'degrade connection security'}. Users may see security warnings.`,
          possibleCause: 'Resource URLs hardcoded with http:// scheme in HTML templates.',
          recommendedFix: `Change all ${check.type.toLowerCase()} URLs to use https:// or relative URLs.`,
          estimatedImpact: check.severity === Severity.CRITICAL ? 'Critical - Resource blocked by browser' : 'High - Security warning shown',
          confidenceScore: 0.9,
          metadata: { cwe: ['CWE-319'] },
        }));
      }
    }

    return results;
  }
}
