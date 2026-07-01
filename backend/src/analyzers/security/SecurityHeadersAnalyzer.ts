import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class SecurityHeadersAnalyzer extends BaseAnalyzer {
  readonly id = 'security-headers';
  readonly name = 'Security Headers Analyzer';
  readonly category = AnalyzerCategory.SECURITY;
  readonly defaultSeverity = Severity.HIGH;
  readonly description = 'Checks for essential security headers';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { url } = context.page;

    const securityHeaders = [
      { name: 'strict-transport-security', description: 'HSTS header not set' },
      { name: 'content-security-policy', description: 'Content Security Policy not defined' },
      { name: 'x-content-type-options', description: 'X-Content-Type-Options not set' },
      { name: 'x-frame-options', description: 'X-Frame-Options not set' },
      { name: 'referrer-policy', description: 'Referrer-Policy not set' },
    ];

    for (const header of securityHeaders) {
      results.push(this.createResult(context, {
        title: `Missing Security Header: ${header.name}`,
        description: header.description,
        severity: this.getSeverityForHeader(header.name),
        location: { url },
        whyItMatters: this.getWhyItMatters(header.name),
        possibleCause: 'Security headers not configured on the server.',
        recommendedFix: this.getRecommendedFix(header.name),
        estimatedImpact: this.getEstimatedImpact(header.name),
        confidenceScore: 0.95,
        metadata: {
          cwe: this.getCWE(header.name),
        },
      }));
    }

    return results;
  }

  private getSeverityForHeader(header: string): Severity {
    const criticalHeaders = ['content-security-policy', 'strict-transport-security'];
    const highHeaders = ['x-frame-options', 'x-content-type-options'];
    
    if (criticalHeaders.includes(header)) return Severity.HIGH;
    if (highHeaders.includes(header)) return Severity.MEDIUM;
    return Severity.LOW;
  }

  private getWhyItMatters(header: string): string {
    const reasons: Record<string, string> = {
      'strict-transport-security': 'Without HSTS, browsers may allow insecure HTTP connections which can be intercepted.',
      'content-security-policy': 'Without CSP, the site is vulnerable to XSS and data injection attacks.',
      'x-content-type-options': 'Without this header, browsers may MIME-sniff content and execute it.',
      'x-frame-options': 'Without this header, the page can be embedded in iframes, enabling clickjacking attacks.',
      'referrer-policy': 'Without this header, sensitive URLs may be sent as referrers.',
    };
    return reasons[header] || 'Security header not configured.';
  }

  private getRecommendedFix(header: string): string {
    const fixes: Record<string, string> = {
      'strict-transport-security': 'Add header: Strict-Transport-Security: max-age=31536000; includeSubDomains',
      'content-security-policy': "Add a CSP header based on your site's resource needs, e.g.: default-src 'self'",
      'x-content-type-options': 'Add header: X-Content-Type-Options: nosniff',
      'x-frame-options': 'Add header: X-Frame-Options: DENY (or SAMEORIGIN if framing is needed)',
      'referrer-policy': 'Add header: Referrer-Policy: strict-origin-when-cross-origin',
    };
    return fixes[header] || 'Configure this security header on your server.';
  }

  private getEstimatedImpact(header: string): string {
    const impacts: Record<string, string> = {
      'strict-transport-security': 'High - Affects HTTPS enforcement',
      'content-security-policy': 'Critical - Primary defense against XSS attacks',
      'x-content-type-options': 'Medium - Affects MIME type handling',
      'x-frame-options': 'Medium - Prevents clickjacking attacks',
      'referrer-policy': 'Low - Affects privacy and referrer information',
    };
    return impacts[header] || 'Medium - General security improvement';
  }

  private getCWE(header: string): string[] {
    const cweMap: Record<string, string[]> = {
      'strict-transport-security': ['CWE-319', 'CWE-295'],
      'content-security-policy': ['CWE-79', 'CWE-94', 'CWE-829'],
      'x-content-type-options': ['CWE-693'],
      'x-frame-options': ['CWE-1021', 'CWE-346'],
      'referrer-policy': ['CWE-200'],
    };
    return cweMap[header] || [];
  }
}
