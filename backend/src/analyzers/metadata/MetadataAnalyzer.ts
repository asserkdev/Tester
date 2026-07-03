import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class MetadataAnalyzer extends BaseAnalyzer {
  readonly id = 'metadata-analyzer';
  readonly name = 'Comprehensive Metadata Analyzer';
  readonly category = AnalyzerCategory.METADATA;
  readonly defaultSeverity = Severity.LOW;
  readonly description = 'Analyzes all HTML meta tags, Open Graph, Twitter Cards, and document metadata';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url, metadata } = context.page;

    // Check charset declaration
    if (!html.match(/<meta[^>]+charset/i)) {
      results.push(this.createResult(context, {
        title: 'Missing Charset Declaration',
        description: 'Page has no <meta charset> declaration.',
        severity: Severity.MEDIUM,
        location: { url },
        whyItMatters: 'Without a charset declaration, browsers may guess the encoding incorrectly, potentially displaying garbled text or creating XSS vulnerabilities via charset sniffing.',
        possibleCause: 'Charset declaration omitted.',
        recommendedFix: 'Add as the first element in <head>: <meta charset="UTF-8">',
        estimatedImpact: 'Medium - Encoding issues possible',
        confidenceScore: 0.95,
        metadata: { cwe: ['CWE-116'] },
      }));
    }

    // Check lang attribute on html element
    if (!html.match(/<html[^>]+lang=["'][^"']+["']/i)) {
      results.push(this.createResult(context, {
        title: 'Missing lang Attribute on <html> Element',
        description: 'The <html> element has no lang attribute.',
        severity: Severity.MEDIUM,
        location: { url },
        whyItMatters: 'Screen readers use the lang attribute to select the correct language voice and pronunciation. Without it, assistive technology may mispronounce content. This also fails WCAG 3.1.1.',
        possibleCause: 'lang attribute not added during development.',
        recommendedFix: 'Add lang to the html element: <html lang="en"> (use appropriate ISO 639-1 language code)',
        estimatedImpact: 'Medium - Screen readers may use wrong language voice',
        confidenceScore: 0.95,
        metadata: { wcagCriteria: ['3.1.1'] },
      }));
    }

    // Check for duplicate meta tags
    const metaNamePattern = /<meta[^>]+name=["']([^"']+)["']/gi;
    const metaNames: Record<string, number> = {};
    let match;
    while ((match = metaNamePattern.exec(html)) !== null) {
      const name = (match[1] ?? '').toLowerCase();
      metaNames[name] = (metaNames[name] || 0) + 1;
    }

    const duplicateMetas = Object.entries(metaNames).filter(([, count]) => count > 1);
    if (duplicateMetas.length > 0) {
      results.push(this.createResult(context, {
        title: `Duplicate Meta Tags: ${duplicateMetas.map(([n]) => n).join(', ')}`,
        description: `Found ${duplicateMetas.length} meta tag name(s) that appear multiple times.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: duplicateMetas.map(([n, c]) => `"${n}" appears ${c} times`).join('\n'),
        whyItMatters: 'Duplicate meta tags create ambiguity. Search engines and browsers pick one arbitrarily, often not the intended one. For description tags, this wastes the click-through opportunity.',
        possibleCause: 'Multiple plugins or templates each adding their own meta tags.',
        recommendedFix: 'Remove duplicate meta tags and keep only one of each name per page.',
        estimatedImpact: 'Medium - SEO signals diluted',
        confidenceScore: 0.9,
      }));
    }

    // Check Twitter Card tags
    if (!html.match(/<meta[^>]+name=["']twitter:card["']/i)) {
      results.push(this.createResult(context, {
        title: 'Missing Twitter Card Meta Tags',
        description: 'Page has no Twitter Card meta tags for rich Twitter previews.',
        severity: Severity.LOW,
        location: { url },
        whyItMatters: 'Without Twitter Card tags, shared links on Twitter show a plain URL with no image or description. Tweets with cards get significantly higher engagement.',
        possibleCause: 'Twitter Card tags not implemented.',
        recommendedFix: 'Add Twitter Card tags:\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="...">\n<meta name="twitter:description" content="...">\n<meta name="twitter:image" content="...">',
        estimatedImpact: 'Low - Reduced Twitter engagement',
        confidenceScore: 0.85,
      }));
    }

    // Check for OG image dimensions
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogImageMatch && !html.match(/<meta[^>]+property=["']og:image:width["']/i)) {
      results.push(this.createResult(context, {
        title: 'OG Image Missing Width/Height Meta Tags',
        description: 'Open Graph image specified without og:image:width and og:image:height.',
        severity: Severity.LOW,
        location: { url },
        evidence: `og:image found but no og:image:width/height`,
        whyItMatters: 'Without image dimensions, Facebook and other platforms must download the image to determine its size before generating the preview. This causes slower preview generation.',
        possibleCause: 'OG image dimensions not specified.',
        recommendedFix: 'Add: <meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n(1200x630 is the recommended size for social sharing)',
        estimatedImpact: 'Low - Slower social media preview generation',
        confidenceScore: 0.8,
      }));
    }

    // Check for content-type in HTTP-equiv (legacy)
    const httpEquivMatch = html.match(/<meta[^>]+http-equiv=["']content-type["'][^>]+content=["']([^"']+)["']/i);
    if (httpEquivMatch) {
      results.push(this.createResult(context, {
        title: 'Legacy http-equiv Content-Type Meta Tag',
        description: 'Page uses legacy <meta http-equiv="content-type"> instead of <meta charset>.',
        severity: Severity.LOW,
        location: { url },
        evidence: httpEquivMatch[0].slice(0, 100),
        whyItMatters: 'The http-equiv="content-type" meta tag is a legacy approach from HTML4. In HTML5, the simpler <meta charset="utf-8"> should be used.',
        possibleCause: 'Legacy HTML template not updated to HTML5 conventions.',
        recommendedFix: 'Replace with: <meta charset="UTF-8"> (must be within first 1024 bytes of HTML)',
        estimatedImpact: 'Low - Best practice improvement',
        confidenceScore: 0.9,
      }));
    }

    return results;
  }
}
