import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class ImageOptimizationAnalyzer extends BaseAnalyzer {
  readonly id = 'image-optimization-analyzer';
  readonly name = 'Image Optimization Analyzer';
  readonly category = AnalyzerCategory.PERFORMANCE;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Analyzes image formats, sizes, lazy loading, and optimization opportunities';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url, resources } = context.page;

    const imageResources = resources.filter(r => r.type === 'image');

    // Check for large unoptimized images
    const largeImages = imageResources.filter(r => r.size > 200000); // > 200KB
    if (largeImages.length > 0) {
      results.push(this.createResult(context, {
        title: `${largeImages.length} Large Image(s) Found`,
        description: `${largeImages.length} image(s) exceed 200KB. Images should be compressed and sized appropriately.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: largeImages.slice(0, 5).map(r => `${r.url} (${Math.round(r.size / 1024)}KB)`).join('\n'),
        whyItMatters: 'Large images are one of the most common causes of slow page loads. They increase data usage, slow down LCP, and cause poor user experience on mobile networks.',
        possibleCause: 'Images uploaded without compression, or original high-resolution images served to all devices.',
        recommendedFix: 'Compress images using tools like Squoosh, ImageOptim, or Sharp. Serve images at the actual display size, not larger.',
        estimatedImpact: 'High - Directly impacts page load time',
        confidenceScore: 0.9,
      }));
    }

    // Check for non-modern image formats
    const legacyFormatImages = imageResources.filter(r =>
      r.url.match(/\.(jpg|jpeg|png|gif|bmp|tiff)(\?|$)/i)
    );
    const totalImages = imageResources.length;
    const legacyPercentage = totalImages > 0 ? (legacyFormatImages.length / totalImages) * 100 : 0;

    if (legacyFormatImages.length > 2 && legacyPercentage > 50) {
      results.push(this.createResult(context, {
        title: `${legacyFormatImages.length} Images Not Using Modern Formats`,
        description: `${legacyFormatImages.length} image(s) use legacy formats (JPEG/PNG/GIF). Modern formats (WebP/AVIF) provide significantly better compression.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: `${legacyFormatImages.length}/${totalImages} images use legacy formats`,
        whyItMatters: 'WebP images are 25-35% smaller than JPEG/PNG at equivalent quality. AVIF is even smaller (50%+ savings). This directly reduces page weight and improves load times.',
        possibleCause: 'Images not converted to modern formats.',
        recommendedFix: 'Convert images to WebP or AVIF format. Use <picture> element with fallbacks:\n<picture>\n  <source srcset="image.avif" type="image/avif">\n  <source srcset="image.webp" type="image/webp">\n  <img src="image.jpg" alt="...">\n</picture>',
        estimatedImpact: 'Medium - 25-50% image size reduction possible',
        confidenceScore: 0.85,
      }));
    }

    // Check for images without lazy loading
    const imgPattern = /<img([^>]*?)>/gi;
    const imgsWithoutLazy: string[] = [];
    let match;
    let imgCount = 0;
    while ((match = imgPattern.exec(html)) !== null) {
      const attrs = match[1] ?? '';
      const src = attrs.match(/src=["']([^"']+)["']/i)?.[1] ?? '';
      if (src && !src.startsWith('data:')) {
        imgCount++;
        if (!attrs.includes('loading=') && !attrs.includes('lazy')) {
          imgsWithoutLazy.push(src);
        }
      }
    }

    // Only flag if there are multiple images (the first few are likely above the fold)
    const belowFoldImgs = imgsWithoutLazy.slice(3); // First 3 are likely above fold
    if (belowFoldImgs.length > 2) {
      results.push(this.createResult(context, {
        title: `${belowFoldImgs.length} Images Without Lazy Loading`,
        description: `${belowFoldImgs.length} image(s) don't use the loading="lazy" attribute. Below-the-fold images load unnecessarily on page load.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: `${imgCount} total images, ${imgsWithoutLazy.length} without lazy loading`,
        whyItMatters: 'Without lazy loading, all images are fetched immediately even if the user never scrolls to see them. This wastes bandwidth and delays the loading of visible content.',
        possibleCause: 'Lazy loading not implemented.',
        recommendedFix: 'Add loading="lazy" to below-the-fold images: <img src="..." loading="lazy" alt="...">. Do NOT add it to above-the-fold (LCP) images.',
        estimatedImpact: 'Medium - Faster initial page load',
        confidenceScore: 0.8,
      }));
    }

    // Check for missing width/height on images (CLS risk)
    const imgsWithoutDimensions: string[] = [];
    const imgDimPattern = /<img([^>]*?)>/gi;
    while ((match = imgDimPattern.exec(html)) !== null) {
      const attrs = match[1] ?? '';
      const src = attrs.match(/src=["']([^"']+)["']/i)?.[1] ?? '';
      if (src && !src.startsWith('data:')) {
        const hasWidth = attrs.includes('width=') || attrs.includes('width:');
        const hasHeight = attrs.includes('height=') || attrs.includes('height:');
        if (!hasWidth || !hasHeight) {
          imgsWithoutDimensions.push(src);
        }
      }
    }

    if (imgsWithoutDimensions.length > 2) {
      results.push(this.createResult(context, {
        title: `${imgsWithoutDimensions.length} Images Without Explicit Width/Height`,
        description: `${imgsWithoutDimensions.length} image(s) don't have explicit width and height attributes, causing Cumulative Layout Shift (CLS).`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: imgsWithoutDimensions.slice(0, 3).join('\n'),
        whyItMatters: 'Without dimensions, the browser doesn\'t know how much space to reserve for images. When images load, they push content down, causing jarring layout shifts (poor CLS score).',
        possibleCause: 'Images added without dimension attributes.',
        recommendedFix: 'Add width and height attributes matching the image\'s natural dimensions: <img src="..." width="800" height="600" alt="...">. The browser uses these to reserve space before the image loads.',
        estimatedImpact: 'Medium - Causes Cumulative Layout Shift',
        confidenceScore: 0.85,
      }));
    }

    return results;
  }
}
