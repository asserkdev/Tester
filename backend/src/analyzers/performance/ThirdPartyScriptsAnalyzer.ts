import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class ThirdPartyScriptsAnalyzer extends BaseAnalyzer {
  readonly id = 'third-party-scripts-analyzer';
  readonly name = 'Third-Party Scripts Analyzer';
  readonly category = AnalyzerCategory.PERFORMANCE;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Analyzes third-party scripts for performance and security impact';

  private readonly knownTrackers: Record<string, string> = {
    'google-analytics.com': 'Google Analytics',
    'googletagmanager.com': 'Google Tag Manager',
    'facebook.net': 'Facebook Pixel',
    'connect.facebook.net': 'Facebook SDK',
    'twitter.com/widgets': 'Twitter Widgets',
    'platform.twitter.com': 'Twitter Platform',
    'linkedin.com/analytics': 'LinkedIn Insight',
    'snap.licdn.com': 'LinkedIn Insight',
    'static.hotjar.com': 'Hotjar',
    'mouseflow.com': 'Mouseflow',
    'fullstory.com': 'FullStory',
    'segment.com': 'Segment',
    'amplitude.com': 'Amplitude',
    'mixpanel.com': 'Mixpanel',
    'intercom.io': 'Intercom',
    'zendesk.com': 'Zendesk',
    'drift.com': 'Drift',
    'hubspot.com': 'HubSpot',
    'marketo.com': 'Marketo',
    'pardot.com': 'Pardot',
  };

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { url, resources } = context.page;

    let pageOrigin = '';
    try {
      pageOrigin = new URL(url).hostname;
    } catch { return results; }

    const thirdPartyScripts = resources.filter(r => {
      if (r.type !== 'script') return false;
      try {
        const resourceHost = new URL(r.url).hostname;
        return resourceHost !== pageOrigin && !resourceHost.endsWith(`.${pageOrigin}`);
      } catch { return false; }
    });

    if (thirdPartyScripts.length === 0) return results;

    // Identify known trackers
    const detectedTrackers: Array<{ name: string; url: string }> = [];
    for (const script of thirdPartyScripts) {
      for (const [domain, name] of Object.entries(this.knownTrackers)) {
        if (script.url.includes(domain)) {
          detectedTrackers.push({ name, url: script.url });
          break;
        }
      }
    }

    // Total third-party script size
    const totalThirdPartySize = thirdPartyScripts.reduce((sum, s) => sum + (s.size || 0), 0);
    const thirdPartyCount = thirdPartyScripts.length;

    if (thirdPartyCount > 5) {
      results.push(this.createResult(context, {
        title: `High Third-Party Script Count: ${thirdPartyCount} Scripts`,
        description: `Page loads ${thirdPartyCount} scripts from external domains, totaling ${Math.round(totalThirdPartySize / 1024)}KB.`,
        severity: thirdPartyCount > 10 ? Severity.HIGH : Severity.MEDIUM,
        location: { url },
        evidence: thirdPartyScripts.slice(0, 5).map(s => s.url).join('\n'),
        whyItMatters: 'Each third-party script adds a DNS lookup, TCP connection, TLS handshake, and download time. Third-party servers can be slow or unavailable, blocking your page. They also introduce security risks (supply chain attacks).',
        possibleCause: 'Multiple analytics, marketing, chat, and advertising tools loaded individually.',
        recommendedFix: 'Audit all third-party scripts and remove unused ones. Consolidate analytics into a single tag manager. Load non-critical scripts with defer or async. Consider server-side analytics.',
        estimatedImpact: 'High - Each third-party script is a potential bottleneck',
        confidenceScore: 0.9,
      }));
    }

    if (detectedTrackers.length > 0) {
      results.push(this.createResult(context, {
        title: `${detectedTrackers.length} Tracking Script(s) Detected`,
        description: `Found: ${detectedTrackers.map(t => t.name).join(', ')}`,
        severity: Severity.INFO,
        location: { url },
        evidence: detectedTrackers.map(t => `${t.name}: ${t.url}`).join('\n'),
        whyItMatters: 'Tracking scripts collect user data and must be disclosed in your privacy policy. Some may be subject to GDPR, CCPA, or other privacy regulations requiring user consent.',
        possibleCause: 'Analytics, advertising, and CRO tools installed.',
        recommendedFix: 'Ensure your privacy policy lists all tracking tools. Implement a cookie consent banner that delays tracking script loading until consent is granted.',
        estimatedImpact: 'Info - Privacy compliance consideration',
        confidenceScore: 0.9,
      }));
    }

    // Check for synchronous loading of large third-party scripts
    const { html } = context.page;
    for (const tracker of detectedTrackers) {
      const escapedUrl = tracker.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const syncPattern = new RegExp(`<script[^>]*src=["']${escapedUrl}["'][^>]*>`, 'i');
      const scriptTag = html.match(syncPattern)?.[0] ?? '';
      if (scriptTag && !scriptTag.includes('async') && !scriptTag.includes('defer')) {
        results.push(this.createResult(context, {
          title: `Synchronous Third-Party Script: ${tracker.name}`,
          description: `${tracker.name} script is loaded synchronously, blocking page rendering.`,
          severity: Severity.MEDIUM,
          location: { url },
          evidence: tracker.url,
          whyItMatters: `If ${tracker.name}'s servers are slow, your entire page is blocked until their script loads. This is a single point of failure for your page performance.`,
          possibleCause: 'Default vendor integration code.',
          recommendedFix: `Add "async" or "defer" to the ${tracker.name} script tag. Most analytics and marketing scripts support async loading.`,
          estimatedImpact: 'Medium - Third-party slowness blocks your page',
          confidenceScore: 0.85,
        }));
        break; // Only report once
      }
    }

    return results;
  }
}
