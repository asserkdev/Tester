import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class RenderBlockingAnalyzer extends BaseAnalyzer {
  readonly id = 'render-blocking-analyzer';
  readonly name = 'Render-Blocking Resources Analyzer';
  readonly category = AnalyzerCategory.PERFORMANCE;
  readonly defaultSeverity = Severity.HIGH;
  readonly description = 'Identifies render-blocking JavaScript and CSS that delay page rendering';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    // Find render-blocking scripts (in head, without async/defer)
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const headContent = headMatch ? headMatch[1] ?? '' : '';

    const blockingScripts: string[] = [];
    const scriptPattern = /<script([^>]*?)(?:src=["']([^"']+)["'])([^>]*?)>/gi;
    let match;
    while ((match = scriptPattern.exec(headContent)) !== null) {
      const attrs = (match[1] ?? '') + (match[3] ?? '');
      const src = match[2] ?? '';
      if (!attrs.includes('async') && !attrs.includes('defer') && !attrs.includes('type="module"') && src) {
        blockingScripts.push(src);
      }
    }

    if (blockingScripts.length > 0) {
      results.push(this.createResult(context, {
        title: `${blockingScripts.length} Render-Blocking Script(s) in <head>`,
        description: `Found ${blockingScripts.length} <script> tag(s) in the <head> without async or defer attributes.`,
        severity: Severity.HIGH,
        location: { url },
        evidence: blockingScripts.slice(0, 5).join('\n'),
        whyItMatters: 'Scripts in <head> without async/defer block the browser from rendering any content until the script is downloaded, parsed, and executed. Each blocking script adds directly to Time To First Byte and Largest Contentful Paint.',
        possibleCause: 'Scripts added without optimization attributes.',
        recommendedFix: 'Add "defer" to scripts that don\'t need to run before DOM is ready: <script src="..." defer>. Use "async" for independent scripts like analytics. Move non-critical scripts to just before </body>.',
        estimatedImpact: 'High - Direct impact on page load time',
        confidenceScore: 0.9,
      }));
    }

    // Find render-blocking CSS (without media query optimization)
    const blockingStyles: string[] = [];
    const stylePattern = /<link([^>]*?)rel=["']stylesheet["']([^>]*?)>/gi;
    while ((match = stylePattern.exec(headContent)) !== null) {
      const attrs = (match[1] ?? '') + (match[2] ?? '');
      const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
      const href = hrefMatch ? hrefMatch[1] ?? '' : '';
      const mediaMatch = attrs.match(/media=["']([^"']+)["']/i);
      const media = mediaMatch ? mediaMatch[1] ?? '' : 'all';

      // Only flag if it's a blocking stylesheet (media="all" or no media)
      if ((media === 'all' || media === '') && href && !href.includes('font') && !href.includes('icon')) {
        blockingStyles.push(href);
      }
    }

    if (blockingStyles.length > 2) {
      results.push(this.createResult(context, {
        title: `${blockingStyles.length} Render-Blocking Stylesheets`,
        description: `Found ${blockingStyles.length} stylesheets that block rendering. Consider consolidating or inlining critical CSS.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: blockingStyles.slice(0, 5).join('\n'),
        whyItMatters: 'Each additional CSS file is a separate HTTP request that delays the first paint. Browsers won\'t render anything until all CSS is downloaded and parsed.',
        possibleCause: 'Multiple CSS files loaded separately instead of bundled.',
        recommendedFix: 'Bundle CSS into a single file. Inline critical above-the-fold CSS. Load non-critical CSS asynchronously: <link rel="preload" as="style" onload="this.rel=\'stylesheet\'">',
        estimatedImpact: 'Medium - Delays first contentful paint',
        confidenceScore: 0.85,
      }));
    }

    // Check for font loading issues
    const fontPattern = /<link[^>]+rel=["']preload["'][^>]+as=["']font["']/gi;
    const preloadedFonts = (html.match(fontPattern) || []).length;
    const googleFontPattern = /<link[^>]+href=["'][^"']*fonts\.googleapis\.com[^"']*["']/gi;
    const googleFonts = (html.match(googleFontPattern) || []).length;

    if (googleFonts > 0 && preloadedFonts === 0) {
      results.push(this.createResult(context, {
        title: 'Google Fonts Loaded Without Preconnect',
        description: 'Page loads Google Fonts without a preconnect hint, causing unnecessary DNS and connection delays.',
        severity: Severity.MEDIUM,
        location: { url },
        evidence: `${googleFonts} Google Font stylesheet(s) without preconnect`,
        whyItMatters: 'Without preconnect, the browser waits until it encounters the Google Fonts link before starting DNS lookup and TCP connection. This adds 100-500ms depending on network.',
        possibleCause: 'Google Fonts added without performance optimization.',
        recommendedFix: 'Add preconnect hints before the Google Fonts link:\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        estimatedImpact: 'Medium - Reduced font loading delay',
        confidenceScore: 0.9,
      }));
    }

    return results;
  }
}
