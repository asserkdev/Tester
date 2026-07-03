import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class InfoDisclosureAnalyzer extends BaseAnalyzer {
  readonly id = 'info-disclosure-analyzer';
  readonly name = 'Information Disclosure Analyzer';
  readonly category = AnalyzerCategory.SECURITY;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Detects server version headers, stack traces, and other information leakage';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { url, html, resources } = context.page;

    // Check response headers for server version info
    const sensitiveHeaders = [
      { name: 'server', label: 'Server' },
      { name: 'x-powered-by', label: 'X-Powered-By' },
      { name: 'x-aspnet-version', label: 'X-AspNet-Version' },
      { name: 'x-aspnetmvc-version', label: 'X-AspNetMvc-Version' },
    ];

    resources.forEach(r => {
      const headers = (r as any).headers || {};
      for (const h of sensitiveHeaders) {
        const value = headers[h.name];
        if (value && this.containsVersion(value)) {
          results.push(this.createResult(context, {
            title: `Server Version Disclosed via ${h.label} Header`,
            description: `Response header "${h.label}: ${value}" reveals server software and version.`,
            severity: Severity.MEDIUM,
            location: { url: r.url },
            evidence: `${h.label}: ${value}`,
            whyItMatters: 'Knowing the exact server version helps attackers target known CVEs for that version. This is reconnaissance information that should not be publicly available.',
            possibleCause: 'Default server configuration not hardened for production.',
            recommendedFix: `Remove or obfuscate the "${h.label}" header. In Nginx: "server_tokens off;". In Apache: "ServerTokens Prod". In Express: "app.disable('x-powered-by')"`,
            estimatedImpact: 'Medium - Aids targeted attacks against known vulnerabilities',
            confidenceScore: 0.95,
            metadata: { cwe: ['CWE-200'] },
          }));
        }
      }
    });

    // Check for stack traces in HTML
    const stackTracePatterns = [
      /at\s+[\w.<>]+\s*\([^)]+:\d+:\d+\)/g, // JS stack trace
      /Exception in thread/g, // Java
      /Traceback \(most recent call last\)/g, // Python
      /Fatal error:/gi, // PHP
      /on line \d+/g, // PHP error
      /Microsoft OLE DB Provider/g, // ASP
    ];

    for (const pattern of stackTracePatterns) {
      if (pattern.test(html)) {
        results.push(this.createResult(context, {
          title: 'Stack Trace Visible in Page',
          description: 'Page contains what appears to be a stack trace or server-side error message.',
          severity: Severity.HIGH,
          location: { url },
          evidence: 'Stack trace pattern detected in page HTML',
          whyItMatters: 'Stack traces reveal internal file paths, function names, server architecture, and exact code locations. This information significantly accelerates targeted attacks.',
          possibleCause: 'Error handling not configured for production — debug mode enabled or exceptions not caught.',
          recommendedFix: 'Implement proper error handling. Never display stack traces to end users. Log errors server-side and show generic error pages.',
          estimatedImpact: 'High - Exposes internal application structure',
          confidenceScore: 0.85,
          metadata: { cwe: ['CWE-209'] },
        }));
        break;
      }
    }

    // Check for debug/development artifacts
    const debugPatterns = [
      { pattern: /<!--\s*debug/gi, name: 'Debug HTML comment' },
      { pattern: /console\.log\s*\([^)]*(?:password|token|secret|key|auth)/gi, name: 'Sensitive console.log' },
      { pattern: /\/\*\s*TODO.*(?:remove|cleanup|delete)\s*\*\//gi, name: 'Debug TODO comment' },
    ];

    for (const dp of debugPatterns) {
      if (dp.pattern.test(html)) {
        results.push(this.createResult(context, {
          title: `Debug Artifact: ${dp.name}`,
          description: `Found ${dp.name} in page source. Debug artifacts should be removed from production.`,
          severity: Severity.LOW,
          location: { url },
          evidence: `${dp.name} detected`,
          whyItMatters: 'Debug artifacts can expose internal logic, sensitive operations, or serve as breadcrumbs for attackers.',
          possibleCause: 'Debug code not removed before deployment.',
          recommendedFix: 'Remove all debug comments, console.log statements with sensitive data, and TODO comments referencing security-sensitive operations.',
          estimatedImpact: 'Low - Information leakage',
          confidenceScore: 0.75,
          metadata: { cwe: ['CWE-200'] },
        }));
      }
    }

    // Check for version numbers in META generator tag
    const generatorMatch = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i);
    if (generatorMatch) {
      results.push(this.createResult(context, {
        title: 'CMS/Generator Version Disclosed via Meta Tag',
        description: `Meta generator tag reveals: "${generatorMatch[1]}"`,
        severity: Severity.LOW,
        location: { url },
        evidence: `<meta name="generator" content="${generatorMatch[1]}">`,
        whyItMatters: 'Knowing the CMS name and version helps attackers look up known vulnerabilities (CVEs) targeting that version.',
        possibleCause: 'CMS default configuration includes a generator meta tag.',
        recommendedFix: 'Remove or hide the generator meta tag. In WordPress: use wp_head action to remove it. In other CMSes, check settings or use a plugin.',
        estimatedImpact: 'Low - Fingerprinting information',
        confidenceScore: 0.95,
        metadata: { cwe: ['CWE-200'] },
      }));
    }

    return results;
  }

  private containsVersion(value: string): boolean {
    return /[\d.]+/.test(value) || /nginx|apache|iis|php|asp|express|tomcat/i.test(value);
  }
}
