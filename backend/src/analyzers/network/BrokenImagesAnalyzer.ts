import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class BrokenImagesAnalyzer extends BaseAnalyzer {
  readonly id = 'broken-images-analyzer';
  readonly name = 'Broken Images Analyzer';
  readonly category = AnalyzerCategory.IMAGES;
  readonly defaultSeverity = Severity.HIGH;
  readonly description = 'Detects broken images that return 404 or error status codes';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { url, resources } = context.page;

    const imageResources = resources.filter(r => r.type === 'image');

    const brokenImages = imageResources.filter(r =>
      r.status >= 400 || r.status === 0
    );

    const largeImages = imageResources.filter(r => r.size > 1000000);
    const svgImages = imageResources.filter(r => r.url.endsWith('.svg'));

    if (brokenImages.length > 0) {
      results.push(this.createResult(context, {
        title: `${brokenImages.length} Broken Image(s) Detected`,
        description: `Found ${brokenImages.length} image(s) returning HTTP error status codes.`,
        severity: Severity.HIGH,
        location: { url },
        evidence: brokenImages.slice(0, 5).map(r => `[${r.status}] ${r.url}`).join('\n'),
        whyItMatters: 'Broken images show as blank spaces or broken image icons, damaging user experience and credibility. They can also indicate broken deployments, missing assets in CDN, or deleted source images.',
        possibleCause: 'Image files deleted, renamed, moved without updating references, or CDN misconfiguration.',
        recommendedFix: 'Update or remove all references to broken images. Verify image paths in production deployment. Add onerror fallback: <img src="..." onerror="this.src=\'/placeholder.png\'">',
        estimatedImpact: 'High - Visible broken images damage credibility',
        confidenceScore: 0.95,
      }));
    }

    if (largeImages.length > 0) {
      results.push(this.createResult(context, {
        title: `${largeImages.length} Image(s) Larger Than 1MB`,
        description: `Found ${largeImages.length} image(s) exceeding 1MB — these should be aggressively optimized.`,
        severity: Severity.HIGH,
        location: { url },
        evidence: largeImages.slice(0, 5).map(r => `${r.url} (${Math.round(r.size / 1024 / 1024 * 10) / 10}MB)`).join('\n'),
        whyItMatters: 'Images over 1MB are the most common cause of slow-loading pages. On a 4G connection, a 2MB image takes 2+ seconds to download. Multiple large images compound this effect.',
        possibleCause: 'Raw, uncompressed images uploaded directly without optimization.',
        recommendedFix: 'Compress images using Squoosh, TinyPNG, or Sharp. Convert to WebP format. Images should rarely exceed 200KB for web use.',
        estimatedImpact: 'High - Major page load bottleneck',
        confidenceScore: 0.95,
      }));
    }

    // Check for unoptimized SVGs
    const inlineSVGPattern = /<svg[^>]*>([\s\S]*?)<\/svg>/gi;
    const largeSVGs: string[] = [];
    let match;
    while ((match = inlineSVGPattern.exec(context.page.html)) !== null) {
      if ((match[0] ?? '').length > 5000) {
        largeSVGs.push(`${match[0].slice(0, 50)}...`);
      }
    }

    if (largeSVGs.length > 0) {
      results.push(this.createResult(context, {
        title: `${largeSVGs.length} Large Inline SVG(s) Detected`,
        description: `Found ${largeSVGs.length} inline SVG(s) over 5KB. These should be externalized and compressed.`,
        severity: Severity.LOW,
        location: { url },
        evidence: `${largeSVGs.length} large inline SVG elements`,
        whyItMatters: 'Large inline SVGs increase HTML size and cannot be cached separately. The HTML file is larger and takes longer to parse.',
        possibleCause: 'Complex SVGs (icons, illustrations) embedded directly in HTML.',
        recommendedFix: 'Move SVGs to external .svg files and reference with <img> or <use>. Optimize SVGs with SVGO to remove unnecessary metadata.',
        estimatedImpact: 'Low - Increases HTML file size',
        confidenceScore: 0.8,
      }));
    }

    return results;
  }
}
