import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class ConsoleAnalyzer extends BaseAnalyzer {
  readonly id = 'console-analyzer';
  readonly name = 'Console Errors Analyzer';
  readonly category = AnalyzerCategory.CONSOLE;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Analyzes browser console messages for errors and warnings';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { consoleMessages, url } = context.page;

    const errors = consoleMessages.filter((m) => m.type === 'error');
    errors.forEach((error) => {
      results.push(this.createResult(context, {
        title: 'Console Error',
        description: error.message,
        severity: this.getSeverityFromMessage(error.message),
        location: { url, element: error.location },
        evidence: error.message,
        whyItMatters: 'Console errors may indicate JavaScript issues that affect functionality.',
        possibleCause: 'JavaScript error in page code or third-party scripts.',
        recommendedFix: 'Review the error and fix the underlying JavaScript issue.',
        estimatedImpact: 'Medium - May affect functionality',
        confidenceScore: 0.9,
      }));
    });

    const warnings = consoleMessages.filter((m) => m.type === 'warn');
    if (warnings.length > 5) {
      results.push(this.createResult(context, {
        title: 'Excessive Console Warnings',
        description: `Found ${warnings.length} console warnings.`,
        severity: Severity.LOW,
        location: { url },
        evidence: `${warnings.length} warnings found`,
        whyItMatters: 'Many warnings may indicate code quality issues.',
        possibleCause: 'Third-party scripts or unoptimized code.',
        recommendedFix: 'Review and address console warnings.',
        estimatedImpact: 'Low - Minor code quality issue',
        confidenceScore: 0.8,
      }));
    }

    return results;
  }

  private getSeverityFromMessage(message: string): Severity {
    const criticalPatterns = ['uncaught', 'unhandled', 'fatal', 'crash', 'security'];
    const highPatterns = ['error', 'failed', 'exception'];

    const lowerMessage = message.toLowerCase();

    for (const pattern of criticalPatterns) {
      if (lowerMessage.includes(pattern)) return Severity.HIGH;
    }
    for (const pattern of highPatterns) {
      if (lowerMessage.includes(pattern)) return Severity.MEDIUM;
    }
    return Severity.LOW;
  }
}
