import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class CORSAnalyzer extends BaseAnalyzer {
  readonly id = 'cors-analyzer';
  readonly name = 'CORS Configuration Analyzer';
  readonly category = AnalyzerCategory.SECURITY;
  readonly defaultSeverity = Severity.HIGH;
  readonly description = 'Analyzes Cross-Origin Resource Sharing headers for misconfigurations';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { url, resources } = context.page;

    // Detect wildcard CORS on API endpoints (heuristic based on resource types)
    const apiResources = resources.filter(r =>
      r.url.includes('/api/') ||
      r.url.includes('/graphql') ||
      r.url.includes('/v1/') ||
      r.url.includes('/v2/') ||
      r.url.includes('.json')
    );

    // Check response headers for CORS headers
    const corsResources = resources.filter(r => {
      const headers = (r as any).headers || {};
      return headers['access-control-allow-origin'] !== undefined;
    });

    corsResources.forEach(r => {
      const headers = (r as any).headers || {};
      const allowOrigin = headers['access-control-allow-origin'];
      const allowCredentials = headers['access-control-allow-credentials'];

      if (allowOrigin === '*' && allowCredentials === 'true') {
        results.push(this.createResult(context, {
          title: 'Dangerous CORS: Wildcard Origin with Credentials',
          description: `Resource "${r.url}" allows all origins (*) AND credentials. This configuration is forbidden by browsers for a reason.`,
          severity: Severity.CRITICAL,
          location: { url: r.url },
          evidence: `Access-Control-Allow-Origin: *\nAccess-Control-Allow-Credentials: true`,
          whyItMatters: 'This combination allows any website to make authenticated cross-origin requests on behalf of your users, enabling CSRF-style attacks that bypass SameSite cookie protections.',
          possibleCause: 'Misconfigured CORS middleware that blindly reflects wildcard origin.',
          recommendedFix: 'Use a whitelist of specific allowed origins instead of *. Never combine wildcard with credentials: true.',
          estimatedImpact: 'Critical - Authentication bypass possible',
          confidenceScore: 0.95,
          metadata: { cwe: ['CWE-942', 'CWE-346'] },
        }));
      } else if (allowOrigin === '*') {
        results.push(this.createResult(context, {
          title: 'Permissive CORS: Wildcard Origin',
          description: `Resource "${r.url}" allows requests from any origin.`,
          severity: Severity.MEDIUM,
          location: { url: r.url },
          evidence: `Access-Control-Allow-Origin: *`,
          whyItMatters: 'Any website can read responses from this resource. Acceptable for truly public APIs, but dangerous if the resource returns any user-specific or sensitive data.',
          possibleCause: 'Default permissive CORS configuration not tightened for production.',
          recommendedFix: 'If this endpoint serves sensitive data, restrict to specific trusted origins. Wildcard is only safe for fully public, unauthenticated resources.',
          estimatedImpact: 'Medium - Any site can read public responses',
          confidenceScore: 0.85,
          metadata: { cwe: ['CWE-942'] },
        }));
      }
    });

    // Check for CORS-related issues in HTML (fetch/XHR to different origins)
    const { html } = context.page;
    const fetchPattern = /fetch\s*\(\s*["'`](https?:\/\/[^"'`]+)["'`]/gi;
    const fetchUrls: string[] = [];
    let match;
    while ((match = fetchPattern.exec(html)) !== null) {
      const fetchUrl = match[1] ?? '';
      try {
        const fetchOrigin = new URL(fetchUrl).origin;
        const pageOrigin = new URL(url).origin;
        if (fetchOrigin !== pageOrigin) {
          fetchUrls.push(fetchUrl);
        }
      } catch { /* ignore invalid URLs */ }
    }

    if (fetchUrls.length > 0) {
      results.push(this.createResult(context, {
        title: `Cross-Origin Requests Detected (${fetchUrls.length})`,
        description: `Page makes ${fetchUrls.length} cross-origin fetch/XHR request(s). Verify CORS is properly configured on the target server(s).`,
        severity: Severity.INFO,
        location: { url },
        evidence: fetchUrls.slice(0, 5).join('\n'),
        whyItMatters: 'Cross-origin requests require CORS headers on the server. If misconfigured, these requests will fail silently in production for some users.',
        possibleCause: 'Frontend communicating with separate API server or third-party service.',
        recommendedFix: 'Ensure each target server has correct CORS headers configured. Test cross-origin requests in all target browsers.',
        estimatedImpact: 'Info - Verify CORS configuration on external servers',
        confidenceScore: 0.75,
      }));
    }

    return results;
  }
}
