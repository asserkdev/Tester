import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class FontLoadingAnalyzer extends BaseAnalyzer {
  readonly id = 'font-loading-analyzer';
  readonly name = 'Font Loading Analyzer';
  readonly category = AnalyzerCategory.PERFORMANCE;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Analyzes web font loading strategy, FOIT/FOUT, and font performance optimization';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url, resources } = context.page;

    // Find font resources
    const fontResources = resources.filter(r =>
      r.type === 'font' ||
      r.url.match(/\.(woff2?|ttf|otf|eot)(\?|$)/i)
    );

    const googleFontLinks = (html.match(/<link[^>]+fonts\.googleapis\.com[^>]*>/gi) || []);
    const hasPreconnect = html.includes('preconnect');
    const hasGoogleFontsPreconnect = /rel=["']preconnect["'][^>]*fonts\.g(?:oogledapis|static)\.com/i.test(html) ||
                                      /fonts\.g(?:oogledapis|static)\.com[^>]*rel=["']preconnect["']/i.test(html);

    // Google Fonts without preconnect
    if (googleFontLinks.length > 0 && !hasGoogleFontsPreconnect) {
      results.push(this.createResult(context, {
        title: 'Google Fonts Without Preconnect Hints',
        description: `${googleFontLinks.length} Google Fonts stylesheet(s) loaded without preconnect hints.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: `${googleFontLinks.length} Google Fonts links without preconnect`,
        whyItMatters: 'Google Fonts requires connections to two domains (fonts.googleapis.com and fonts.gstatic.com). Without preconnect, each DNS lookup and TCP connection happens sequentially, adding 200-600ms.',
        possibleCause: 'Default Google Fonts embed code without optimization.',
        recommendedFix: 'Add preconnect hints BEFORE the Google Fonts link tag:\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        estimatedImpact: 'Medium - Fonts delayed 200-600ms without preconnect',
        confidenceScore: 0.9,
      }));
    }

    // Check for font-display property (FOIT prevention)
    const hasFontDisplay = html.includes('font-display') ||
                           resources.some(r => r.type === 'font' && (r as any).headers?.['font-display']);

    if (fontResources.length > 0 && !hasFontDisplay) {
      results.push(this.createResult(context, {
        title: 'Fonts Missing font-display Property',
        description: `${fontResources.length} font resource(s) loaded without font-display CSS property.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: `${fontResources.length} fonts, no font-display CSS property detected`,
        whyItMatters: 'Without font-display, browsers use "auto" which usually causes FOIT (Flash Of Invisible Text) — all text becomes invisible until fonts load. This can cause visible text to be missing for 3+ seconds on slow connections.',
        possibleCause: 'font-display not specified in @font-face declarations.',
        recommendedFix: 'Add font-display to @font-face rules:\n@font-face {\n  font-family: \'MyFont\';\n  src: url(...);\n  font-display: swap; /* Shows fallback immediately, swaps when font loads */\n}',
        estimatedImpact: 'Medium - Text invisible until fonts load (FOIT)',
        confidenceScore: 0.8,
      }));
    }

    // Count total font variants (too many slow down page)
    if (fontResources.length > 6) {
      results.push(this.createResult(context, {
        title: `Too Many Font Files: ${fontResources.length} Variants`,
        description: `Page loads ${fontResources.length} font files. Each is a separate network request.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: fontResources.slice(0, 5).map(r => r.url).join('\n'),
        whyItMatters: 'Each font variant (regular, bold, italic, different weights) is a separate file that must be downloaded. Loading 8+ font variants adds significant load time and bandwidth.',
        possibleCause: 'Multiple font families and weights loaded without subsetting.',
        recommendedFix: 'Limit to 2-3 font variants per family. Use variable fonts (one file covers all weights). Subset fonts to only include characters used on your site.',
        estimatedImpact: 'Medium - High font bandwidth and requests',
        confidenceScore: 0.85,
      }));
    }

    // Check for font file formats (prefer WOFF2)
    const nonWoff2Fonts = fontResources.filter(r => !r.url.match(/\.woff2(\?|$)/i));
    if (nonWoff2Fonts.length > 0 && fontResources.filter(r => r.url.match(/\.woff2(\?|$)/i)).length === 0) {
      results.push(this.createResult(context, {
        title: 'Fonts Not Using WOFF2 Format',
        description: `${nonWoff2Fonts.length} font(s) served in non-WOFF2 format. WOFF2 offers 30% better compression.`,
        severity: Severity.LOW,
        location: { url },
        evidence: nonWoff2Fonts.slice(0, 3).map(r => r.url).join('\n'),
        whyItMatters: 'WOFF2 uses Brotli compression and provides 20-30% smaller file sizes compared to WOFF. All modern browsers support it. TTF/OTF files are up to 2x larger.',
        possibleCause: 'Older font format used without converting to WOFF2.',
        recommendedFix: 'Convert fonts to WOFF2 using online tools like Transfonter or Font Squirrel. Serve WOFF2 as the primary format with WOFF as fallback.',
        estimatedImpact: 'Low - 20-30% font file size reduction',
        confidenceScore: 0.85,
      }));
    }

    return results;
  }
}
