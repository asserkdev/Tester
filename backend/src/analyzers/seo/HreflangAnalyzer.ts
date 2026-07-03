import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class HreflangAnalyzer extends BaseAnalyzer {
  readonly id = 'hreflang-analyzer';
  readonly name = 'Hreflang & Internationalization Analyzer';
  readonly category = AnalyzerCategory.SEO;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Validates hreflang tags for international SEO and language targeting';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    const hreflangPattern = /<link[^>]+rel=["']alternate["'][^>]+hreflang=["']([^"']+)["'][^>]+href=["']([^"']+)["']/gi;
    const reversePattern = /<link[^>]+hreflang=["']([^"']+)["'][^>]+href=["']([^"']+)["'][^>]+rel=["']alternate["']/gi;

    const hreflangTags: Array<{ lang: string; href: string }> = [];
    let match;

    while ((match = hreflangPattern.exec(html)) !== null) {
      hreflangTags.push({ lang: match[1] ?? '', href: match[2] ?? '' });
    }
    while ((match = reversePattern.exec(html)) !== null) {
      if (!hreflangTags.some(t => t.lang === match[1] && t.href === match[2])) {
        hreflangTags.push({ lang: match[1] ?? '', href: match[2] ?? '' });
      }
    }

    if (hreflangTags.length === 0) return results; // Not a multilingual site

    // Check for x-default
    const hasXDefault = hreflangTags.some(t => t.lang === 'x-default');
    if (!hasXDefault) {
      results.push(this.createResult(context, {
        title: 'Hreflang Missing x-default Tag',
        description: 'Hreflang tags found but no x-default variant specified.',
        severity: Severity.MEDIUM,
        location: { url },
        evidence: `${hreflangTags.length} hreflang tags, no x-default`,
        whyItMatters: 'x-default indicates the fallback URL for users whose language doesn\'t match any hreflang tag. Without it, Google may not correctly handle unmatched users.',
        possibleCause: 'x-default not included in hreflang implementation.',
        recommendedFix: 'Add: <link rel="alternate" hreflang="x-default" href="https://example.com/">',
        estimatedImpact: 'Medium - Language targeting may not work for all users',
        confidenceScore: 0.85,
      }));
    }

    // Check for self-referencing hreflang
    const selfRef = hreflangTags.find(t => {
      try {
        return new URL(t.href).pathname === new URL(url).pathname;
      } catch { return false; }
    });

    if (!selfRef) {
      results.push(this.createResult(context, {
        title: 'Missing Self-Referencing Hreflang Tag',
        description: 'This page has hreflang tags but none points back to itself.',
        severity: Severity.HIGH,
        location: { url },
        evidence: `${hreflangTags.length} hreflang tags, none self-referencing`,
        whyItMatters: 'Google requires each page to include a self-referencing hreflang. Without it, the implementation is technically invalid and may be ignored.',
        possibleCause: 'Hreflang implementation added only for alternate languages, not the current page.',
        recommendedFix: 'Add a hreflang tag for the current page\'s own language pointing to its own URL.',
        estimatedImpact: 'High - Hreflang implementation may be ignored',
        confidenceScore: 0.8,
      }));
    }

    // Validate language codes
    const validLangPattern = /^[a-z]{2}(-[A-Z]{2})?$|^x-default$/;
    const invalidLangs = hreflangTags.filter(t => !validLangPattern.test(t.lang) && t.lang !== 'x-default');
    if (invalidLangs.length > 0) {
      results.push(this.createResult(context, {
        title: `Invalid Hreflang Language Code(s): ${invalidLangs.map(t => t.lang).join(', ')}`,
        description: `Found ${invalidLangs.length} hreflang tag(s) with invalid language codes.`,
        severity: Severity.HIGH,
        location: { url },
        evidence: invalidLangs.map(t => `hreflang="${t.lang}"`).join('\n'),
        whyItMatters: 'Invalid language codes cause search engines to ignore those hreflang tags entirely.',
        possibleCause: 'Typo or incorrect format in language code.',
        recommendedFix: 'Use ISO 639-1 language codes (en, fr, de) optionally with ISO 3166-1 country codes (en-US, fr-FR).',
        estimatedImpact: 'High - Invalid tags silently ignored',
        confidenceScore: 0.9,
      }));
    }

    return results;
  }
}
