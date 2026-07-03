import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class JSQualityAnalyzer extends BaseAnalyzer {
  readonly id = 'js-quality-analyzer';
  readonly name = 'JavaScript Quality Analyzer';
  readonly category = AnalyzerCategory.JAVASCRIPT;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Analyzes JavaScript code quality, deprecated patterns, and potential runtime issues';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    // Extract inline scripts
    const scriptContent = this.extractScripts(html);
    if (!scriptContent) return results;

    // Check for deprecated APIs
    const deprecatedAPIs = [
      { pattern: /\bwith\s*\(/g, name: 'with statement', fix: 'Refactor to use explicit variable assignments instead of with().' },
      { pattern: /document\.all\b/g, name: 'document.all', fix: 'Use document.getElementById(), querySelector(), or getElementsByTagName() instead.' },
      { pattern: /document\.layers\b/g, name: 'document.layers', fix: 'This is a Netscape 4 API. Use standard DOM methods.' },
      { pattern: /escape\s*\(/g, name: 'escape()', fix: 'Use encodeURIComponent() or encodeURI() instead.' },
      { pattern: /unescape\s*\(/g, name: 'unescape()', fix: 'Use decodeURIComponent() or decodeURI() instead.' },
      { pattern: /arguments\.caller/g, name: 'arguments.caller', fix: 'Deprecated and removed in strict mode. Refactor to pass needed values explicitly.' },
    ];

    for (const api of deprecatedAPIs) {
      const count = (scriptContent.match(api.pattern) || []).length;
      if (count > 0) {
        results.push(this.createResult(context, {
          title: `Deprecated JavaScript API: ${api.name}`,
          description: `Found ${count} use(s) of deprecated JavaScript API: "${api.name}".`,
          severity: Severity.MEDIUM,
          location: { url },
          evidence: `${api.name} used ${count} time(s)`,
          whyItMatters: `"${api.name}" is deprecated and may be removed in future browser versions. Code relying on it will break silently.`,
          possibleCause: 'Legacy code not updated to modern JavaScript.',
          recommendedFix: api.fix,
          estimatedImpact: 'Medium - Code may break in future browser updates',
          confidenceScore: 0.85,
        }));
      }
    }

    // Check for global variable leaks (var without declaration in top scope)
    const globalLeakPattern = /^var\s+\w+\s*=/gm;
    const globalVarCount = (scriptContent.match(globalLeakPattern) || []).length;
    if (globalVarCount > 10) {
      results.push(this.createResult(context, {
        title: `Excessive Global Variables (${globalVarCount}+)`,
        description: `Found ${globalVarCount}+ top-level var declarations. Excessive globals cause namespace pollution.`,
        severity: Severity.LOW,
        location: { url },
        evidence: `${globalVarCount} top-level var declarations`,
        whyItMatters: 'Global variables pollute the global namespace, risk naming collisions with libraries, and make code harder to reason about.',
        possibleCause: 'Legacy JavaScript not using modules or IIFEs.',
        recommendedFix: 'Use ES modules (import/export), const/let with block scope, or wrap code in an IIFE to avoid global scope pollution.',
        estimatedImpact: 'Low - Code maintainability and collision risk',
        confidenceScore: 0.7,
      }));
    }

    // Check for synchronous XMLHttpRequest (blocks UI)
    if (scriptContent.includes('.open(') && /\.open\s*\(\s*["']\w+["']\s*,\s*[^,)]+,\s*false/.test(scriptContent)) {
      results.push(this.createResult(context, {
        title: 'Synchronous XMLHttpRequest Detected',
        description: 'Page uses synchronous XMLHttpRequest (third parameter = false), which blocks the main thread.',
        severity: Severity.HIGH,
        location: { url },
        evidence: 'xhr.open(..., false) detected',
        whyItMatters: 'Synchronous XHR freezes the browser\'s UI thread while waiting for the server response. Users cannot scroll, click, or interact with anything. Modern browsers show deprecation warnings.',
        possibleCause: 'Legacy code using synchronous XHR for simplicity.',
        recommendedFix: 'Convert to asynchronous XHR (third parameter = true) or better, use the Fetch API with async/await.',
        estimatedImpact: 'High - UI freezes during requests',
        confidenceScore: 0.9,
      }));
    }

    // Check for error-prone patterns
    if (/==\s*null\b/.test(scriptContent) && !/===/.test(scriptContent)) {
      results.push(this.createResult(context, {
        title: 'Loose Equality (==) Usage Detected',
        description: 'Code uses loose equality (==) instead of strict equality (===), which can cause unexpected type coercion.',
        severity: Severity.LOW,
        location: { url },
        evidence: 'Multiple == comparisons without strict === usage',
        whyItMatters: 'Loose equality performs type coercion: 0 == false, "" == false, null == undefined. This leads to subtle bugs that are hard to debug.',
        possibleCause: 'Legacy JavaScript habits or not enforcing strict equality via linting.',
        recommendedFix: 'Use === and !== for all comparisons. Enable ESLint\'s eqeqeq rule to catch these automatically.',
        estimatedImpact: 'Low - Subtle comparison bugs possible',
        confidenceScore: 0.65,
      }));
    }

    // Check for potential infinite loops
    const whileTruePattern = /while\s*\(\s*true\s*\)/g;
    const whileTrueCount = (scriptContent.match(whileTruePattern) || []).length;
    if (whileTrueCount > 0) {
      results.push(this.createResult(context, {
        title: `${whileTrueCount} while(true) Loop(s) Detected`,
        description: `Found ${whileTrueCount} while(true) loop(s). Ensure each has a reachable break condition.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: `${whileTrueCount} while(true) occurrence(s)`,
        whyItMatters: 'while(true) without a proper break can hang the browser tab, consuming 100% CPU and making the page unresponsive.',
        possibleCause: 'Intentional infinite loop (game loop, polling) or accidentally missing break condition.',
        recommendedFix: 'Verify each while(true) has a reachable break or return. Consider using setInterval or requestAnimationFrame for game loops instead.',
        estimatedImpact: 'Medium - Potential browser hang if break condition is missing',
        confidenceScore: 0.6,
      }));
    }

    return results;
  }

  private extractScripts(html: string): string {
    const pattern = /<script(?:[^>]*?(?!src=)[^>]*?)>([\s\S]*?)<\/script>/gi;
    let content = '';
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const scriptContent = match[1] ?? '';
      // Skip minified scripts (very long single lines)
      if (!scriptContent.includes('\n') && scriptContent.length > 500) continue;
      content += scriptContent + '\n';
    }
    return content;
  }
}
