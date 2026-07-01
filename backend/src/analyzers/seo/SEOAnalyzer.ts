import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class SEOAnalyzer extends BaseAnalyzer {
  readonly id = 'seo-analyzer';
  readonly name = 'SEO Analyzer';
  readonly category = AnalyzerCategory.SEO;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Analyzes SEO elements and meta tags';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { metadata, url } = context.page;

    if (!metadata.title || metadata.title.trim().length === 0) {
      results.push(this.createResult(context, {
        title: 'Missing Title Tag',
        description: 'Page does not have a title element.',
        severity: Severity.HIGH,
        location: { url },
        whyItMatters: 'Title tag is crucial for SEO and appears in search results.',
        possibleCause: 'Title tag was not added during development.',
        recommendedFix: 'Add a descriptive <title> tag within the <head> section.',
        estimatedImpact: 'High - Affects search engine ranking',
        confidenceScore: 0.95,
      }));
    } else if (metadata.title.length < 30) {
      results.push(this.createResult(context, {
        title: 'Title Tag Too Short',
        description: `Title tag is ${metadata.title.length} characters. Recommended: 50-60 characters.`,
        severity: Severity.LOW,
        location: { url },
        evidence: metadata.title,
        whyItMatters: 'Short titles may be truncated in search results.',
        possibleCause: 'Title was not optimized for SEO.',
        recommendedFix: 'Expand title to 50-60 characters with relevant keywords.',
        estimatedImpact: 'Low - Minor impact on SEO',
        confidenceScore: 0.9,
      }));
    } else if (metadata.title.length > 70) {
      results.push(this.createResult(context, {
        title: 'Title Tag Too Long',
        description: `Title tag is ${metadata.title.length} characters. Recommended: 50-60 characters.`,
        severity: Severity.LOW,
        location: { url },
        evidence: metadata.title,
        whyItMatters: 'Long titles may be truncated in search results.',
        possibleCause: 'Title was not optimized for SEO.',
        recommendedFix: 'Shorten title to 50-60 characters.',
        estimatedImpact: 'Low - Minor impact on SEO',
        confidenceScore: 0.9,
      }));
    }

    if (!metadata.description || metadata.description.trim().length === 0) {
      results.push(this.createResult(context, {
        title: 'Missing Meta Description',
        description: 'Page does not have a meta description.',
        severity: Severity.MEDIUM,
        location: { url },
        whyItMatters: 'Meta description appears in search results and affects click-through rates.',
        possibleCause: 'Meta description was not added during development.',
        recommendedFix: 'Add a <meta name="description" content="..."> tag with 150-160 characters.',
        estimatedImpact: 'Medium - Affects click-through rates',
        confidenceScore: 0.95,
      }));
    }

    if (!metadata.ogTags || Object.keys(metadata.ogTags).length === 0) {
      results.push(this.createResult(context, {
        title: 'Missing Open Graph Tags',
        description: 'Page does not have Open Graph meta tags for social sharing.',
        severity: Severity.LOW,
        location: { url },
        whyItMatters: 'OG tags control how the page appears when shared on social media.',
        possibleCause: 'OG tags were not added during development.',
        recommendedFix: 'Add essential OG tags: og:title, og:description, og:image, og:url.',
        estimatedImpact: 'Low - Affects social sharing',
        confidenceScore: 0.9,
      }));
    }

    return results;
  }
}
