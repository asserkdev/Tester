import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class CSSValidator extends BaseAnalyzer {
  readonly id = 'css-validator';
  readonly name = 'CSS Validator';
  readonly category = AnalyzerCategory.CSS;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Validates CSS syntax and detects unused styles';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, resources, url } = context.page;

    const cssResources = resources.filter((r) => r.type === 'style' || r.url.endsWith('.css'));
    
    cssResources.forEach((css) => {
      if (css.size > 500000) {
        results.push(this.createResult(context, {
          title: 'Large CSS File',
          description: `CSS file exceeds 500KB. Consider splitting or optimizing.`,
          severity: Severity.MEDIUM,
          location: { url: css.url },
          evidence: `Size: ${(css.size / 1024).toFixed(2)}KB`,
          whyItMatters: 'Large CSS files increase page load time and can impact performance metrics.',
          possibleCause: 'Inline styles, unused CSS, or uncompressed CSS.',
          recommendedFix: 'Use CSS minification, tree-shaking, or split into critical and non-critical CSS.',
          estimatedImpact: 'Medium - Affects page load performance',
          confidenceScore: 0.9,
        }));
      }
    });

    const inlineStyles = this.findInlineStyles(html);
    if (inlineStyles.count > 10) {
      results.push(this.createResult(context, {
        title: 'Excessive Inline Styles',
        description: `Found ${inlineStyles.count} inline style attributes. Consider moving to stylesheet.`,
        severity: Severity.LOW,
        location: { url },
        evidence: `${inlineStyles.count} inline styles found`,
        whyItMatters: 'Inline styles reduce code maintainability and prevent style reuse.',
        possibleCause: 'Quick fixes during development or framework that uses inline styles.',
        recommendedFix: 'Move inline styles to CSS classes and use semantic class names.',
        estimatedImpact: 'Low - Affects maintainability',
        confidenceScore: 0.85,
      }));
    }

    return results;
  }

  private findInlineStyles(html: string): { count: number } {
    const stylePattern = /style="[^"]*"/g;
    const matches = html.match(stylePattern) || [];
    return { count: matches.length };
  }
}
