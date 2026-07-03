import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class SkipLinksAnalyzer extends BaseAnalyzer {
  readonly id = 'skip-links-analyzer';
  readonly name = 'Landmark Regions & Skip Links Analyzer';
  readonly category = AnalyzerCategory.ACCESSIBILITY;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Validates HTML landmark regions, main content area, and skip link targets';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    // Check for main landmark
    const hasMain = /<main\b/i.test(html) || /role=["']main["']/i.test(html);
    if (!hasMain) {
      results.push(this.createResult(context, {
        title: 'Missing <main> Landmark Element',
        description: 'Page has no <main> element or role="main" to identify the main content area.',
        severity: Severity.HIGH,
        location: { url },
        whyItMatters: 'The <main> element is a critical landmark that allows screen reader users to jump directly to the main content, bypassing repeated navigation. Without it, screen reader users must navigate through every header, nav item, and banner to reach content.',
        possibleCause: 'Main content wrapped in <div> instead of <main>.',
        recommendedFix: 'Wrap the main page content in a <main id="main-content"> element. Ensure there is only one <main> per page.',
        estimatedImpact: 'High - Screen reader users cannot jump to main content',
        confidenceScore: 0.9,
        metadata: { wcagCriteria: ['1.3.6', '2.4.1'] },
      }));
    }

    // Check for header landmark
    const hasHeader = /<header\b/i.test(html) || /role=["']banner["']/i.test(html);
    if (!hasHeader) {
      results.push(this.createResult(context, {
        title: 'Missing <header>/Banner Landmark',
        description: 'Page has no <header> element or role="banner" for the site header.',
        severity: Severity.LOW,
        location: { url },
        whyItMatters: 'The header/banner landmark allows screen reader users to quickly identify and navigate to the site header.',
        possibleCause: 'Header wrapped in <div> without semantic HTML.',
        recommendedFix: 'Use <header> for the site-wide header. It automatically has role="banner" when a direct child of <body>.',
        estimatedImpact: 'Low - Landmark navigation degraded',
        confidenceScore: 0.8,
        metadata: { wcagCriteria: ['1.3.6'] },
      }));
    }

    // Check for footer landmark
    const hasFooter = /<footer\b/i.test(html) || /role=["']contentinfo["']/i.test(html);
    if (!hasFooter) {
      results.push(this.createResult(context, {
        title: 'Missing <footer>/Contentinfo Landmark',
        description: 'Page has no <footer> element or role="contentinfo" for the site footer.',
        severity: Severity.LOW,
        location: { url },
        whyItMatters: 'The footer/contentinfo landmark helps screen reader users find copyright information, privacy policies, and footer navigation.',
        possibleCause: 'Footer wrapped in <div> without semantic HTML.',
        recommendedFix: 'Use <footer> for the site-wide footer. It automatically has role="contentinfo" when a direct child of <body>.',
        estimatedImpact: 'Low - Landmark navigation degraded',
        confidenceScore: 0.8,
        metadata: { wcagCriteria: ['1.3.6'] },
      }));
    }

    // Check for multiple main elements
    const mainCount = (html.match(/<main\b/gi) || []).length;
    if (mainCount > 1) {
      results.push(this.createResult(context, {
        title: `Multiple <main> Elements (${mainCount})`,
        description: `Found ${mainCount} <main> elements. Only one is allowed per page.`,
        severity: Severity.HIGH,
        location: { url },
        evidence: `${mainCount} <main> elements found`,
        whyItMatters: 'Multiple <main> elements violate the HTML spec and confuse screen readers. Only one main landmark should exist per page.',
        possibleCause: 'Component system or template accidentally renders multiple main elements.',
        recommendedFix: 'Ensure only one <main> element exists per page. Use <section> or <article> for other content areas.',
        estimatedImpact: 'High - HTML invalid, screen readers confused',
        confidenceScore: 0.95,
        metadata: { wcagCriteria: ['1.3.6'] },
      }));
    }

    // Check that skip link target exists
    const skipLinkPattern = /<a[^>]*href=["']#([\w-]+)["'][^>]*>/gi;
    const allLinks: string[] = [];
    let match;
    while ((match = skipLinkPattern.exec(html)) !== null) {
      if ((match[0] ?? '').toLowerCase().includes('skip') || (match[0] ?? '').toLowerCase().includes('main')) {
        allLinks.push(match[1] ?? '');
      }
    }

    for (const targetId of allLinks) {
      const targetPattern = new RegExp(`id=["']${targetId}["']`, 'i');
      if (!targetPattern.test(html)) {
        results.push(this.createResult(context, {
          title: `Skip Link Target "#${targetId}" Not Found`,
          description: `Skip link points to #${targetId} but no element with that ID exists.`,
          severity: Severity.HIGH,
          location: { url },
          evidence: `href="#${targetId}" — no id="${targetId}" found`,
          whyItMatters: 'A broken skip link target causes keyboard users to be trapped: the browser focuses nowhere (or the top of the page) when the skip link is activated.',
          possibleCause: 'Skip link added but target element ID is wrong or missing.',
          recommendedFix: `Add id="${targetId}" to the main content element: <main id="${targetId}">`,
          estimatedImpact: 'High - Skip link non-functional for keyboard users',
          confidenceScore: 0.9,
          metadata: { wcagCriteria: ['2.4.1'] },
        }));
      }
    }

    return results;
  }
}
