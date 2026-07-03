import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class UnusedCSSAnalyzer extends BaseAnalyzer {
  readonly id = 'unused-css-analyzer';
  readonly name = 'CSS Quality Analyzer';
  readonly category = AnalyzerCategory.CSS;
  readonly defaultSeverity = Severity.LOW;
  readonly description = 'Detects CSS issues including overuse of !important, overly specific selectors, and large CSS files';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url, resources } = context.page;

    // Extract inline CSS from style tags
    const stylePattern = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let cssContent = '';
    let match;
    while ((match = stylePattern.exec(html)) !== null) {
      cssContent += (match[1] ?? '') + '\n';
    }

    // Check for !important overuse
    const importantCount = (cssContent.match(/!important/g) || []).length;
    if (importantCount > 10) {
      results.push(this.createResult(context, {
        title: `Excessive !important Usage (${importantCount} occurrences)`,
        description: `Found ${importantCount} !important declarations in inline CSS.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: `${importantCount} !important declarations`,
        whyItMatters: 'Excessive !important breaks the CSS cascade, making styles unpredictable and very hard to override. It indicates specificity battles in the codebase.',
        possibleCause: 'Specificity conflicts resolved with !important instead of proper selector architecture.',
        recommendedFix: 'Refactor CSS to use appropriate selector specificity instead of !important. Reserve !important for utility classes and accessibility overrides only.',
        estimatedImpact: 'Medium - CSS maintainability severely impacted',
        confidenceScore: 0.9,
      }));
    }

    // Check for very large CSS resources
    const cssResources = resources.filter(r => r.type === 'style' || r.url.endsWith('.css'));
    const largeCSSFiles = cssResources.filter(r => r.size > 100000); // > 100KB
    if (largeCSSFiles.length > 0) {
      const totalCSSSize = cssResources.reduce((sum, r) => sum + r.size, 0);
      results.push(this.createResult(context, {
        title: `Large CSS Bundle: ${Math.round(totalCSSSize / 1024)}KB Total`,
        description: `Total CSS size is ${Math.round(totalCSSSize / 1024)}KB. ${largeCSSFiles.length} file(s) exceed 100KB each.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: largeCSSFiles.map(r => `${r.url} (${Math.round(r.size / 1024)}KB)`).join('\n'),
        whyItMatters: 'Large CSS files are render-blocking — the browser must download and parse all CSS before rendering. Most sites only use 10-30% of loaded CSS.',
        possibleCause: 'Full CSS frameworks loaded without purging unused rules, or CSS not split per-page.',
        recommendedFix: 'Use PurgeCSS to remove unused CSS. Implement critical CSS inlining. Consider CSS modules or utility-first approach (Tailwind with purging).',
        estimatedImpact: 'Medium - Render blocked by large CSS download',
        confidenceScore: 0.85,
      }));
    }

    // Check CSS in resources for potential issues
    const totalCSSCount = cssResources.length;
    if (totalCSSCount > 5) {
      results.push(this.createResult(context, {
        title: `Too Many CSS Files: ${totalCSSCount} Stylesheets`,
        description: `Page loads ${totalCSSCount} separate CSS files. Each file is a render-blocking request.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: cssResources.slice(0, 5).map(r => r.url).join('\n'),
        whyItMatters: 'Each CSS file requires a separate HTTP request. With HTTP/1.1, these serialize. Even with HTTP/2, many small files have overhead. The browser cannot render until all CSS is loaded.',
        possibleCause: 'CSS not bundled, multiple UI libraries, and plugin stylesheets loaded individually.',
        recommendedFix: 'Bundle CSS into one or two files using Webpack, Vite, or Parcel. Keep only critical CSS blocking, and load non-critical CSS asynchronously.',
        estimatedImpact: 'Medium - Multiple render-blocking requests',
        confidenceScore: 0.85,
      }));
    }

    // Check for deeply nested selectors in inline style (anti-pattern)
    const deepSelectorPattern = /([.#][\w-]+\s+){5,}/g;
    const deepSelectors = cssContent.match(deepSelectorPattern) || [];
    if (deepSelectors.length > 2) {
      results.push(this.createResult(context, {
        title: `${deepSelectors.length} Overly Specific CSS Selectors`,
        description: `Found ${deepSelectors.length} CSS selectors with 5+ levels of nesting.`,
        severity: Severity.LOW,
        location: { url },
        evidence: deepSelectors.slice(0, 3).map(s => s.trim()).join('\n'),
        whyItMatters: 'Deeply nested selectors are fragile (any HTML structure change breaks them), slow (browsers read selectors right-to-left), and indicate poor CSS architecture.',
        possibleCause: 'CSS written to match exact HTML structure instead of semantic patterns.',
        recommendedFix: 'Flatten CSS selectors. Use BEM naming convention or CSS modules to avoid deep nesting.',
        estimatedImpact: 'Low - CSS fragility and performance',
        confidenceScore: 0.75,
      }));
    }

    return results;
  }
}
