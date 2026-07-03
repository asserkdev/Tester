import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class LocalStorageAnalyzer extends BaseAnalyzer {
  readonly id = 'local-storage-analyzer';
  readonly name = 'Storage APIs Analyzer';
  readonly category = AnalyzerCategory.STORAGE;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Analyzes localStorage, sessionStorage usage for security and privacy issues';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    // Check for sensitive data in localStorage
    const lsSetPattern = /localStorage\.setItem\s*\(\s*["']([^"']+)["']\s*,\s*([^)]+)\)/gi;
    const sensitiveKeys = ['password', 'token', 'secret', 'auth', 'jwt', 'key', 'credential', 'ssn', 'card', 'cvv'];
    const sensitiveLS: string[] = [];
    let match;

    while ((match = lsSetPattern.exec(html)) !== null) {
      const key = (match[1] ?? '').toLowerCase();
      if (sensitiveKeys.some(s => key.includes(s))) {
        sensitiveLS.push(match[1] ?? '');
      }
    }

    if (sensitiveLS.length > 0) {
      results.push(this.createResult(context, {
        title: `Sensitive Data Stored in localStorage: ${sensitiveLS.slice(0, 3).join(', ')}`,
        description: `Found ${sensitiveLS.length} potentially sensitive value(s) being stored in localStorage.`,
        severity: Severity.HIGH,
        location: { url },
        evidence: sensitiveLS.map(k => `localStorage.setItem("${k}", ...)`).join('\n'),
        whyItMatters: 'localStorage is accessible to any JavaScript running on the page, including injected XSS payloads. Tokens, passwords, and sensitive data in localStorage are stolen by XSS attacks.',
        possibleCause: 'Authentication tokens or sensitive state stored for persistence.',
        recommendedFix: 'Store authentication tokens in HttpOnly cookies instead of localStorage. HttpOnly cookies cannot be read by JavaScript.',
        estimatedImpact: 'High - Tokens stolen by XSS attacks',
        confidenceScore: 0.85,
        metadata: { cwe: ['CWE-312', 'CWE-922'] },
      }));
    }

    // Check for JSON.parse on localStorage without try-catch
    const unsafeLSParse = /JSON\.parse\s*\(\s*localStorage\.getItem/g;
    const unsafeSSParse = /JSON\.parse\s*\(\s*sessionStorage\.getItem/g;
    const unsafeParseCount = (html.match(unsafeLSParse) || []).length + (html.match(unsafeSSParse) || []).length;

    if (unsafeParseCount > 0) {
      results.push(this.createResult(context, {
        title: `Unsafe JSON.parse of Storage Values (${unsafeParseCount})`,
        description: `Found ${unsafeParseCount} JSON.parse call(s) on storage values without apparent error handling.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: `${unsafeParseCount} unsafe JSON.parse(localStorage/sessionStorage.getItem(...)) calls`,
        whyItMatters: 'If storage contains malformed or manually modified JSON, JSON.parse will throw, crashing the application. Users can also inject invalid JSON into their own storage to trigger errors.',
        possibleCause: 'Storage parsing without error handling.',
        recommendedFix: 'Wrap JSON.parse in try-catch: try { const data = JSON.parse(localStorage.getItem("key")); } catch { /* handle error */ }',
        estimatedImpact: 'Medium - Application crash if storage contains invalid JSON',
        confidenceScore: 0.75,
      }));
    }

    // Check for large data storage (potential quota issues)
    const lsUsagePattern = /localStorage\.setItem\s*\(\s*["'][^"']+["']\s*,\s*JSON\.stringify/g;
    const largeStorageCount = (html.match(lsUsagePattern) || []).length;

    if (largeStorageCount > 3) {
      results.push(this.createResult(context, {
        title: `Frequent localStorage Usage (${largeStorageCount} setItem calls)`,
        description: `Found ${largeStorageCount} localStorage.setItem calls with JSON.stringify. localStorage is limited to 5-10MB.`,
        severity: Severity.LOW,
        location: { url },
        evidence: `${largeStorageCount} localStorage.setItem(key, JSON.stringify(...)) calls`,
        whyItMatters: 'localStorage is limited to 5-10MB per origin. Storing large data can exceed the quota, causing QuotaExceededError that crashes the application.',
        possibleCause: 'Heavy use of localStorage for data persistence.',
        recommendedFix: 'Use IndexedDB for large data storage. Implement storage quota checking and graceful degradation.',
        estimatedImpact: 'Low - Potential storage quota exceeded errors',
        confidenceScore: 0.7,
      }));
    }

    return results;
  }
}
