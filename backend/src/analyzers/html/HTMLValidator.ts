import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class HTMLValidator extends BaseAnalyzer {
  readonly id = 'html-validator';
  readonly name = 'HTML Validator';
  readonly category = AnalyzerCategory.HTML;
  readonly defaultSeverity = Severity.HIGH;
  readonly description = 'Validates HTML syntax and structure';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    const duplicateIds = this.findDuplicateIds(html);
    duplicateIds.forEach(({ ids, selector }) => {
      results.push(this.createResult(context, {
        title: 'Duplicate ID Attribute',
        description: `Found duplicate ID "${ids[0]}" used ${ids.length} times on the page.`,
        severity: Severity.HIGH,
        location: { url, selector },
        evidence: `Duplicate IDs: ${ids.join(', ')}`,
        whyItMatters: 'Duplicate IDs violate HTML specification and can cause issues with accessibility, JavaScript selection, and CSS targeting.',
        possibleCause: 'Developer error or copy-paste mistakes during development.',
        recommendedFix: 'Ensure each ID is unique. Consider using classes for multiple elements that need the same styling or behavior.',
        estimatedImpact: 'Medium - May affect accessibility and JavaScript functionality',
        confidenceScore: 0.95,
        metadata: {
          documentation: ['https://www.w3.org/TR/HTML401/struct/global.html#h-7.5.2'],
          wcagCriteria: ['4.1.1'],
        },
      }));
    });

    const missingAltTags = this.findMissingAltTags(html);
    missingAltTags.forEach((img) => {
      results.push(this.createResult(context, {
        title: 'Missing alt Attribute',
        description: 'Image element lacks alt text for accessibility.',
        severity: Severity.MEDIUM,
        location: { url, selector: img.selector, element: img.tag },
        evidence: img.tag,
        whyItMatters: 'Screen readers cannot describe this image to visually impaired users, making the content inaccessible.',
        possibleCause: 'Developer forgot to add alt attribute or intentionally left it empty for decorative images.',
        recommendedFix: img.isDecorative
          ? 'Add alt="" for decorative images'
          : `Add descriptive alt text: alt="Description of the image content"`,
        estimatedImpact: 'Medium - Affects WCAG compliance and accessibility',
        confidenceScore: 0.9,
        metadata: {
          wcagCriteria: ['1.1.1'],
        },
      }));
    });

    const brokenSemanticTags = this.findBrokenSemanticTags(html);
    brokenSemanticTags.forEach(({ selector, issue }) => {
      results.push(this.createResult(context, {
        title: 'Invalid Semantic HTML',
        description: issue,
        severity: Severity.LOW,
        location: { url, selector },
        evidence: selector,
        whyItMatters: 'Proper semantic HTML improves accessibility, SEO, and code maintainability.',
        possibleCause: 'Misunderstanding of semantic HTML elements or copy-paste errors.',
        recommendedFix: 'Use semantic elements correctly: <header>, <nav>, <main>, <article>, <section>, <aside>, <footer>.',
        estimatedImpact: 'Low - Minor impact on SEO and accessibility',
        confidenceScore: 0.8,
      }));
    });

    return results;
  }

  private findDuplicateIds(html: string): Array<{ ids: string[]; selector: string }> {
    const idPattern = /id="([^"]+)"/g;
    const idMap = new Map<string, string[]>();
    const selectorMap = new Map<string, string[]>();
    let match;

    while ((match = idPattern.exec(html)) !== null) {
      const id = match[1] ?? '';
      const beforeMatch = html.substring(0, match.index);
      const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
      const selector = `[id="${id}"]`;

      if (!idMap.has(id)) {
        idMap.set(id, []);
        selectorMap.set(id, []);
      }
      idMap.get(id)?.push(id);
      selectorMap.get(id)?.push(`Line ${lineNumber}: ${selector}`);
    }

    const duplicates: Array<{ ids: string[]; selector: string }> = [];
    for (const [id, ids] of idMap) {
      if (ids.length > 1) {
        duplicates.push({
          ids: [id, ...ids.slice(1)],
          selector: selectorMap.get(id)?.join('; ') || id,
        });
      }
    }
    return duplicates;
  }

  private findMissingAltTags(html: string): Array<{ selector: string; tag: string; isDecorative: boolean }> {
    const imgPattern = /<img([^>]*?)>/gi;
    const missing: Array<{ selector: string; tag: string; isDecorative: boolean }> = [];
    let match;

    while ((match = imgPattern.exec(html)) !== null) {
      const tag = match[0] ?? '';
      const attrs = match[1] ?? '';
      
      if (!attrs.includes('alt=')) {
        const isDecorative = attrs.includes('role="presentation"') || attrs.includes('aria-hidden="true"');
        missing.push({
          selector: 'img',
          tag,
          isDecorative,
        });
      } else if (attrs.match(/alt=["']\s*["']/)) {
        missing.push({
          selector: 'img',
          tag,
          isDecorative: true,
        });
      }
    }
    return missing;
  }

  private findBrokenSemanticTags(html: string): Array<{ selector: string; issue: string }> {
    const issues: Array<{ selector: string; issue: string }> = [];

    const headerInSection = /<section[^>]*>[\s\S]*?<header[^>]*>[\s\S]*?<\/header>[\s\S]*?<\/section>/gi;
    if (headerInSection.test(html)) {
      issues.push({
        selector: 'section > header',
        issue: 'Header element used inside a section element without proper nesting.',
      });
    }

    const divInArticle = /<article[^>]*>[\s\S]*?<div[^>]*>[\s\S]*?<\/div>[\s\S]*?<\/article>/gi;
    const divInArticleMatches = html.match(divInArticle);
    if (divInArticleMatches) {
      for (const match of divInArticleMatches) {
        const divCount = (match.match(/<div/g) || []).length;
        if (divCount > 3) {
          issues.push({
            selector: 'article > div',
            issue: 'Article contains deeply nested div elements. Consider using semantic sectioning elements.',
          });
        }
      }
    }

    return issues;
  }
}
