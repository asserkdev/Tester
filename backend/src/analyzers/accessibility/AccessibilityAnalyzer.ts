import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class AccessibilityAnalyzer extends BaseAnalyzer {
  readonly id = 'accessibility-analyzer';
  readonly name = 'Accessibility Analyzer';
  readonly category = AnalyzerCategory.ACCESSIBILITY;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Checks for WCAG accessibility compliance';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    const headingStructure = this.checkHeadingStructure(html);
    if (headingStructure.issues.length > 0) {
      headingStructure.issues.forEach((issue) => {
        results.push(this.createResult(context, {
          title: 'Invalid Heading Structure',
          description: issue,
          severity: Severity.MEDIUM,
          location: { url },
          whyItMatters: 'Proper heading structure helps screen readers navigate the page content.',
          possibleCause: 'Missing or skipped heading levels.',
          recommendedFix: 'Ensure headings follow a logical order: h1 > h2 > h3. Use one h1 per page.',
          estimatedImpact: 'Medium - Affects accessibility',
          confidenceScore: 0.9,
          metadata: {
            wcagCriteria: ['1.3.1', '2.4.6'],
          },
        }));
      });
    }

    const missingLabels = this.checkFormLabels(html);
    missingLabels.forEach((field) => {
      results.push(this.createResult(context, {
        title: 'Form Field Missing Label',
        description: `Input field is missing an associated label.`,
        severity: Severity.MEDIUM,
        location: { url, selector: field.selector, element: field.tag },
        evidence: field.tag,
        whyItMatters: 'Without labels, screen readers cannot describe form fields to users.',
        possibleCause: 'Label not associated with input via for/id attributes or aria-label.',
        recommendedFix: 'Add a <label> element with for attribute matching the input id.',
        estimatedImpact: 'Medium - Affects form accessibility',
        confidenceScore: 0.9,
        metadata: {
          wcagCriteria: ['1.3.1', '3.3.2'],
        },
      }));
    });

    const keyboardIssues = this.checkKeyboardAccessibility(html);
    keyboardIssues.forEach((issue) => {
      results.push(this.createResult(context, {
        title: 'Keyboard Accessibility Issue',
        description: issue.description,
        severity: Severity.MEDIUM,
        location: { url, selector: issue.selector },
        evidence: issue.tag,
        whyItMatters: 'Users who cannot use a mouse rely on keyboard navigation.',
        possibleCause: 'Interactive elements not focusable or missing focus styles.',
        recommendedFix: 'Ensure all interactive elements are focusable and have visible focus states.',
        estimatedImpact: 'Medium - Affects keyboard navigation',
        confidenceScore: 0.8,
        metadata: {
          wcagCriteria: ['2.1.1', '2.4.7'],
        },
      }));
    });

    return results;
  }

  private checkHeadingStructure(_html: string): { issues: string[] } {
    const issues: string[] = [];
    const h1Pattern = /<h1[^>]*>/gi;
    const h1Matches = _html.match(h1Pattern) || [];
    
    if (h1Matches.length === 0) {
      issues.push('No <h1> element found on the page.');
    } else if (h1Matches.length > 1) {
      issues.push(`Found ${h1Matches.length} <h1> elements. Consider using only one per page.`);
    }

    const headingPattern = /<h([1-6])[^>]*>/gi;
    const headings: number[] = [];
    let match;

    while ((match = headingPattern.exec(_html)) !== null) {
      const level = parseInt(match[1] ?? '0', 10);
      if (level > 0) headings.push(level);
    }

    for (let i = 1; i < headings.length; i++) {
      if (headings[i] > headings[i - 1] + 1) {
        issues.push(`Skipped heading level from h${headings[i - 1]} to h${headings[i]}.`);
      }
    }

    return { issues };
  }

  private checkFormLabels(html: string): Array<{ selector: string; tag: string }> {
    const missing: Array<{ selector: string; tag: string }> = [];
    const inputPattern = /<input([^>]*?)>/gi;
    let match;

    while ((match = inputPattern.exec(html)) !== null) {
      const tag = match[0] ?? '';
      const attrs = match[1] ?? '';

      if (attrs.includes('type="hidden"') || attrs.includes('type="submit"') || attrs.includes('type="button"')) {
        continue;
      }

      const hasAriaLabel = attrs.includes('aria-label') || attrs.includes('aria-labelledby');

      if (!hasAriaLabel) {
        missing.push({
          selector: 'input',
          tag,
        });
      }
    }

    return missing;
  }

  private checkKeyboardAccessibility(html: string): Array<{ selector: string; tag: string; description: string }> {
    const issues: Array<{ selector: string; tag: string; description: string }> = [];

    const clickHandlers = /<(\w+)([^>]*?)onclick=["']([^"']+)["']([^>]*?)>/gi;
    let match;

    while ((match = clickHandlers.exec(html)) !== null) {
      const tag = match[0] ?? '';
      const tagName = match[1] ?? '';
      const attrs = (match[2] ?? '') + (match[4] ?? '');

      if (tagName !== 'a' && tagName !== 'button' && !attrs.includes('onkeydown') && !attrs.includes('onkeyup') && !attrs.includes('onkeypress')) {
        issues.push({
          selector: tagName,
          tag,
          description: `Element has onclick handler but no keyboard event handler.`,
        });
      }
    }

    return issues;
  }
}
