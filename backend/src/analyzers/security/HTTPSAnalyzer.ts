import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class HTTPSAnalyzer extends BaseAnalyzer {
  readonly id = 'https-analyzer';
  readonly name = 'HTTPS & Mixed Content Analyzer';
  readonly category = AnalyzerCategory.SECURITY;
  readonly defaultSeverity = Severity.HIGH;
  readonly description = 'Validates HTTPS usage and detects mixed content vulnerabilities';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { url, html, resources } = context.page;

    // Check if the site uses HTTPS
    if (url.startsWith('http://')) {
      results.push(this.createResult(context, {
        title: 'Site Not Using HTTPS',
        description: 'The website is served over HTTP instead of HTTPS, leaving all traffic unencrypted.',
        severity: Severity.CRITICAL,
        location: { url },
        whyItMatters: 'HTTP transmits data in plaintext. Attackers can intercept credentials, session tokens, and personal data (man-in-the-middle attacks). Google also penalizes non-HTTPS sites in search rankings.',
        possibleCause: 'SSL/TLS certificate not installed, or server not configured to serve HTTPS.',
        recommendedFix: 'Obtain a free SSL certificate from Let\'s Encrypt and configure your server to redirect all HTTP traffic to HTTPS.',
        estimatedImpact: 'Critical - All user data is exposed',
        confidenceScore: 1.0,
        metadata: { cwe: ['CWE-311', 'CWE-319'] },
      }));
    }

    // Detect mixed content (HTTP resources on HTTPS page)
    if (url.startsWith('https://')) {
      const httpResources = resources.filter(r =>
        r.url.startsWith('http://') && !r.url.startsWith('http://localhost')
      );

      const scriptMixed = httpResources.filter(r => r.type === 'script');
      const styleMixed = httpResources.filter(r => r.type === 'style');
      const imageMixed = httpResources.filter(r => r.type === 'image');
      const otherMixed = httpResources.filter(r => !['script', 'style', 'image'].includes(r.type));

      scriptMixed.forEach(r => {
        results.push(this.createResult(context, {
          title: 'Mixed Content: HTTP Script on HTTPS Page',
          description: `Active mixed content: JavaScript file loaded over HTTP on an HTTPS page.`,
          severity: Severity.CRITICAL,
          location: { url: r.url },
          evidence: r.url,
          whyItMatters: 'Browsers block active mixed content (scripts). This script may not load at all, breaking functionality. Even if it loads, it can be tampered with by attackers.',
          possibleCause: 'Script URL hardcoded with http:// scheme.',
          recommendedFix: `Change the script src to use https:// or a protocol-relative URL (//): ${r.url.replace('http://', '//')}`,
          estimatedImpact: 'Critical - Script may be blocked or hijacked',
          confidenceScore: 0.95,
          metadata: { cwe: ['CWE-319', 'CWE-829'] },
        }));
      });

      styleMixed.forEach(r => {
        results.push(this.createResult(context, {
          title: 'Mixed Content: HTTP Stylesheet on HTTPS Page',
          description: `Active mixed content: CSS file loaded over HTTP on an HTTPS page.`,
          severity: Severity.HIGH,
          location: { url: r.url },
          evidence: r.url,
          whyItMatters: 'Browsers may block mixed CSS. Styles may not apply, breaking the layout.',
          possibleCause: 'Stylesheet URL hardcoded with http:// scheme.',
          recommendedFix: `Change the stylesheet href to https://: ${r.url.replace('http://', 'https://')}`,
          estimatedImpact: 'High - Styles may be blocked',
          confidenceScore: 0.95,
          metadata: { cwe: ['CWE-319'] },
        }));
      });

      if (imageMixed.length > 0) {
        results.push(this.createResult(context, {
          title: `Mixed Content: ${imageMixed.length} HTTP Image(s) on HTTPS Page`,
          description: `Passive mixed content: ${imageMixed.length} image(s) loaded over HTTP.`,
          severity: Severity.MEDIUM,
          location: { url },
          evidence: imageMixed.slice(0, 3).map(r => r.url).join('\n'),
          whyItMatters: 'HTTP images can be swapped by attackers (image replacement attacks). Browsers show a "Not Fully Secure" warning.',
          possibleCause: 'Image URLs hardcoded with http:// scheme.',
          recommendedFix: 'Update all image src attributes to use https:// URLs.',
          estimatedImpact: 'Medium - Security warning shown to users',
          confidenceScore: 0.9,
          metadata: { cwe: ['CWE-319'] },
        }));
      }

      if (otherMixed.length > 0) {
        results.push(this.createResult(context, {
          title: `Mixed Content: ${otherMixed.length} Other HTTP Resource(s)`,
          description: `Mixed content detected: ${otherMixed.length} non-image, non-script resources loaded over HTTP.`,
          severity: Severity.MEDIUM,
          location: { url },
          evidence: otherMixed.slice(0, 3).map(r => `${r.type}: ${r.url}`).join('\n'),
          whyItMatters: 'Mixed content degrades the security of the HTTPS connection.',
          possibleCause: 'Resource URLs hardcoded with http:// scheme.',
          recommendedFix: 'Update all resource URLs to use https://.',
          estimatedImpact: 'Medium - Partial page security degraded',
          confidenceScore: 0.9,
        }));
      }
    }

    // Check for HTTP links in HTML (potential upgrade needed)
    const httpLinkPattern = /href=["'](http:\/\/[^"']+)["']/gi;
    const httpLinks: string[] = [];
    let match;
    while ((match = httpLinkPattern.exec(html)) !== null) {
      const href = match[1] ?? '';
      if (!href.includes('localhost') && !href.includes('127.0.0.1')) {
        httpLinks.push(href);
      }
    }

    if (httpLinks.length > 0 && url.startsWith('https://')) {
      results.push(this.createResult(context, {
        title: `${httpLinks.length} Outbound Links Use HTTP`,
        description: `Found ${httpLinks.length} anchor links pointing to HTTP (non-secure) destinations.`,
        severity: Severity.LOW,
        location: { url },
        evidence: httpLinks.slice(0, 3).join('\n'),
        whyItMatters: 'Linking to HTTP destinations can expose users navigating away from your site to insecure connections.',
        possibleCause: 'External link URLs not updated to HTTPS.',
        recommendedFix: 'Update outbound links to use https:// where the destination supports it.',
        estimatedImpact: 'Low - Affects users navigating to linked sites',
        confidenceScore: 0.8,
      }));
    }

    return results;
  }
}
