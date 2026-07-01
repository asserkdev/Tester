import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class LinksAnalyzer extends BaseAnalyzer {
  readonly id = 'links-analyzer';
  readonly name = 'Links Analyzer';
  readonly category = AnalyzerCategory.LINKS;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Checks for broken links and navigation issues';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    const brokenLinks = this.findBrokenLinks(html);
    brokenLinks.forEach((link) => {
      results.push(this.createResult(context, {
        title: 'Link Issue Detected',
        description: link.description,
        severity: Severity.LOW,
        location: { url, selector: link.selector, element: link.tag },
        evidence: link.href,
        whyItMatters: 'Broken links can frustrate users and harm SEO.',
        possibleCause: link.cause,
        recommendedFix: link.recommendedFix,
        estimatedImpact: 'Medium - Affects user experience',
        confidenceScore: 0.85,
      }));
    });

    return results;
  }

  private findBrokenLinks(html: string): Array<{
    href: string;
    selector: string;
    tag: string;
    description: string;
    cause: string;
    recommendedFix: string;
  }> {
    const issues: Array<{
      href: string;
      selector: string;
      tag: string;
      description: string;
      cause: string;
      recommendedFix: string;
    }> = [];

    const linkPattern = /<a([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi;
    let match;

    while ((match = linkPattern.exec(html)) !== null) {
      const fullTag = match[0] ?? '';
      const href = match[2] ?? '';

      if (href === '#' || href === '') {
        issues.push({
          href,
          selector: 'a',
          tag: fullTag,
          description: 'Link has empty or placeholder href.',
          cause: 'Empty href attribute used as placeholder.',
          recommendedFix: 'Add a valid URL or use button element if not a link.',
        });
      }

      if (href === 'javascript:void(0)' || href === 'javascript:;') {
        issues.push({
          href,
          selector: 'a',
          tag: fullTag,
          description: 'Link uses JavaScript void instead of proper navigation.',
          cause: 'Using JavaScript for navigation instead of proper URLs.',
          recommendedFix: 'Use proper URL or <button> element if no navigation is needed.',
        });
      }
    }

    return issues;
  }
}
