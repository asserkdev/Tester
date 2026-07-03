import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class RedirectAnalyzer extends BaseAnalyzer {
  readonly id = 'redirect-analyzer';
  readonly name = 'Redirect Chain Analyzer';
  readonly category = AnalyzerCategory.NETWORK;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Detects redirect chains, loops, and HTTP-to-HTTPS redirect configuration';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { url, resources } = context.page;

    // Find redirected resources
    const redirectedResources = resources.filter(r => r.status >= 300 && r.status < 400);

    // Check for redirect chains (multiple redirects for same destination)
    const resourcesByBase: Record<string, typeof resources> = {};
    redirectedResources.forEach(r => {
      const base = r.url.split('?')[0] ?? r.url;
      resourcesByBase[base] = resourcesByBase[base] || [];
      resourcesByBase[base].push(r);
    });

    const chains = Object.entries(resourcesByBase).filter(([, resources]) => resources.length > 1);
    if (chains.length > 0) {
      results.push(this.createResult(context, {
        title: `${chains.length} Redirect Chain(s) Detected`,
        description: `Found ${chains.length} resource(s) that redirect more than once (redirect chain).`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: chains.slice(0, 3).map(([base]) => base).join('\n'),
        whyItMatters: 'Each redirect in a chain adds 100-300ms of round-trip time. A chain of 3 redirects adds up to 1 second of delay before the resource loads.',
        possibleCause: 'Multiple redirects accumulated over time (http→https + www→non-www + old URL→new URL).',
        recommendedFix: 'Consolidate redirect chains to a single redirect. Update internal links to point directly to final URLs.',
        estimatedImpact: 'Medium - Each extra redirect adds 100-300ms',
        confidenceScore: 0.8,
      }));
    }

    // Check for redirect on the main page URL
    if (redirectedResources.some(r => r.url === url)) {
      results.push(this.createResult(context, {
        title: 'Main Page URL Redirects',
        description: 'The analyzed URL itself is a redirect, not the final destination.',
        severity: Severity.LOW,
        location: { url },
        evidence: `${url} → redirect`,
        whyItMatters: 'Redirecting the main URL adds latency for all visitors and dilutes SEO signals — Google doesn\'t always pass full link equity through redirects.',
        possibleCause: 'Old URL, www/non-www consolidation, or HTTP→HTTPS not handled at DNS level.',
        recommendedFix: 'Update all internal links and canonical tags to point to the final URL. Use 301 (permanent) redirects for SEO preservation.',
        estimatedImpact: 'Low - Extra round-trip for all visitors',
        confidenceScore: 0.85,
      }));
    }

    // Check for JavaScript-based redirects (bad for SEO)
    const jsRedirectPatterns = [
      /window\.location(?:\.href)?\s*=\s*["']/g,
      /window\.location\.replace\s*\(/g,
      /location\.assign\s*\(/g,
    ];

    const { html } = context.page;
    for (const pattern of jsRedirectPatterns) {
      if (pattern.test(html)) {
        results.push(this.createResult(context, {
          title: 'JavaScript-Based Redirect Detected',
          description: 'Page uses JavaScript (window.location) for redirection.',
          severity: Severity.MEDIUM,
          location: { url },
          evidence: 'window.location redirect detected',
          whyItMatters: 'JavaScript redirects are not followed by search engines reliably. They delay the redirect as JavaScript must download, parse, and execute first.',
          possibleCause: 'Redirect implemented in frontend JavaScript instead of server-side.',
          recommendedFix: 'Replace JavaScript redirects with server-side HTTP 301/302 redirects configured in your web server or application.',
          estimatedImpact: 'Medium - Slower redirect, SEO value not passed',
          confidenceScore: 0.7,
        }));
        break;
      }
    }

    return results;
  }
}
