import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class XSSRiskAnalyzer extends BaseAnalyzer {
  readonly id = 'xss-risk-analyzer';
  readonly name = 'XSS Risk Analyzer';
  readonly category = AnalyzerCategory.SECURITY;
  readonly defaultSeverity = Severity.HIGH;
  readonly description = 'Detects patterns that increase Cross-Site Scripting (XSS) risk';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    // Check for inline event handlers (onclick, onmouseover, etc.)
    const inlineEventPattern = /\s(on\w+)=["']([^"']*?)["']/gi;
    const inlineEvents: Array<{ event: string; value: string }> = [];
    let match;
    while ((match = inlineEventPattern.exec(html)) !== null) {
      inlineEvents.push({ event: match[1] ?? '', value: match[2] ?? '' });
    }
    if (inlineEvents.length > 5) {
      results.push(this.createResult(context, {
        title: `${inlineEvents.length} Inline Event Handlers Detected`,
        description: `Found ${inlineEvents.length} inline event handlers (onclick, onload, etc.). These bypass Content Security Policy and increase XSS attack surface.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: inlineEvents.slice(0, 3).map(e => `${e.event}="${e.value.slice(0, 50)}"`).join('\n'),
        whyItMatters: 'Inline event handlers cannot be blocked by CSP\'s script-src directive without also blocking legitimate inline scripts. They are also harder to audit than external scripts.',
        possibleCause: 'Events added directly in HTML during templating or rapid development.',
        recommendedFix: 'Move event handlers to external JavaScript files using addEventListener(). This allows a strict CSP to be deployed.',
        estimatedImpact: 'Medium - Prevents effective CSP deployment',
        confidenceScore: 0.85,
        metadata: { cwe: ['CWE-79', 'CWE-116'] },
      }));
    }

    // Check for document.write usage (common XSS sink)
    if (html.includes('document.write(') || html.includes('document.writeln(')) {
      results.push(this.createResult(context, {
        title: 'Dangerous DOM API: document.write()',
        description: 'Page uses document.write() which is a common XSS sink and can overwrite the entire page.',
        severity: Severity.HIGH,
        location: { url },
        evidence: 'document.write() detected in page source',
        whyItMatters: 'document.write() can inject arbitrary HTML including <script> tags. If any user-controlled data reaches document.write(), it is a severe XSS vulnerability. It also blocks the HTML parser and harms performance.',
        possibleCause: 'Legacy code or third-party analytics/ad scripts using document.write.',
        recommendedFix: 'Replace document.write() with DOM manipulation methods (createElement, appendChild, innerHTML with sanitization).',
        estimatedImpact: 'High - XSS vulnerability if input reaches this sink',
        confidenceScore: 0.9,
        metadata: { cwe: ['CWE-79', 'CWE-80'] },
      }));
    }

    // Check for innerHTML without apparent sanitization
    const innerHTMLPattern = /\.innerHTML\s*=\s*(?!["'`]<)/g;
    const innerHTMLCount = (html.match(innerHTMLPattern) || []).length;
    if (innerHTMLCount > 0) {
      results.push(this.createResult(context, {
        title: `${innerHTMLCount} Potential Unsafe innerHTML Assignment(s)`,
        description: `Found ${innerHTMLCount} assignment(s) to innerHTML. If any value comes from user input or external data, this is an XSS vulnerability.`,
        severity: Severity.HIGH,
        location: { url },
        evidence: `${innerHTMLCount} innerHTML= assignments detected`,
        whyItMatters: 'Assigning user-controlled content to innerHTML parses it as HTML, allowing injected <script> tags or event-handler attributes to execute.',
        possibleCause: 'Directly setting innerHTML from API responses, URL parameters, or user inputs without sanitization.',
        recommendedFix: 'Use textContent for text, or sanitize HTML with a library like DOMPurify before assigning to innerHTML. Consider using a template library that auto-escapes.',
        estimatedImpact: 'High - XSS if user data flows to innerHTML',
        confidenceScore: 0.75,
        metadata: { cwe: ['CWE-79', 'CWE-116'] },
      }));
    }

    // Check for eval() usage
    const evalPattern = /\beval\s*\(/g;
    const evalCount = (html.match(evalPattern) || []).length;
    if (evalCount > 0) {
      results.push(this.createResult(context, {
        title: `eval() Usage Detected (${evalCount} occurrence${evalCount > 1 ? 's' : ''})`,
        description: 'Page contains eval() calls which execute arbitrary JavaScript strings.',
        severity: Severity.CRITICAL,
        location: { url },
        evidence: `eval() used ${evalCount} time(s)`,
        whyItMatters: 'eval() executes any string as JavaScript. If user-controlled data reaches eval(), an attacker can execute arbitrary code in the victim\'s browser.',
        possibleCause: 'Dynamic code execution, legacy JSON parsing (use JSON.parse instead), or obfuscated third-party scripts.',
        recommendedFix: 'Remove eval() entirely. Use JSON.parse() for JSON, Function constructor as last resort, or refactor to eliminate dynamic code execution.',
        estimatedImpact: 'Critical - Arbitrary code execution risk',
        confidenceScore: 0.9,
        metadata: { cwe: ['CWE-79', 'CWE-95'] },
      }));
    }

    // Check for URL parameter reflection patterns
    const urlParamPattern = /location\.(search|hash|href)/g;
    const urlParamCount = (html.match(urlParamPattern) || []).length;
    if (urlParamCount > 0) {
      results.push(this.createResult(context, {
        title: 'URL Parameter Reflection Detected',
        description: 'Page reads from URL parameters (location.search/hash/href). If these values are reflected into the DOM without sanitization, it enables DOM-based XSS.',
        severity: Severity.MEDIUM,
        location: { url },
        evidence: `location.search/hash used ${urlParamCount} time(s)`,
        whyItMatters: 'DOM-based XSS occurs entirely on the client, bypassing server-side defenses. Attackers craft URLs with malicious parameters and trick users into clicking them.',
        possibleCause: 'JavaScript reading URL parameters to display content (e.g., search query, error messages).',
        recommendedFix: 'Sanitize all URL parameter values before inserting into the DOM. Use textContent instead of innerHTML for user-provided text.',
        estimatedImpact: 'Medium - Potential DOM-based XSS',
        confidenceScore: 0.7,
        metadata: { cwe: ['CWE-79', 'CWE-116'] },
      }));
    }

    return results;
  }
}
