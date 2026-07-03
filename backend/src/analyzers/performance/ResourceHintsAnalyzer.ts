import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class ResourceHintsAnalyzer extends BaseAnalyzer {
  readonly id = 'resource-hints-analyzer';
  readonly name = 'Resource Hints Analyzer';
  readonly category = AnalyzerCategory.PERFORMANCE;
  readonly defaultSeverity = Severity.LOW;
  readonly description = 'Checks for preload, prefetch, preconnect, and dns-prefetch resource hints';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url, resources } = context.page;

    const preloadLinks = html.match(/<link[^>]+rel=["']preload["'][^>]*>/gi) || [];
    const prefetchLinks = html.match(/<link[^>]+rel=["']prefetch["'][^>]*>/gi) || [];
    const preconnectLinks = html.match(/<link[^>]+rel=["']preconnect["'][^>]*>/gi) || [];
    const dnsPrefetchLinks = html.match(/<link[^>]+rel=["']dns-prefetch["'][^>]*>/gi) || [];

    // Detect third-party origins that should have preconnect/dns-prefetch
    let pageOrigin = '';
    try { pageOrigin = new URL(url).hostname; } catch { return results; }

    const externalDomains = new Set<string>();
    resources.forEach(r => {
      try {
        const host = new URL(r.url).hostname;
        if (host !== pageOrigin && !host.endsWith(`.${pageOrigin}`)) {
          externalDomains.add(`${new URL(r.url).protocol}//${host}`);
        }
      } catch { /* ignore */ }
    });

    const preconnectedDomains = new Set<string>();
    preconnectLinks.forEach(link => {
      const hrefMatch = link.match(/href=["']([^"']+)["']/i);
      if (hrefMatch) preconnectedDomains.add(hrefMatch[1] ?? '');
    });
    dnsPrefetchLinks.forEach(link => {
      const hrefMatch = link.match(/href=["']([^"']+)["']/i);
      if (hrefMatch) preconnectedDomains.add(hrefMatch[1] ?? '');
    });

    const unconnectedDomains = [...externalDomains].filter(d => !preconnectedDomains.has(d));

    if (unconnectedDomains.length > 2) {
      results.push(this.createResult(context, {
        title: `${unconnectedDomains.length} External Domains Without preconnect/dns-prefetch`,
        description: `Found ${unconnectedDomains.length} external domain(s) used by this page with no preconnect or dns-prefetch hints.`,
        severity: Severity.LOW,
        location: { url },
        evidence: unconnectedDomains.slice(0, 5).join('\n'),
        whyItMatters: 'Each new external domain requires a DNS lookup + TCP handshake + TLS setup (200-300ms). preconnect/dns-prefetch eliminates this latency for critical third-party origins.',
        possibleCause: 'Resource hints not optimized for third-party domains.',
        recommendedFix: `Add preconnect for critical third-party domains:\n${unconnectedDomains.slice(0, 3).map(d => `<link rel="preconnect" href="${d}">`).join('\n')}`,
        estimatedImpact: 'Low - 100-300ms per external domain load time reduced',
        confidenceScore: 0.8,
      }));
    }

    // Check for LCP image not preloaded
    const lcpImagePattern = /<img([^>]*?)(?:loading=["'](?:eager|auto)["']|[^l])[^>]*>/gi;
    const heroImages = [...html.matchAll(/<img([^>]*?)>/gi)]
      .filter(m => {
        const attrs = m[1] ?? '';
        const src = attrs.match(/src=["']([^"']+)["']/i)?.[1] ?? '';
        return src && !src.startsWith('data:') && (attrs.includes('hero') || attrs.includes('banner') || attrs.includes('cover'));
      });

    const preloadedUrls = new Set(preloadLinks.map(l => {
      const hrefMatch = l.match(/href=["']([^"']+)["']/i);
      return hrefMatch?.[1] ?? '';
    }));

    if (heroImages.length > 0) {
      const heroSrcs = heroImages.map(m => {
        const attrs = m[1] ?? '';
        return attrs.match(/src=["']([^"']+)["']/i)?.[1] ?? '';
      }).filter(Boolean);

      const unpreloadedHero = heroSrcs.filter(src => !preloadedUrls.has(src));
      if (unpreloadedHero.length > 0) {
        results.push(this.createResult(context, {
          title: 'Hero/Banner Image Not Preloaded',
          description: 'Detected a hero or banner image not preloaded with <link rel="preload">.',
          severity: Severity.MEDIUM,
          location: { url },
          evidence: unpreloadedHero[0] ?? '',
          whyItMatters: 'The hero image is typically the Largest Contentful Paint (LCP) element. Preloading it starts the download early, reducing LCP time which is a Core Web Vital metric.',
          possibleCause: 'Preload hint not added for hero image.',
          recommendedFix: `Add to <head>:\n<link rel="preload" as="image" href="${unpreloadedHero[0] ?? 'hero.jpg'}" fetchpriority="high">`,
          estimatedImpact: 'Medium - Faster LCP, better Core Web Vitals',
          confidenceScore: 0.75,
        }));
      }
    }

    return results;
  }
}
