import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class ServiceWorkerAnalyzer extends BaseAnalyzer {
  readonly id = 'service-worker-analyzer';
  readonly name = 'Service Worker Analyzer';
  readonly category = AnalyzerCategory.PWA;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Checks for Service Worker registration and offline capability';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url, resources } = context.page;

    // Check for service worker registration
    const swPattern = /navigator\.serviceWorker\.register\s*\(/g;
    const hasSWRegistration = swPattern.test(html);

    // Check for SW resource
    const swResource = resources.find(r =>
      r.url.includes('sw.js') ||
      r.url.includes('service-worker.js') ||
      r.url.includes('serviceworker.js') ||
      r.url.includes('sw-precache') ||
      r.url.includes('workbox')
    );

    if (!hasSWRegistration && !swResource) {
      results.push(this.createResult(context, {
        title: 'No Service Worker Detected',
        description: 'Page does not register a Service Worker, missing offline capability and advanced caching.',
        severity: Severity.INFO,
        location: { url },
        whyItMatters: 'Without a Service Worker, the site cannot work offline, cannot cache resources efficiently for repeat visits, and cannot receive push notifications.',
        possibleCause: 'Service Worker not implemented.',
        recommendedFix: 'Add a Service Worker using Workbox (recommended) or write one manually. Register it: navigator.serviceWorker.register("/sw.js")',
        estimatedImpact: 'Info - Site not PWA-capable',
        confidenceScore: 0.8,
      }));
    }

    // Check for HTTPS requirement (SW only works on HTTPS)
    if (hasSWRegistration && url.startsWith('http://') && !url.includes('localhost')) {
      results.push(this.createResult(context, {
        title: 'Service Worker Registered on Non-HTTPS Origin',
        description: 'Service Worker is registered but the site is served over HTTP, not HTTPS.',
        severity: Severity.CRITICAL,
        location: { url },
        whyItMatters: 'Service Workers only work on HTTPS origins (and localhost for development). On HTTP, the registration will silently fail.',
        possibleCause: 'HTTPS not configured while SW has been implemented.',
        recommendedFix: 'Migrate the site to HTTPS. Service Workers require a secure context to function.',
        estimatedImpact: 'Critical - Service Worker silently disabled on HTTP',
        confidenceScore: 0.95,
      }));
    }

    // Check for offline fallback page
    const offlineFallbackPatterns = [
      /offline/i,
      /fallback/i,
      /no-internet/i,
    ];
    const hasOfflineFallback = offlineFallbackPatterns.some(p => p.test(html));

    if (hasSWRegistration && !hasOfflineFallback) {
      results.push(this.createResult(context, {
        title: 'Service Worker Without Offline Fallback Page',
        description: 'Service Worker detected but no offline fallback page configured.',
        severity: Severity.LOW,
        location: { url },
        whyItMatters: 'Without an offline fallback, users with no internet connection see the browser\'s default error page instead of a branded offline experience.',
        possibleCause: 'Service Worker implemented for caching only, not offline support.',
        recommendedFix: 'Add an offline.html fallback page and configure your SW to serve it when the network is unavailable.',
        estimatedImpact: 'Low - Poor offline user experience',
        confidenceScore: 0.6,
      }));
    }

    return results;
  }
}
