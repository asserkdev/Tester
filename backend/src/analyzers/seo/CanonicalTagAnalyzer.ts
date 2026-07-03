import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class CanonicalTagAnalyzer extends BaseAnalyzer {
  readonly id = 'canonical-tag-analyzer';
  readonly name = 'Canonical Tag Analyzer';
  readonly category = AnalyzerCategory.SEO;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Validates canonical tags for duplicate content prevention';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    const canonicalMatches = [...html.matchAll(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/gi)];
    const reverseMatches = [...html.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/gi)];
    const allCanonicals = [...canonicalMatches.map(m => m[1] ?? ''), ...reverseMatches.map(m => m[1] ?? '')];

    if (allCanonicals.length === 0) {
      results.push(this.createResult(context, {
        title: 'Missing Canonical Tag',
        description: 'Page does not have a canonical link element.',
        severity: Severity.MEDIUM,
        location: { url },
        whyItMatters: 'Without a canonical tag, search engines may treat URLs with different query parameters (e.g., ?ref=social, ?utm_source=email) as duplicate pages, splitting link equity.',
        possibleCause: 'Canonical tag not implemented.',
        recommendedFix: 'Add <link rel="canonical" href="https://yourdomain.com/this-page"> in the <head>. Ensure it points to the preferred URL.',
        estimatedImpact: 'Medium - Risk of duplicate content issues',
        confidenceScore: 0.85,
      }));
    } else if (allCanonicals.length > 1) {
      results.push(this.createResult(context, {
        title: `Multiple Canonical Tags Found (${allCanonicals.length})`,
        description: `Page has ${allCanonicals.length} canonical link elements. Only one is allowed.`,
        severity: Severity.HIGH,
        location: { url },
        evidence: allCanonicals.join('\n'),
        whyItMatters: 'Multiple canonical tags cause search engines to ignore all canonical signals, as they cannot determine which is authoritative. This leads to duplicate content issues.',
        possibleCause: 'Canonical tags added by multiple plugins/templates.',
        recommendedFix: 'Keep only one canonical tag per page. Remove all duplicates and ensure only the correct URL remains.',
        estimatedImpact: 'High - Canonical signal ignored by search engines',
        confidenceScore: 0.95,
      }));
    } else {
      const canonicalUrl = allCanonicals[0] ?? '';
      // Check if canonical points to a different domain
      try {
        const canonicalParsed = new URL(canonicalUrl.startsWith('http') ? canonicalUrl : `https://${canonicalUrl}`);
        const pageParsed = new URL(url);
        if (canonicalParsed.hostname !== pageParsed.hostname) {
          results.push(this.createResult(context, {
            title: 'Canonical Tag Points to Different Domain',
            description: `Canonical points to "${canonicalParsed.hostname}" but page is on "${pageParsed.hostname}".`,
            severity: Severity.HIGH,
            location: { url },
            evidence: `Canonical: ${canonicalUrl}\nPage URL: ${url}`,
            whyItMatters: 'Cross-domain canonicals tell search engines the content originated on the other domain, transferring all search credit away from this page.',
            possibleCause: 'Canonical tag pointing to wrong domain, possibly from copy-paste error or multi-domain setup.',
            recommendedFix: 'Verify the canonical URL is intentional. If not, update it to point to this domain.',
            estimatedImpact: 'High - SEO value transferred away from this page',
            confidenceScore: 0.9,
          }));
        }
      } catch { /* invalid URL */ }
    }

    // Check for canonical in body (invalid placement)
    const bodyIndex = html.toLowerCase().indexOf('<body');
    if (bodyIndex !== -1) {
      const bodyContent = html.slice(bodyIndex);
      if (/<link[^>]+rel=["']canonical["']/i.test(bodyContent)) {
        results.push(this.createResult(context, {
          title: 'Canonical Tag in Body (Invalid Placement)',
          description: 'Canonical link element found in the page body instead of the <head>.',
          severity: Severity.HIGH,
          location: { url },
          whyItMatters: 'Canonical tags must be in the <head>. Tags in the body may be ignored by search engines.',
          possibleCause: 'Template error placing canonical tag in wrong location.',
          recommendedFix: 'Move the canonical tag inside the <head> element.',
          estimatedImpact: 'High - Canonical may be ignored',
          confidenceScore: 0.9,
        }));
      }
    }

    return results;
  }
}
