import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class TechStackAnalyzer extends BaseAnalyzer {
  readonly id = 'tech-stack-analyzer';
  readonly name = 'Technology Stack Analyzer';
  readonly category = AnalyzerCategory.TECHNOLOGY;
  readonly defaultSeverity = Severity.INFO;
  readonly description = 'Detects the full technology stack including server, CMS, CDN, and analytics';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url, resources } = context.page;

    const detected: Record<string, string[]> = {
      'Server': [],
      'CMS': [],
      'CDN': [],
      'Analytics': [],
      'Payment': [],
      'Chat/Support': [],
      'Marketing': [],
      'Security': [],
    };

    // Server detection from headers
    resources.forEach(r => {
      const headers = (r as any).headers || {};
      const server = headers['server'] ?? '';
      const via = headers['via'] ?? '';
      const cf = headers['cf-ray'];
      const xServedBy = headers['x-served-by'] ?? '';

      if (server.includes('nginx')) detected['Server']?.push('Nginx');
      if (server.includes('Apache')) detected['Server']?.push('Apache');
      if (server.includes('cloudflare')) detected['Server']?.push('Cloudflare');
      if (server.includes('openresty')) detected['Server']?.push('OpenResty');
      if (cf) detected['CDN']?.push('Cloudflare');
      if (via.includes('cloudfront')) detected['CDN']?.push('CloudFront');
      if (xServedBy.includes('fastly')) detected['CDN']?.push('Fastly');
    });

    // CMS detection from HTML
    const cmsDetectors = [
      { name: 'WordPress', pattern: /wp-content|wp-includes|\.wordpress\.com/i },
      { name: 'Shopify', pattern: /\.myshopify\.com|Shopify\./i },
      { name: 'Squarespace', pattern: /squarespace\.com|\.squarespace\.com/i },
      { name: 'Wix', pattern: /\.wixsite\.com|\.wix\.com|wix\.com\/static/i },
      { name: 'Drupal', pattern: /drupal\.js|Drupal\.settings|drupal-root/i },
      { name: 'Joomla', pattern: /\/components\/com_|Joomla!/i },
      { name: 'Magento', pattern: /Magento|mage-init|magento-vars/i },
      { name: 'Ghost', pattern: /content\.ghost\.org|\/ghost\//i },
      { name: 'HubSpot', pattern: /\.hs-sites\.com|hubspot\.com\/hs-fs/i },
      { name: 'Webflow', pattern: /webflow\.js|\.webflow\.com/i },
      { name: 'Contentful', pattern: /contentful\.com/i },
      { name: 'Sanity', pattern: /sanity\.io|sanityClient/i },
    ];

    for (const cms of cmsDetectors) {
      if (cms.pattern.test(html)) {
        detected['CMS']?.push(cms.name);
      }
    }

    // Analytics detection
    const analyticsDetectors = [
      { name: 'Google Analytics 4', pattern: /gtag\(|G-[A-Z0-9]+|ga4/i },
      { name: 'Google Tag Manager', pattern: /googletagmanager\.com/i },
      { name: 'Hotjar', pattern: /hotjar\.com|hjid/i },
      { name: 'Mixpanel', pattern: /mixpanel\.com/i },
      { name: 'Amplitude', pattern: /amplitude\.com/i },
      { name: 'Segment', pattern: /segment\.com|analytics\.js/i },
      { name: 'Plausible', pattern: /plausible\.io/i },
      { name: 'Fathom', pattern: /usefathom\.com/i },
      { name: 'Matomo', pattern: /matomo\.org|piwik/i },
    ];

    for (const analytics of analyticsDetectors) {
      if (analytics.pattern.test(html)) {
        detected['Analytics']?.push(analytics.name);
      }
    }

    // Payment detection
    const paymentDetectors = [
      { name: 'Stripe', pattern: /stripe\.com\/v3|Stripe\(/i },
      { name: 'PayPal', pattern: /paypal\.com|PayPalButton/i },
      { name: 'Square', pattern: /squareup\.com|square\.js/i },
      { name: 'Braintree', pattern: /braintree\.com|braintreepayments/i },
    ];

    for (const payment of paymentDetectors) {
      if (payment.pattern.test(html)) {
        detected['Payment']?.push(payment.name);
      }
    }

    // Security tools
    const securityDetectors = [
      { name: 'reCAPTCHA', pattern: /recaptcha\.net|google\.com\/recaptcha/i },
      { name: 'hCaptcha', pattern: /hcaptcha\.com/i },
      { name: 'Cloudflare Turnstile', pattern: /turnstile\.cloudflare\.com/i },
      { name: 'Incapsula', pattern: /incapsula\.com/i },
    ];

    for (const sec of securityDetectors) {
      if (sec.pattern.test(html)) {
        detected['Security']?.push(sec.name);
      }
    }

    // Build summary
    const allDetected: string[] = [];
    for (const [category, items] of Object.entries(detected)) {
      const unique = [...new Set(items)];
      if (unique.length > 0) {
        allDetected.push(`${category}: ${unique.join(', ')}`);
      }
    }

    if (allDetected.length > 0) {
      results.push(this.createResult(context, {
        title: 'Technology Stack Report',
        description: `Detected ${allDetected.length} technology categorie(s) in use.`,
        severity: Severity.INFO,
        location: { url },
        evidence: allDetected.join('\n'),
        whyItMatters: 'Understanding the technology stack is essential for targeted security review, performance optimization, and ensuring all components are up to date.',
        possibleCause: 'N/A — informational scan.',
        recommendedFix: 'Keep all detected components updated to their latest secure versions. Review each component\'s security advisories regularly.',
        estimatedImpact: 'Info - Technology fingerprint for security review',
        confidenceScore: 0.85,
      }));
    }

    // Check for outdated CMS versions (WordPress with known vulnerable versions)
    const wpVersionMatch = html.match(/\?ver=([\d.]+)/);
    if (wpVersionMatch) {
      const version = wpVersionMatch[1] ?? '';
      const majorVersion = parseFloat(version);
      // WordPress 5.x and below are outdated (current is 6.x+)
      if (majorVersion < 5.9) {
        results.push(this.createResult(context, {
          title: `Outdated WordPress Asset Version: ${version}`,
          description: `WordPress asset detected with version ${version}. This may indicate an outdated WordPress installation.`,
          severity: Severity.MEDIUM,
          location: { url },
          evidence: `Asset version parameter: ?ver=${version}`,
          whyItMatters: 'Outdated WordPress versions have known security vulnerabilities. WordPress is the most targeted CMS by hackers.',
          possibleCause: 'WordPress installation not kept updated.',
          recommendedFix: 'Update WordPress to the latest stable version. Enable automatic updates for WordPress core, themes, and plugins.',
          estimatedImpact: 'Medium - Known CVEs may apply to this version',
          confidenceScore: 0.65,
          metadata: { cwe: ['CWE-1104'] },
        }));
      }
    }

    return results;
  }
}
