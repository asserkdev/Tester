import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class PrivacyAnalyzer extends BaseAnalyzer {
  readonly id = 'privacy-analyzer';
  readonly name = 'Privacy & GDPR Compliance Analyzer';
  readonly category = AnalyzerCategory.PRIVACY;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Checks for privacy policy, cookie consent, tracking scripts, and GDPR compliance signals';

  private readonly trackingDomains = [
    'google-analytics.com', 'googletagmanager.com', 'facebook.net',
    'connect.facebook.net', 'twitter.com', 'linkedin.com', 'doubleclick.net',
    'googlesyndication.com', 'hotjar.com', 'mixpanel.com', 'segment.io',
    'amplitude.com', 'intercom.io', 'clarity.ms', 'mouseflow.com',
  ];

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url, resources } = context.page;

    const htmlLower = html.toLowerCase();

    // Check for cookie consent / CMP
    const consentPatterns = [
      /cookie\s*consent/i, /cookie\s*banner/i, /cookie\s*notice/i,
      /gdpr/i, /ccpa/i, /cookiebot/i, /onetrust/i, /cookieyees/i,
      /trustpilot.*privacy/i, /iubenda/i, /osano/i, /consentmanager/i,
      /cookie-law/i, /cookie_accept/i,
    ];
    const hasCookieConsent = consentPatterns.some(p => p.test(html));

    // Check for tracking scripts
    const hasTrackers = resources.some(r =>
      this.trackingDomains.some(domain => r.url.includes(domain))
    );

    if (hasTrackers && !hasCookieConsent) {
      results.push(this.createResult(context, {
        title: 'Tracking Scripts Without Cookie Consent Banner',
        description: 'Page loads tracking/analytics scripts but shows no cookie consent mechanism.',
        severity: Severity.HIGH,
        location: { url },
        evidence: resources.filter(r => this.trackingDomains.some(d => r.url.includes(d))).slice(0, 3).map(r => r.url).join('\n'),
        whyItMatters: 'Under GDPR (EU), LGPD (Brazil), and CCPA (California), you must obtain user consent before activating tracking scripts. Violations can result in large fines (up to 4% of global revenue under GDPR).',
        possibleCause: 'Cookie consent mechanism not implemented or not detected.',
        recommendedFix: 'Implement a GDPR-compliant cookie consent manager (CookieBot, OneTrust, Osano). Load tracking scripts only after consent is granted.',
        estimatedImpact: 'High - Regulatory compliance risk',
        confidenceScore: 0.8,
        metadata: { cwe: ['CWE-359'] },
      }));
    }

    // Check for privacy policy link
    const privacyPatterns = [/privacy\s*policy/i, /datenschutz/i, /política\s*de\s*privacidad/i, /privacy-policy/i, /private-policy/i];
    const hasPrivacyPolicy = privacyPatterns.some(p => p.test(html));

    if (!hasPrivacyPolicy) {
      results.push(this.createResult(context, {
        title: 'No Privacy Policy Link Detected',
        description: 'Page does not appear to link to a privacy policy.',
        severity: Severity.MEDIUM,
        location: { url },
        whyItMatters: 'A privacy policy is legally required in most jurisdictions if you collect any user data (even analytics). Websites without one risk regulatory action.',
        possibleCause: 'Privacy policy not created or not linked prominently.',
        recommendedFix: 'Create a privacy policy describing what data you collect and why. Link to it in your footer and near any data collection points (forms, newsletter signups).',
        estimatedImpact: 'Medium - Legal compliance risk',
        confidenceScore: 0.75,
      }));
    }

    // Check for fingerprinting APIs
    const fingerprintingAPIs = [
      { api: 'canvas.toDataURL', desc: 'Canvas fingerprinting' },
      { api: 'AudioContext', desc: 'Audio fingerprinting' },
      { api: 'navigator.plugins', desc: 'Plugin fingerprinting' },
      { api: 'navigator.mediaDevices', desc: 'Media device enumeration' },
      { api: 'getBattery', desc: 'Battery API fingerprinting' },
    ];

    for (const fp of fingerprintingAPIs) {
      if (html.includes(fp.api)) {
        results.push(this.createResult(context, {
          title: `Potential Browser Fingerprinting: ${fp.desc}`,
          description: `Page uses ${fp.api} which is associated with browser fingerprinting techniques.`,
          severity: Severity.MEDIUM,
          location: { url },
          evidence: fp.api,
          whyItMatters: 'Browser fingerprinting tracks users without cookies, bypassing consent mechanisms. This is increasingly regulated and privacy-invasive.',
          possibleCause: `${fp.api} used for tracking or embedded in a third-party script.`,
          recommendedFix: 'Audit whether this API is used for tracking purposes. Ensure usage is disclosed in your privacy policy and covered by your consent mechanism.',
          estimatedImpact: 'Medium - Privacy regulation risk',
          confidenceScore: 0.65,
          metadata: { cwe: ['CWE-359'] },
        }));
      }
    }

    // Check for cross-site data sharing indicators
    const pixelPatterns = resources.filter(r =>
      r.url.includes('pixel') ||
      r.url.includes('/p?') ||
      r.url.includes('conversion') ||
      r.url.includes('beacon')
    );

    if (pixelPatterns.length > 0) {
      results.push(this.createResult(context, {
        title: `${pixelPatterns.length} Tracking Pixel(s) Detected`,
        description: `Found ${pixelPatterns.length} tracking pixel(s) that send user data to third parties.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: pixelPatterns.slice(0, 3).map(r => r.url).join('\n'),
        whyItMatters: 'Tracking pixels share user behavior data with third parties. Under privacy regulations, this requires disclosure and often user consent.',
        possibleCause: 'Marketing pixel integrations.',
        recommendedFix: 'Disclose all tracking pixels in your privacy policy. Load them only after obtaining user consent through your CMP.',
        estimatedImpact: 'Medium - Privacy compliance requirement',
        confidenceScore: 0.8,
      }));
    }

    return results;
  }
}
