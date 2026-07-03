import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class NavigationAnalyzer extends BaseAnalyzer {
  readonly id = 'navigation-analyzer';
  readonly name = 'Navigation Analyzer';
  readonly category = AnalyzerCategory.NAVIGATION;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Analyzes navigation structure, menu accessibility, and breadcrumb patterns';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    // Check for semantic nav element
    const hasNavElement = /<nav\b/i.test(html);
    if (!hasNavElement) {
      // Check if there are link groups that should be in nav
      const linkGroupPattern = /<(?:ul|ol)[^>]*>((?:\s*<li>[^<]*<a[^>]*>[^<]*<\/a>[^<]*<\/li>\s*){3,})<\/(?:ul|ol)>/gi;
      if (linkGroupPattern.test(html)) {
        results.push(this.createResult(context, {
          title: 'Navigation Links Not Wrapped in <nav> Element',
          description: 'Found link groups that appear to be navigation menus but are not wrapped in <nav> elements.',
          severity: Severity.MEDIUM,
          location: { url },
          whyItMatters: 'The <nav> element is a landmark element that allows screen reader users to quickly jump to the navigation. Without it, there is no way to identify navigation regions.',
          possibleCause: 'Navigation implemented with <div> or <ul> without semantic <nav> wrapper.',
          recommendedFix: 'Wrap navigation link groups in <nav aria-label="Main navigation"> or <nav aria-label="Footer navigation">.',
          estimatedImpact: 'Medium - Screen reader users cannot navigate to the nav region',
          confidenceScore: 0.75,
          metadata: { wcagCriteria: ['2.4.1'] },
        }));
      }
    }

    // Check for multiple nav elements without labels
    const navCount = (html.match(/<nav\b/gi) || []).length;
    const navWithLabel = (html.match(/<nav[^>]+(?:aria-label|aria-labelledby)/gi) || []).length;

    if (navCount > 1 && navWithLabel < navCount) {
      results.push(this.createResult(context, {
        title: `Multiple <nav> Elements Without Distinct Labels`,
        description: `Found ${navCount} <nav> elements but only ${navWithLabel} have aria-label/aria-labelledby.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: `${navCount} nav elements, ${navWithLabel} labeled`,
        whyItMatters: 'When multiple nav elements exist without distinct labels, screen reader users cannot distinguish between them (e.g., main navigation vs. footer navigation).',
        possibleCause: 'Multiple nav elements added without labels.',
        recommendedFix: 'Add aria-label to each nav element to describe its purpose: <nav aria-label="Main navigation">, <nav aria-label="Footer navigation">.',
        estimatedImpact: 'Medium - Screen reader users cannot distinguish navigation regions',
        confidenceScore: 0.9,
        metadata: { wcagCriteria: ['2.4.6'] },
      }));
    }

    // Check for breadcrumb
    const hasBreadcrumb = html.match(/breadcrumb/i) || html.match(/aria-label=["']breadcrumb/i);
    const isDeepPage = url.split('/').length > 4;
    if (isDeepPage && !hasBreadcrumb) {
      results.push(this.createResult(context, {
        title: 'Deep Page Without Breadcrumb Navigation',
        description: 'Page appears to be nested deeply but has no breadcrumb navigation.',
        severity: Severity.LOW,
        location: { url },
        evidence: `URL depth: ${url.split('/').length - 3} levels`,
        whyItMatters: 'Breadcrumbs help users understand their current location in the site hierarchy and navigate back without using the browser back button. Google uses breadcrumbs for rich results.',
        possibleCause: 'Breadcrumb navigation not implemented.',
        recommendedFix: 'Add breadcrumb navigation with aria-label="breadcrumb" and schema.org BreadcrumbList markup for SEO benefit.',
        estimatedImpact: 'Low - Reduced navigability and missed SEO opportunity',
        confidenceScore: 0.65,
      }));
    }

    // Check for active link indication
    const hasActiveLinkPattern = /(?:aria-current=["']page["']|class=["'][^"']*active[^"']*["'])/i.test(html);
    const hasMultipleNavLinks = (html.match(/<nav/gi) || []).length > 0;
    if (hasMultipleNavLinks && !hasActiveLinkPattern) {
      results.push(this.createResult(context, {
        title: 'No Active Navigation Item Indicated',
        description: 'Navigation has no indication of the current/active page.',
        severity: Severity.LOW,
        location: { url },
        whyItMatters: 'Users need to know which section they are in. Without visual and programmatic indication, it\'s especially confusing for screen reader users who need aria-current="page" on the active link.',
        possibleCause: 'Active state not implemented or not added to the current page link.',
        recommendedFix: 'Add aria-current="page" to the link matching the current URL. Style it visually as active.',
        estimatedImpact: 'Low - Orientation issues for users',
        confidenceScore: 0.65,
        metadata: { wcagCriteria: ['2.4.4'] },
      }));
    }

    return results;
  }
}
