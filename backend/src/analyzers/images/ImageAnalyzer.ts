import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class ImageAnalyzer extends BaseAnalyzer {
  readonly id = 'image-analyzer';
  readonly name = 'Comprehensive Image Analyzer';
  readonly category = AnalyzerCategory.IMAGES;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Deep analysis of images: GIFs, decorative images, aspect ratios, and format recommendations';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url, resources } = context.page;

    const imageResources = resources.filter(r => r.type === 'image');

    // Check for animated GIFs (should be replaced with video or WebP animated)
    const gifImages = imageResources.filter(r => r.url.match(/\.gif(\?|$)/i));
    if (gifImages.length > 0) {
      const largeGifs = gifImages.filter(r => r.size > 500000);
      if (largeGifs.length > 0) {
        results.push(this.createResult(context, {
          title: `${largeGifs.length} Large Animated GIF(s) Detected`,
          description: `Found ${largeGifs.length} GIF file(s) over 500KB. Animated GIFs are extremely inefficient.`,
          severity: Severity.HIGH,
          location: { url },
          evidence: largeGifs.map(r => `${r.url} (${Math.round(r.size / 1024)}KB)`).join('\n'),
          whyItMatters: 'Animated GIFs are 5-20x larger than equivalent videos. A 2MB GIF can be a 100KB WebM video with better quality. They also consume significant CPU for rendering.',
          possibleCause: 'Animated GIF used for animation without considering modern alternatives.',
          recommendedFix: 'Convert animated GIFs to video format:\n<video autoplay loop muted playsinline>\n  <source src="animation.webm" type="video/webm">\n  <source src="animation.mp4" type="video/mp4">\n</video>',
          estimatedImpact: 'High - 80-95% file size reduction possible',
          confidenceScore: 0.9,
        }));
      }
    }

    // Check for base64 encoded images (should be external files)
    const base64Images = (html.match(/src=["']data:image\/[^;]+;base64,[^"']{500,}["']/gi) || []);
    if (base64Images.length > 2) {
      const totalBase64Size = base64Images.reduce((sum, img) => sum + img.length, 0);
      results.push(this.createResult(context, {
        title: `${base64Images.length} Large Base64-Encoded Images in HTML`,
        description: `Found ${base64Images.length} base64 image(s) embedded directly in HTML (~${Math.round(totalBase64Size / 1024)}KB).`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: `${base64Images.length} data:image/... base64 strings in HTML`,
        whyItMatters: 'Large base64 images bloat the HTML file, which cannot be cached separately from the page. The browser must download and parse the entire HTML before it can decode any base64 image.',
        possibleCause: 'Images embedded as base64 for convenience or to reduce HTTP requests.',
        recommendedFix: 'Move images to external files. HTTP/2 eliminates most of the connection-count benefit of inlining. Reserve base64 for tiny icons (<1KB).',
        estimatedImpact: 'Medium - Increases HTML size and prevents image caching',
        confidenceScore: 0.85,
      }));
    }

    // Check for duplicate image sources
    const imgSrcPattern = /<img[^>]+src=["']([^"']+)["']/gi;
    const imageSrcs: string[] = [];
    let match;
    while ((match = imgSrcPattern.exec(html)) !== null) {
      imageSrcs.push(match[1] ?? '');
    }

    const srcCounts = imageSrcs.reduce((acc, src) => {
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const duplicateSrcs = Object.entries(srcCounts).filter(([, count]) => count > 2);
    if (duplicateSrcs.length > 0) {
      results.push(this.createResult(context, {
        title: `${duplicateSrcs.length} Image(s) Referenced Multiple Times`,
        description: `Found ${duplicateSrcs.length} image URL(s) used more than twice on the same page.`,
        severity: Severity.LOW,
        location: { url },
        evidence: duplicateSrcs.slice(0, 3).map(([src, count]) => `${src} (${count}x)`).join('\n'),
        whyItMatters: 'Repeated identical images are usually a design issue (carousel, grid with same asset). Each reference downloads the same image, though caching mitigates this.',
        possibleCause: 'Template or component reusing same image asset.',
        recommendedFix: 'Ensure duplicate images are intentional. If not, use a different image for each slot.',
        estimatedImpact: 'Low - Possible design/content issue',
        confidenceScore: 0.7,
      }));
    }

    // Check for missing fetchpriority on LCP images
    const hasHighPriorityImg = html.includes('fetchpriority="high"') || html.includes("fetchpriority='high'");
    const hasManyImages = imageResources.length > 3;
    if (!hasHighPriorityImg && hasManyImages) {
      results.push(this.createResult(context, {
        title: 'No Image With High Fetch Priority',
        description: 'Page has multiple images but none use fetchpriority="high" to hint the LCP image.',
        severity: Severity.LOW,
        location: { url },
        evidence: `${imageResources.length} images, none with fetchpriority="high"`,
        whyItMatters: 'Without fetchpriority="high", the browser cannot prioritize downloading the LCP image. This delays the largest visible element and hurts Core Web Vitals.',
        possibleCause: 'fetchpriority attribute not implemented.',
        recommendedFix: 'Add fetchpriority="high" to the above-the-fold hero/LCP image: <img src="hero.jpg" fetchpriority="high" alt="...">',
        estimatedImpact: 'Low - LCP image prioritization improvement',
        confidenceScore: 0.7,
      }));
    }

    return results;
  }
}
