import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class ColorContrastAnalyzer extends BaseAnalyzer {
  readonly id = 'color-contrast-analyzer';
  readonly name = 'Color Contrast Analyzer';
  readonly category = AnalyzerCategory.ACCESSIBILITY;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Detects potential color contrast issues in inline styles and CSS';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    // Extract inline color/background combinations
    const inlineStylePattern = /style=["']([^"']*(?:color|background)[^"']*)["']/gi;
    const potentialIssues: Array<{ color?: string; background?: string; element: string }> = [];
    let match;

    while ((match = inlineStylePattern.exec(html)) !== null) {
      const style = match[1] ?? '';
      const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
      const bgMatch = style.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i);

      if (colorMatch || bgMatch) {
        const color = colorMatch?.[1]?.trim();
        const background = bgMatch?.[1]?.trim();
        if (color && background) {
          const ratio = this.estimateContrastRatio(color, background);
          if (ratio !== null && ratio < 3) {
            potentialIssues.push({ color, background, element: match[0].slice(0, 80) });
          }
        }
      }
    }

    if (potentialIssues.length > 0) {
      results.push(this.createResult(context, {
        title: `${potentialIssues.length} Potential Color Contrast Issue(s) in Inline Styles`,
        description: `Found ${potentialIssues.length} element(s) where color and background-color appear low contrast.`,
        severity: Severity.HIGH,
        location: { url },
        evidence: potentialIssues.slice(0, 3).map(i => `color: ${i.color} on ${i.background}`).join('\n'),
        whyItMatters: 'Low color contrast makes text hard or impossible to read for users with low vision or color blindness. WCAG 2.1 requires 4.5:1 for normal text and 3:1 for large text (AA level).',
        possibleCause: 'Colors chosen for aesthetics without checking accessibility contrast ratios.',
        recommendedFix: 'Use a contrast checker (WebAIM: https://webaim.org/resources/contrastchecker/) to verify all text meets WCAG AA standards (4.5:1 ratio). Adjust colors until compliant.',
        estimatedImpact: 'High - Text unreadable for low-vision users',
        confidenceScore: 0.65,
        metadata: { wcagCriteria: ['1.4.3'], cwe: [] },
      }));
    }

    // Check for light gray text (common low-contrast pattern)
    const lightGrayTextPattern = /color\s*:\s*(?:#[89a-f][0-9a-f]{5}|#[89a-f]{3}|rgba?\([^)]*,\s*0\.[1-3]\))/gi;
    const lightGrayMatches = html.match(lightGrayTextPattern) || [];
    if (lightGrayMatches.length > 3) {
      results.push(this.createResult(context, {
        title: 'Light Gray Text Color Detected',
        description: `Found ${lightGrayMatches.length} instance(s) of light gray text colors that may fail contrast requirements on white backgrounds.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: lightGrayMatches.slice(0, 3).join('\n'),
        whyItMatters: 'Light gray text (#aaa, #bbb, #ccc) on white backgrounds commonly fails WCAG contrast ratios. This is one of the most prevalent accessibility failures on the web.',
        possibleCause: 'Subtle gray used for secondary text without contrast verification.',
        recommendedFix: 'Use #767676 or darker for body text on white backgrounds (minimum for 4.5:1). Use https://contrast.tools to verify.',
        estimatedImpact: 'Medium - Text may be hard to read for many users',
        confidenceScore: 0.7,
        metadata: { wcagCriteria: ['1.4.3'] },
      }));
    }

    // Check for placeholder text contrast (often very light by default)
    if (html.includes('placeholder') && (html.includes('::placeholder') || html.includes('::-webkit-input-placeholder'))) {
      results.push(this.createResult(context, {
        title: 'Custom Placeholder Text Styling',
        description: 'Page has custom placeholder text styling. Ensure placeholder text meets contrast requirements.',
        severity: Severity.LOW,
        location: { url },
        evidence: 'Custom ::placeholder styles detected',
        whyItMatters: 'Placeholder text must meet 4.5:1 contrast ratio (WCAG 2.1). Default browser placeholder styling often fails this. Custom placeholder styles may make it worse.',
        possibleCause: 'Placeholder text styled without contrast checking.',
        recommendedFix: 'Ensure ::placeholder color has at least 4.5:1 contrast against the input background. Use #757575 or darker on white.',
        estimatedImpact: 'Low - Placeholder readability issue',
        confidenceScore: 0.65,
        metadata: { wcagCriteria: ['1.4.3'] },
      }));
    }

    return results;
  }

  private estimateContrastRatio(color1: string, color2: string): number | null {
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);
    if (!rgb1 || !rgb2) return null;

    const l1 = this.relativeLuminance(rgb1);
    const l2 = this.relativeLuminance(rgb2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  private parseColor(color: string): [number, number, number] | null {
    const hex3 = color.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
    if (hex3) {
      return [
        parseInt(hex3[1]! + hex3[1]!, 16),
        parseInt(hex3[2]! + hex3[2]!, 16),
        parseInt(hex3[3]! + hex3[3]!, 16),
      ];
    }
    const hex6 = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (hex6) {
      return [parseInt(hex6[1]!, 16), parseInt(hex6[2]!, 16), parseInt(hex6[3]!, 16)];
    }
    const rgb = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
    if (rgb) {
      return [parseInt(rgb[1]!, 10), parseInt(rgb[2]!, 10), parseInt(rgb[3]!, 10)];
    }
    return null;
  }

  private relativeLuminance([r, g, b]: [number, number, number]): number {
    const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(c =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * rs! + 0.7152 * gs! + 0.0722 * bs!;
  }
}
