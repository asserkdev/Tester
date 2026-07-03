import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class ResponsiveAnalyzer extends BaseAnalyzer {
  readonly id = 'responsive-analyzer';
  readonly name = 'Responsive Design Analyzer';
  readonly category = AnalyzerCategory.RESPONSIVE;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Checks for responsive design patterns, mobile viewport, and layout issues';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    // Check for viewport meta tag
    const viewportMatch = html.match(/<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']+)["']/i);

    if (!viewportMatch) {
      results.push(this.createResult(context, {
        title: 'Missing Viewport Meta Tag',
        description: 'Page has no viewport meta tag — mobile devices will render at desktop width.',
        severity: Severity.CRITICAL,
        location: { url },
        whyItMatters: 'Without a viewport meta tag, mobile browsers render the page at desktop width (usually 980px) and scale it down. Users see tiny text and must pinch to zoom on every page.',
        possibleCause: 'Viewport meta tag not added to HTML.',
        recommendedFix: 'Add: <meta name="viewport" content="width=device-width, initial-scale=1">',
        estimatedImpact: 'Critical - Site is not mobile-friendly',
        confidenceScore: 0.95,
        metadata: { wcagCriteria: ['1.4.4'] },
      }));
    } else {
      const viewportContent = viewportMatch[1] ?? '';

      // Check for user-scalable=no (disables zoom — bad for accessibility)
      if (viewportContent.includes('user-scalable=no') || viewportContent.includes('user-scalable=0')) {
        results.push(this.createResult(context, {
          title: 'Viewport Disables User Zoom (user-scalable=no)',
          description: 'Viewport meta tag prevents users from zooming in on mobile devices.',
          severity: Severity.HIGH,
          location: { url },
          evidence: `<meta name="viewport" content="${viewportContent}">`,
          whyItMatters: 'Disabling zoom prevents users with low vision from enlarging text. This is a WCAG 1.4.4 failure and accessibility violation. Some browsers ignore this restriction, but it still fails the guideline.',
          possibleCause: 'Developer disabling zoom to prevent layout issues.',
          recommendedFix: 'Remove "user-scalable=no" from the viewport meta tag. Fix layout issues instead of disabling zoom.',
          estimatedImpact: 'High - Low-vision users cannot zoom in',
          confidenceScore: 0.95,
          metadata: { wcagCriteria: ['1.4.4'] },
        }));
      }

      // Check for maximum-scale=1.0 (also prevents zoom)
      const maxScaleMatch = viewportContent.match(/maximum-scale\s*=\s*([\d.]+)/i);
      if (maxScaleMatch && parseFloat(maxScaleMatch[1] ?? '5') <= 1.0) {
        results.push(this.createResult(context, {
          title: 'Viewport Limits Maximum Scale to 1.0',
          description: `Viewport maximum-scale is set to ${maxScaleMatch[1]}, preventing zoom on mobile.`,
          severity: Severity.HIGH,
          location: { url },
          evidence: `<meta name="viewport" content="${viewportContent}">`,
          whyItMatters: 'maximum-scale=1.0 effectively disables zoom and violates WCAG 1.4.4 (Resize Text).',
          possibleCause: 'Accidentally restrictive viewport configuration.',
          recommendedFix: 'Remove maximum-scale or set it to a value >= 5.',
          estimatedImpact: 'High - WCAG 1.4.4 violation',
          confidenceScore: 0.9,
          metadata: { wcagCriteria: ['1.4.4'] },
        }));
      }
    }

    // Check for fixed widths in inline styles or style tags
    const fixedWidthPattern = /(?:style=["'][^"']*|\.[\w-]+\s*\{[^}]*)\bwidth\s*:\s*\d+px/gi;
    const fixedWidths = (html.match(fixedWidthPattern) || []).filter(w => {
      const pxMatch = w.match(/width\s*:\s*(\d+)px/i);
      return pxMatch && parseInt(pxMatch[1] ?? '0', 10) > 600;
    });

    if (fixedWidths.length > 3) {
      results.push(this.createResult(context, {
        title: `${fixedWidths.length} Large Fixed-Width Elements Detected`,
        description: `Found ${fixedWidths.length} elements with fixed pixel widths > 600px. These won't adapt to mobile screens.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: `${fixedWidths.length} fixed-width declarations > 600px`,
        whyItMatters: 'Fixed-width elements wider than the mobile viewport cause horizontal scrolling, breaking the layout on mobile devices.',
        possibleCause: 'Desktop-first design with no responsive overrides.',
        recommendedFix: 'Use relative units (%, vw, max-width) and add media queries to adjust layouts for small screens.',
        estimatedImpact: 'Medium - Layout broken on mobile devices',
        confidenceScore: 0.75,
      }));
    }

    // Check for responsive images (srcset)
    const imgWithoutSrcset = [...html.matchAll(/<img([^>]*?)>/gi)]
      .filter(m => {
        const attrs = m[1] ?? '';
        const src = attrs.match(/src=["']([^"']+)["']/i)?.[1] ?? '';
        return src && !src.startsWith('data:') && !attrs.includes('srcset=');
      });

    if (imgWithoutSrcset.length > 3) {
      results.push(this.createResult(context, {
        title: `${imgWithoutSrcset.length} Images Without Responsive srcset`,
        description: `${imgWithoutSrcset.length} images don't use srcset to serve different resolutions to different devices.`,
        severity: Severity.LOW,
        location: { url },
        evidence: `${imgWithoutSrcset.length} images without srcset attribute`,
        whyItMatters: 'Without srcset, all devices (including tiny mobile screens) download the full desktop-resolution image. This wastes mobile data and slows loading on phones.',
        possibleCause: 'Responsive images not implemented.',
        recommendedFix: 'Add srcset attribute to serve appropriately sized images:\n<img src="image-800.jpg" srcset="image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w" sizes="(max-width: 600px) 400px, 800px" alt="...">',
        estimatedImpact: 'Low - Mobile users download oversized images',
        confidenceScore: 0.8,
      }));
    }

    // Check for touch-friendly tap targets
    const smallButtonPattern = /<button([^>]*?)style=["'][^"']*(?:width|height)\s*:\s*(\d+)px/gi;
    let bMatch;
    while ((bMatch = smallButtonPattern.exec(html)) !== null) {
      const size = parseInt(bMatch[2] ?? '0', 10);
      if (size < 44) {
        results.push(this.createResult(context, {
          title: 'Small Touch Target Detected',
          description: 'Found a button/interactive element smaller than 44x44 pixels — the minimum recommended tap target size.',
          severity: Severity.MEDIUM,
          location: { url },
          evidence: `${size}px — minimum recommended is 44px (Apple HIG) / 48px (Google)`,
          whyItMatters: 'Small touch targets are difficult to tap accurately on touch screens, causing user frustration and accidental taps on adjacent elements.',
          possibleCause: 'Desktop design not adapted for touch interaction.',
          recommendedFix: 'Ensure all interactive elements (buttons, links, checkboxes) have a minimum touch target of 44x44px. Use padding to increase tap area without changing visual size.',
          estimatedImpact: 'Medium - Poor mobile usability',
          confidenceScore: 0.75,
          metadata: { wcagCriteria: ['2.5.5'] },
        }));
        break;
      }
    }

    return results;
  }
}
