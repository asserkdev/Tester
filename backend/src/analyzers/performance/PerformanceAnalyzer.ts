import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class PerformanceAnalyzer extends BaseAnalyzer {
  readonly id = 'performance-analyzer';
  readonly name = 'Performance Analyzer';
  readonly category = AnalyzerCategory.PERFORMANCE;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Analyzes Core Web Vitals and performance metrics';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { performanceMetrics, resources, url } = context.page;

    if (performanceMetrics?.largestContentfulPaint) {
      const lcp = performanceMetrics.largestContentfulPaint / 1000;
      if (lcp > 4) {
        results.push(this.createResult(context, {
          title: 'Poor Largest Contentful Paint (LCP)',
          description: `LCP time is ${lcp.toFixed(2)}s, exceeding the recommended 4s threshold.`,
          severity: lcp > 6 ? Severity.HIGH : Severity.MEDIUM,
          location: { url },
          evidence: `LCP: ${lcp.toFixed(2)}s`,
          whyItMatters: 'Slow LCP directly impacts user experience and is a Google ranking factor.',
          possibleCause: 'Large images, slow server response, or render-blocking resources.',
          recommendedFix: 'Optimize images, use CDN, implement lazy loading, or reduce server response time.',
          estimatedImpact: 'High - Core Web Vital metric',
          confidenceScore: 0.9,
        }));
      }
    }

    if (performanceMetrics?.cumulativeLayoutShift) {
      const cls = performanceMetrics.cumulativeLayoutShift;
      if (cls > 0.25) {
        results.push(this.createResult(context, {
          title: 'Poor Cumulative Layout Shift (CLS)',
          description: `CLS score is ${cls.toFixed(3)}, exceeding the recommended 0.25 threshold.`,
          severity: cls > 0.5 ? Severity.HIGH : Severity.MEDIUM,
          location: { url },
          evidence: `CLS: ${cls.toFixed(3)}`,
          whyItMatters: 'Unexpected layout shifts frustrate users and can cause accidental clicks.',
          possibleCause: 'Images without dimensions, dynamic content loading, or late-loading fonts.',
          recommendedFix: 'Set explicit width and height for images, reserve space for ads, avoid injecting content above existing content.',
          estimatedImpact: 'High - Core Web Vital metric',
          confidenceScore: 0.9,
        }));
      }
    }

    const largeResources = resources.filter((r) => r.size > 1000000);
    largeResources.forEach((resource) => {
      results.push(this.createResult(context, {
        title: 'Large Resource Detected',
        description: `Resource exceeds 1MB in size.`,
        severity: Severity.MEDIUM,
        location: { url: resource.url },
        evidence: `Size: ${(resource.size / 1024 / 1024).toFixed(2)}MB`,
        whyItMatters: 'Large resources slow down page load and increase bandwidth usage.',
        possibleCause: 'Unoptimized images, uncompressed files, or excessive inline content.',
        recommendedFix: 'Compress images, enable gzip/brotli, use modern formats like WebP.',
        estimatedImpact: 'Medium - Affects load time',
        confidenceScore: 0.95,
      }));
    });

    return results;
  }
}
