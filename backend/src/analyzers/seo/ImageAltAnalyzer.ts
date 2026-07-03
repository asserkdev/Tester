import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class ImageAltAnalyzer extends BaseAnalyzer {
  readonly id = 'image-alt-analyzer';
  readonly name = 'Image Alt Text Analyzer';
  readonly category = AnalyzerCategory.SEO;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Checks all images for alt text, meaningful descriptions, and SEO optimization';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    const imgPattern = /<img([^>]*?)(?:\s*\/)?>|<img([^>]*?)>/gi;
    const images: Array<{ tag: string; attrs: string }> = [];
    let match;

    while ((match = imgPattern.exec(html)) !== null) {
      const attrs = match[1] ?? match[2] ?? '';
      images.push({ tag: match[0] ?? '', attrs });
    }

    if (images.length === 0) return results;

    const missingAlt: string[] = [];
    const emptyAlt: string[] = [];
    const longAlt: Array<{ src: string; alt: string }> = [];
    const filenameAlt: Array<{ src: string; alt: string }> = [];

    for (const img of images) {
      const { attrs } = img;
      const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
      const src = srcMatch ? srcMatch[1] ?? '' : 'unknown';
      const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
      const role = attrs.match(/role=["']([^"']*)["']/i)?.[1];
      const ariaHidden = attrs.includes('aria-hidden="true"');

      // Skip decorative images
      if (ariaHidden || role === 'presentation' || role === 'none') continue;

      if (!altMatch) {
        missingAlt.push(src);
      } else {
        const altText = altMatch[1] ?? '';
        if (altText.trim() === '' && !ariaHidden) {
          // Empty alt is valid for decorative images but should be checked
        } else if (altText.length > 125) {
          longAlt.push({ src, alt: altText });
        } else if (this.isFilenameAlt(altText)) {
          filenameAlt.push({ src, alt: altText });
        }
      }
    }

    if (missingAlt.length > 0) {
      results.push(this.createResult(context, {
        title: `${missingAlt.length} Image(s) Missing Alt Text`,
        description: `Found ${missingAlt.length} <img> element(s) without an alt attribute.`,
        severity: missingAlt.length > 5 ? Severity.HIGH : Severity.MEDIUM,
        location: { url },
        evidence: missingAlt.slice(0, 5).join('\n'),
        whyItMatters: 'Missing alt text fails WCAG 2.1 criterion 1.1.1 (non-text content). Screen readers announce the filename instead, which is meaningless. Search engines also cannot index image content without alt text.',
        possibleCause: 'Images added without alt attributes.',
        recommendedFix: 'Add descriptive alt text to all content images: <img src="..." alt="Description of image">. Use alt="" for purely decorative images.',
        estimatedImpact: 'High - Accessibility and SEO both affected',
        confidenceScore: 0.95,
        metadata: { wcagCriteria: ['1.1.1'] },
      }));
    }

    if (longAlt.length > 0) {
      results.push(this.createResult(context, {
        title: `${longAlt.length} Image(s) with Alt Text Over 125 Characters`,
        description: `Found images with very long alt text. Alt text should be concise (125 chars max).`,
        severity: Severity.LOW,
        location: { url },
        evidence: longAlt.slice(0, 2).map(i => `src="${i.src}": alt="${i.alt.slice(0, 80)}..."`).join('\n'),
        whyItMatters: 'Overly long alt text is verbose for screen readers. Descriptions over 125 characters should use the longdesc attribute or surrounding text instead.',
        possibleCause: 'Full caption or description placed in alt attribute.',
        recommendedFix: 'Keep alt text concise (a few words to a short sentence). For complex images, use aria-describedby pointing to a visible description.',
        estimatedImpact: 'Low - Poor screen reader experience',
        confidenceScore: 0.85,
        metadata: { wcagCriteria: ['1.1.1'] },
      }));
    }

    if (filenameAlt.length > 0) {
      results.push(this.createResult(context, {
        title: `${filenameAlt.length} Image(s) with Filename as Alt Text`,
        description: `Found images where alt text looks like a filename (e.g., "img_1234.jpg").`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: filenameAlt.slice(0, 3).map(i => `alt="${i.alt}"`).join('\n'),
        whyItMatters: 'Filename-based alt text provides no meaningful information to screen reader users or search engines.',
        possibleCause: 'CMS automatically populated alt text with the filename.',
        recommendedFix: 'Replace filename-based alt text with a descriptive phrase that conveys the purpose or content of the image.',
        estimatedImpact: 'Medium - Poor accessibility and SEO',
        confidenceScore: 0.85,
        metadata: { wcagCriteria: ['1.1.1'] },
      }));
    }

    return results;
  }

  private isFilenameAlt(alt: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp|svg|avif)\s*$/i.test(alt) ||
      /^img[-_]\d+/i.test(alt) ||
      /^(image|photo|pic|screenshot)[-_]\d+/i.test(alt);
  }
}
