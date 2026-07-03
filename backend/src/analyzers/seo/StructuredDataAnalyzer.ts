import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class StructuredDataAnalyzer extends BaseAnalyzer {
  readonly id = 'structured-data-analyzer';
  readonly name = 'Structured Data Analyzer';
  readonly category = AnalyzerCategory.SEO;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Validates JSON-LD structured data, Schema.org markup, and rich snippet eligibility';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    // Extract JSON-LD blocks
    const jsonLdPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const jsonLdBlocks: Array<{ raw: string; parsed: any }> = [];
    let match;

    while ((match = jsonLdPattern.exec(html)) !== null) {
      const raw = match[1]?.trim() ?? '';
      try {
        const parsed = JSON.parse(raw);
        jsonLdBlocks.push({ raw, parsed });
      } catch (e) {
        results.push(this.createResult(context, {
          title: 'Invalid JSON-LD: Parse Error',
          description: 'Found a JSON-LD structured data block that contains invalid JSON.',
          severity: Severity.HIGH,
          location: { url },
          evidence: raw.slice(0, 200),
          whyItMatters: 'Invalid JSON-LD is silently ignored by search engines. Rich snippets (star ratings, breadcrumbs, FAQs) will not appear for this page.',
          possibleCause: 'Syntax error in JSON (missing comma, unclosed quote, trailing comma).',
          recommendedFix: 'Validate your JSON-LD with https://validator.schema.org/ and fix the syntax error.',
          estimatedImpact: 'High - Rich snippets disabled for this page',
          confidenceScore: 0.95,
        }));
      }
    }

    if (jsonLdBlocks.length === 0) {
      // Check for Microdata as fallback
      const itemscopeCount = (html.match(/itemscope/gi) || []).length;
      if (itemscopeCount === 0) {
        results.push(this.createResult(context, {
          title: 'No Structured Data Found',
          description: 'Page has no JSON-LD or Microdata structured data markup.',
          severity: Severity.LOW,
          location: { url },
          whyItMatters: 'Structured data enables rich snippets in search results (star ratings, breadcrumbs, FAQ expandables, product prices). Pages without it show plain blue links.',
          possibleCause: 'Structured data not implemented.',
          recommendedFix: 'Add JSON-LD structured data appropriate for your page type. Start with Organization, WebPage, or BreadcrumbList. Use https://schema.org for the full vocabulary.',
          estimatedImpact: 'Low - Missing rich snippet opportunities',
          confidenceScore: 0.85,
        }));
      }
    }

    // Validate each JSON-LD block
    for (const block of jsonLdBlocks) {
      const schema = block.parsed;
      const type = schema['@type'] || 'Unknown';
      const context2 = schema['@context'];

      if (!context2 || (!context2.includes('schema.org') && context2 !== 'https://schema.org')) {
        results.push(this.createResult(context, {
          title: `Structured Data Missing @context: ${type}`,
          description: `JSON-LD block with @type "${type}" is missing or has incorrect @context.`,
          severity: Severity.MEDIUM,
          location: { url },
          evidence: `"@context" is missing or invalid`,
          whyItMatters: 'Without a valid @context pointing to schema.org, search engines cannot interpret the structured data.',
          possibleCause: '@context omitted or set to wrong URL.',
          recommendedFix: 'Add "@context": "https://schema.org" to all JSON-LD objects.',
          estimatedImpact: 'Medium - Structured data may be ignored',
          confidenceScore: 0.9,
        }));
      }

      // Check required properties for common types
      if (type === 'Product') {
        if (!schema.name) {
          results.push(this.createResult(context, {
            title: 'Product Schema Missing Required "name" Property',
            description: 'Product structured data is missing the required "name" property.',
            severity: Severity.HIGH,
            location: { url },
            evidence: JSON.stringify(schema).slice(0, 200),
            whyItMatters: 'Missing required properties prevent Google from showing product rich results.',
            possibleCause: 'Incomplete schema implementation.',
            recommendedFix: 'Add "name" property to the Product JSON-LD: { "@type": "Product", "name": "Product Name", ... }',
            estimatedImpact: 'High - Product rich results disabled',
            confidenceScore: 0.9,
          }));
        }
      }

      if (type === 'Article' || type === 'BlogPosting') {
        const missingProps = ['headline', 'author', 'datePublished'].filter(p => !schema[p]);
        if (missingProps.length > 0) {
          results.push(this.createResult(context, {
            title: `Article Schema Missing Properties: ${missingProps.join(', ')}`,
            description: `Article structured data is missing recommended properties: ${missingProps.join(', ')}.`,
            severity: Severity.MEDIUM,
            location: { url },
            evidence: `Missing: ${missingProps.join(', ')}`,
            whyItMatters: 'Articles with complete structured data are eligible for Top Stories carousel and rich results.',
            possibleCause: 'Partial schema implementation.',
            recommendedFix: `Add the missing properties to your Article JSON-LD: ${missingProps.map(p => `"${p}"`).join(', ')}`,
            estimatedImpact: 'Medium - Reduced rich result eligibility',
            confidenceScore: 0.85,
          }));
        }
      }

      if (type === 'FAQPage') {
        const mainEntity = schema.mainEntity;
        if (!Array.isArray(mainEntity) || mainEntity.length === 0) {
          results.push(this.createResult(context, {
            title: 'FAQPage Schema Missing Questions',
            description: 'FAQPage structured data has no questions in mainEntity array.',
            severity: Severity.HIGH,
            location: { url },
            evidence: 'mainEntity array is empty or missing',
            whyItMatters: 'Empty FAQ schema prevents FAQ rich results from appearing in search.',
            possibleCause: 'FAQPage schema added but questions not populated.',
            recommendedFix: 'Populate the mainEntity array with Question objects: { "@type": "Question", "name": "...", "acceptedAnswer": { "@type": "Answer", "text": "..." } }',
            estimatedImpact: 'High - FAQ rich results disabled',
            confidenceScore: 0.9,
          }));
        }
      }
    }

    return results;
  }
}
