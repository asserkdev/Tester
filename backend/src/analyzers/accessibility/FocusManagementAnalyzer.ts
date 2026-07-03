import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class FocusManagementAnalyzer extends BaseAnalyzer {
  readonly id = 'focus-management-analyzer';
  readonly name = 'Focus Management Analyzer';
  readonly category = AnalyzerCategory.ACCESSIBILITY;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Checks for focus management, skip links, tab order, and keyboard navigation patterns';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    // Check for skip navigation link
    const skipLinkPattern = /<a[^>]*href=["']#(?:main|content|main-content|skip|navigation|nav)[^"']*["'][^>]*>/gi;
    const skipLinks = html.match(skipLinkPattern) || [];
    if (skipLinks.length === 0) {
      results.push(this.createResult(context, {
        title: 'Missing Skip Navigation Link',
        description: 'Page has no "skip to main content" link at the top.',
        severity: Severity.MEDIUM,
        location: { url },
        whyItMatters: 'Without a skip link, keyboard users must tab through the entire navigation menu on every page before reaching the main content. This is a significant usability barrier (WCAG 2.4.1).',
        possibleCause: 'Skip link not implemented during development.',
        recommendedFix: 'Add a visually hidden skip link as the first focusable element:\n<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>\n<main id="main-content">...',
        estimatedImpact: 'Medium - Keyboard users must navigate entire menu on every page',
        confidenceScore: 0.85,
        metadata: { wcagCriteria: ['2.4.1'] },
      }));
    }

    // Check for positive tabindex (breaks natural focus order)
    const posTabindexPattern = /tabindex=["']([1-9]\d*)["']/gi;
    const posTabindexElements: string[] = [];
    let match;
    while ((match = posTabindexPattern.exec(html)) !== null) {
      posTabindexElements.push(`tabindex="${match[1]}"`);
    }

    if (posTabindexElements.length > 0) {
      results.push(this.createResult(context, {
        title: `Positive tabindex Values Found (${posTabindexElements.length})`,
        description: `Found ${posTabindexElements.length} element(s) with positive tabindex values. This overrides the natural focus order.`,
        severity: Severity.HIGH,
        location: { url },
        evidence: posTabindexElements.slice(0, 5).join('\n'),
        whyItMatters: 'Positive tabindex values hijack the tab order, causing focus to jump unpredictably around the page. This is extremely confusing for keyboard and screen reader users (WCAG 2.4.3).',
        possibleCause: 'Attempting to control focus order by setting tabindex values.',
        recommendedFix: 'Remove positive tabindex values. Use tabindex="0" to add an element to the focus order, or tabindex="-1" to allow programmatic focus only. Fix focus order by changing the DOM order instead.',
        estimatedImpact: 'High - Focus order becomes unpredictable',
        confidenceScore: 0.95,
        metadata: { wcagCriteria: ['2.4.3'] },
      }));
    }

    // Check for outline: none / outline: 0 on focus (removing focus indicators)
    const outlineNonePattern = /(?:focus[^{]*{[^}]*outline\s*:\s*(?:none|0)|:focus\s*\{[^}]*outline\s*:\s*(?:none|0))/gi;
    if (outlineNonePattern.test(html)) {
      results.push(this.createResult(context, {
        title: 'Focus Indicator Removed via CSS',
        description: 'Page CSS removes the default focus outline (outline: none or outline: 0 on :focus).',
        severity: Severity.HIGH,
        location: { url },
        whyItMatters: 'Without visible focus indicators, keyboard users cannot tell which element is currently focused. This is a critical accessibility barrier and WCAG 2.4.7 failure.',
        possibleCause: 'Developers removing focus ring for aesthetic reasons without providing an alternative.',
        recommendedFix: 'Never use outline: none without replacing with a visible custom focus style. Instead: :focus-visible { outline: 3px solid #4A90E2; outline-offset: 2px; }',
        estimatedImpact: 'High - Keyboard users cannot determine focus position',
        confidenceScore: 0.8,
        metadata: { wcagCriteria: ['2.4.7'] },
      }));
    }

    // Check for autofocus on potentially disruptive elements
    const autofocusPattern = /<(?!input|textarea|select)(\w+)([^>]*?)\bautofocus\b([^>]*?)>/gi;
    if (autofocusPattern.test(html)) {
      results.push(this.createResult(context, {
        title: 'Autofocus on Non-Input Element',
        description: 'An element that is not a form field has the autofocus attribute.',
        severity: Severity.MEDIUM,
        location: { url },
        whyItMatters: 'Autofocus on unexpected elements disrupts users relying on assistive technologies. Screen readers may not announce focused content properly when focus is set automatically on page load.',
        possibleCause: 'autofocus applied broadly or on wrong element.',
        recommendedFix: 'Use autofocus only on the primary input field in forms. Never use it on non-form elements. Provide a way for users to reach the autofocused area by other means.',
        estimatedImpact: 'Medium - Disrupts screen reader page navigation',
        confidenceScore: 0.75,
        metadata: { wcagCriteria: ['2.4.3'] },
      }));
    }

    return results;
  }
}
