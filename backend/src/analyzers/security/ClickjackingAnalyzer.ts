import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class ClickjackingAnalyzer extends BaseAnalyzer {
  readonly id = 'clickjacking-analyzer';
  readonly name = 'Clickjacking & Framing Protection Analyzer';
  readonly category = AnalyzerCategory.SECURITY;
  readonly defaultSeverity = Severity.HIGH;
  readonly description = 'Checks for X-Frame-Options, CSP frame-ancestors, and iframe security attributes';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { url, resources } = context.page;

    // Check main page for X-Frame-Options header
    const mainResource = resources.find(r => r.url === url || r.type === 'document');
    const headers = (mainResource as any)?.headers || {};

    const xFrameOptions = headers['x-frame-options'] ?? headers['X-Frame-Options'] ?? '';
    const csp = headers['content-security-policy'] ?? headers['Content-Security-Policy'] ?? '';
    const hasFrameAncestors = csp.toLowerCase().includes('frame-ancestors');

    if (!xFrameOptions && !hasFrameAncestors) {
      results.push(this.createResult(context, {
        title: 'Missing Clickjacking Protection',
        description: 'Page lacks both X-Frame-Options and CSP frame-ancestors headers.',
        severity: Severity.HIGH,
        location: { url },
        whyItMatters: 'Without framing protection, attackers can embed your page in an invisible iframe, tricking users into clicking on elements they cannot see (clickjacking). This can be used to steal clicks, trigger unauthorized actions, or capture credentials.',
        possibleCause: 'Framing protection headers not configured on web server.',
        recommendedFix: 'Add one of:\n1. Content-Security-Policy: frame-ancestors \'self\' (preferred — more flexible)\n2. X-Frame-Options: SAMEORIGIN (legacy — simpler)',
        estimatedImpact: 'High - Clickjacking attacks possible',
        confidenceScore: 0.7,
        metadata: { cwe: ['CWE-1021'] },
      }));
    } else if (xFrameOptions && xFrameOptions.toUpperCase() === 'ALLOW-FROM') {
      results.push(this.createResult(context, {
        title: 'X-Frame-Options: ALLOW-FROM Is Deprecated',
        description: 'X-Frame-Options: ALLOW-FROM is not supported by modern browsers.',
        severity: Severity.MEDIUM,
        location: { url },
        evidence: `X-Frame-Options: ${xFrameOptions}`,
        whyItMatters: 'ALLOW-FROM was deprecated and is unsupported in Chrome and Firefox. Pages using it have no effective framing protection in most browsers.',
        possibleCause: 'Legacy X-Frame-Options configuration.',
        recommendedFix: 'Replace with CSP frame-ancestors:\nContent-Security-Policy: frame-ancestors \'self\' https://trusted-domain.com',
        estimatedImpact: 'Medium - Framing protection ineffective in modern browsers',
        confidenceScore: 0.9,
        metadata: { cwe: ['CWE-1021'] },
      }));
    }

    // Check for iframes without sandbox attribute
    const { html } = context.page;
    const iframePattern = /<iframe([^>]*?)>/gi;
    const unsandboxedIframes: string[] = [];
    let match;

    while ((match = iframePattern.exec(html)) !== null) {
      const attrs = match[1] ?? '';
      const src = attrs.match(/src=["']([^"']+)["']/i)?.[1] ?? '';
      if (src && !attrs.includes('sandbox') && !src.startsWith('data:')) {
        unsandboxedIframes.push(src);
      }
    }

    if (unsandboxedIframes.length > 0) {
      results.push(this.createResult(context, {
        title: `${unsandboxedIframes.length} Iframe(s) Without sandbox Attribute`,
        description: `Found ${unsandboxedIframes.length} <iframe> element(s) loading external content without the sandbox attribute.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: unsandboxedIframes.slice(0, 3).join('\n'),
        whyItMatters: 'Unsandboxed iframes can execute scripts, submit forms, open popups, and access the top-level page. If the embedded content is malicious or compromised, it can attack your users.',
        possibleCause: 'Iframes added without security hardening.',
        recommendedFix: 'Add sandbox attribute to all iframes:\n<iframe src="..." sandbox="allow-scripts allow-same-origin">\nOnly add the specific permissions the content needs.',
        estimatedImpact: 'Medium - Embedded content has full browser privileges',
        confidenceScore: 0.85,
        metadata: { cwe: ['CWE-184'] },
      }));
    }

    return results;
  }
}
