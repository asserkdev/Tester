import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class SubresourceIntegrityAnalyzer extends BaseAnalyzer {
  readonly id = 'subresource-integrity-analyzer';
  readonly name = 'Subresource Integrity (SRI) Analyzer';
  readonly category = AnalyzerCategory.SECURITY;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Checks for SRI hashes on externally loaded scripts and stylesheets';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    let pageOrigin = '';
    try { pageOrigin = new URL(url).hostname; } catch { return results; }

    // Find external scripts without SRI
    const scriptPattern = /<script([^>]*?)(?:src=["']([^"']+)["'])([^>]*?)>/gi;
    const externalScriptsWithoutSRI: string[] = [];
    let match;

    while ((match = scriptPattern.exec(html)) !== null) {
      const src = match[2] ?? '';
      const allAttrs = (match[1] ?? '') + (match[3] ?? '');

      if (!src) continue;
      try {
        const resourceHost = new URL(src.startsWith('http') ? src : `https://${pageOrigin}${src}`).hostname;
        if (resourceHost !== pageOrigin && !allAttrs.includes('integrity=')) {
          externalScriptsWithoutSRI.push(src);
        }
      } catch { /* skip */ }
    }

    if (externalScriptsWithoutSRI.length > 0) {
      results.push(this.createResult(context, {
        title: `${externalScriptsWithoutSRI.length} External Script(s) Without SRI Hash`,
        description: `Found ${externalScriptsWithoutSRI.length} externally-hosted script(s) loaded without Subresource Integrity hashes.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: externalScriptsWithoutSRI.slice(0, 5).join('\n'),
        whyItMatters: 'If an external script CDN is compromised, attackers can replace the file with malicious code. SRI ensures the browser rejects any file that doesn\'t match the expected cryptographic hash.',
        possibleCause: 'Scripts added from CDNs without SRI protection.',
        recommendedFix: 'Generate SRI hashes using https://www.srihash.org/ and add to each script:\n<script src="https://cdn.example.com/lib.js" integrity="sha384-hash" crossorigin="anonymous">',
        estimatedImpact: 'Medium - Supply chain attack possible via CDN compromise',
        confidenceScore: 0.85,
        metadata: { cwe: ['CWE-829', 'CWE-494'] },
      }));
    }

    // Find external stylesheets without SRI
    const stylePattern = /<link([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi;
    const externalStylesWithoutSRI: string[] = [];

    while ((match = stylePattern.exec(html)) !== null) {
      const allAttrs = (match[1] ?? '') + (match[3] ?? '');
      const href = match[2] ?? '';

      if (!allAttrs.includes('rel="stylesheet"') && !allAttrs.includes("rel='stylesheet'")) continue;
      if (!href || href.startsWith('/') || href.startsWith('.')) continue;

      try {
        const resourceHost = new URL(href).hostname;
        if (resourceHost !== pageOrigin && !allAttrs.includes('integrity=')) {
          externalStylesWithoutSRI.push(href);
        }
      } catch { /* skip */ }
    }

    if (externalStylesWithoutSRI.length > 0) {
      results.push(this.createResult(context, {
        title: `${externalStylesWithoutSRI.length} External Stylesheet(s) Without SRI Hash`,
        description: `Found ${externalStylesWithoutSRI.length} externally-hosted stylesheet(s) without SRI hashes.`,
        severity: Severity.LOW,
        location: { url },
        evidence: externalStylesWithoutSRI.slice(0, 5).join('\n'),
        whyItMatters: 'External CSS without SRI can be replaced by attackers via CDN compromise to inject malicious content or steal form data using CSS-based keyloggers.',
        possibleCause: 'Stylesheets loaded from CDN without SRI protection.',
        recommendedFix: 'Add SRI hashes to external stylesheets:\n<link rel="stylesheet" href="https://cdn.example.com/style.css" integrity="sha384-hash" crossorigin="anonymous">',
        estimatedImpact: 'Low - CSS injection possible via CDN compromise',
        confidenceScore: 0.8,
        metadata: { cwe: ['CWE-829'] },
      }));
    }

    return results;
  }
}
