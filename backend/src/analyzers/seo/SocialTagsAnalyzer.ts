import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class SocialTagsAnalyzer extends BaseAnalyzer {
  readonly id = 'social-tags-analyzer';
  readonly name = 'Social Media Tags Analyzer';
  readonly category = AnalyzerCategory.SEO;
  readonly defaultSeverity = Severity.LOW;
  readonly description = 'Validates Open Graph and Twitter Card meta tags for social media sharing';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    const getOgTag = (property: string): string | null => {
      const m = html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
                html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'));
      return m?.[1] ?? null;
    };

    const getTwitterTag = (name: string): string | null => {
      const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
                html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'));
      return m?.[1] ?? null;
    };

    // Open Graph required tags
    const ogTitle = getOgTag('og:title');
    const ogDescription = getOgTag('og:description');
    const ogImage = getOgTag('og:image');
    const ogUrl = getOgTag('og:url');
    const ogType = getOgTag('og:type');

    const missingOg: string[] = [];
    if (!ogTitle) missingOg.push('og:title');
    if (!ogDescription) missingOg.push('og:description');
    if (!ogImage) missingOg.push('og:image');
    if (!ogUrl) missingOg.push('og:url');
    if (!ogType) missingOg.push('og:type');

    if (missingOg.length > 0) {
      results.push(this.createResult(context, {
        title: `Missing Open Graph Tags: ${missingOg.join(', ')}`,
        description: `Found ${missingOg.length} missing required Open Graph meta tag(s).`,
        severity: missingOg.includes('og:image') ? Severity.MEDIUM : Severity.LOW,
        location: { url },
        evidence: `Missing: ${missingOg.join(', ')}`,
        whyItMatters: 'Open Graph tags control how your page appears when shared on Facebook, LinkedIn, Slack, and iMessage. Without them, platforms use a default preview which is often ugly, cropped, or wrong.',
        possibleCause: 'Open Graph tags not implemented.',
        recommendedFix: `Add the missing tags in <head>:\n${missingOg.map(tag => `<meta property="${tag}" content="...">`).join('\n')}`,
        estimatedImpact: missingOg.includes('og:image') ? 'Medium - No social share image' : 'Low - Suboptimal social sharing',
        confidenceScore: 0.9,
      }));
    }

    // Validate OG image URL
    if (ogImage) {
      if (ogImage.startsWith('/') || !ogImage.startsWith('http')) {
        results.push(this.createResult(context, {
          title: 'og:image Uses Relative URL',
          description: `og:image content is "${ogImage}" — a relative URL won't work for social sharing.`,
          severity: Severity.HIGH,
          location: { url },
          evidence: `og:image="${ogImage}"`,
          whyItMatters: 'Social media crawlers fetch og:image from a remote server. A relative URL cannot be resolved without the page context, so no image appears in the share preview.',
          possibleCause: 'og:image set with a relative path instead of an absolute URL.',
          recommendedFix: `Change og:image to a full absolute URL: <meta property="og:image" content="https://yourdomain.com${ogImage}">`,
          estimatedImpact: 'High - Social share image will not display',
          confidenceScore: 0.95,
        }));
      }

      // Check og:description length
      if (ogDescription && ogDescription.length > 200) {
        results.push(this.createResult(context, {
          title: 'og:description Too Long',
          description: `og:description is ${ogDescription.length} characters (recommended: 100-200).`,
          severity: Severity.LOW,
          location: { url },
          evidence: `og:description length: ${ogDescription.length}`,
          whyItMatters: 'Most platforms truncate og:description at around 200 characters. A longer description gets cut off mid-sentence, which looks unprofessional.',
          possibleCause: 'Full article description used instead of a tailored social description.',
          recommendedFix: 'Keep og:description between 100-200 characters. Write it as a standalone social hook.',
          estimatedImpact: 'Low - Description truncated in social previews',
          confidenceScore: 0.8,
        }));
      }
    }

    // Twitter Card
    const twitterCard = getTwitterTag('twitter:card');
    const twitterTitle = getTwitterTag('twitter:title');
    const twitterImage = getTwitterTag('twitter:image');

    if (!twitterCard) {
      results.push(this.createResult(context, {
        title: 'Missing twitter:card Meta Tag',
        description: 'Page has no twitter:card meta tag.',
        severity: Severity.LOW,
        location: { url },
        whyItMatters: 'Without twitter:card, Twitter shows only a plain link with no rich preview card. Cards with images get significantly more engagement than plain links.',
        possibleCause: 'Twitter Card tags not implemented.',
        recommendedFix: 'Add: <meta name="twitter:card" content="summary_large_image"> (for image-heavy pages) or "summary" (for text pages).',
        estimatedImpact: 'Low - No rich Twitter card displayed',
        confidenceScore: 0.9,
      }));
    } else if (twitterCard === 'summary_large_image' && !twitterImage && !ogImage) {
      results.push(this.createResult(context, {
        title: 'twitter:card=summary_large_image Without Image',
        description: 'Page requests large image Twitter card but provides no twitter:image or og:image.',
        severity: Severity.MEDIUM,
        location: { url },
        evidence: 'twitter:card="summary_large_image" but no image found',
        whyItMatters: 'summary_large_image requires an image. Without one, Twitter falls back to a smaller card or no card, defeating the purpose.',
        possibleCause: 'twitter:card set without corresponding image tag.',
        recommendedFix: 'Add: <meta name="twitter:image" content="https://yourdomain.com/social-image.jpg"> (minimum 600x314, recommended 1200x630)',
        estimatedImpact: 'Medium - Large card won\'t display',
        confidenceScore: 0.9,
      }));
    }

    return results;
  }
}
