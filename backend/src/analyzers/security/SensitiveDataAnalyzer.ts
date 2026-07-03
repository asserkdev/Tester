import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class SensitiveDataAnalyzer extends BaseAnalyzer {
  readonly id = 'sensitive-data-analyzer';
  readonly name = 'Sensitive Data Exposure Analyzer';
  readonly category = AnalyzerCategory.SECURITY;
  readonly defaultSeverity = Severity.HIGH;
  readonly description = 'Detects accidentally exposed API keys, secrets, emails, and sensitive data in page source';

  private readonly patterns = [
    {
      name: 'API Key',
      pattern: /(['"`]?(?:api[_-]?key|apikey|api[_-]?secret)['"`]?\s*[:=]\s*['"`]([A-Za-z0-9_\-]{20,})['"`])/gi,
      severity: Severity.CRITICAL,
      cwe: ['CWE-312', 'CWE-798'],
    },
    {
      name: 'AWS Access Key',
      pattern: /(AKIA[0-9A-Z]{16})/g,
      severity: Severity.CRITICAL,
      cwe: ['CWE-312', 'CWE-798'],
    },
    {
      name: 'Private Key',
      pattern: /(-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/g,
      severity: Severity.CRITICAL,
      cwe: ['CWE-312', 'CWE-321'],
    },
    {
      name: 'Password in Source',
      pattern: /(['"`]?password['"`]?\s*[:=]\s*['"`]([^'"`\s]{6,})['"`])/gi,
      severity: Severity.CRITICAL,
      cwe: ['CWE-312', 'CWE-259'],
    },
    {
      name: 'JWT Token',
      pattern: /(eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)/g,
      severity: Severity.HIGH,
      cwe: ['CWE-312', 'CWE-522'],
    },
    {
      name: 'GitHub Token',
      pattern: /(gh[pousr]_[A-Za-z0-9]{36}|ghp_[A-Za-z0-9]{36})/g,
      severity: Severity.CRITICAL,
      cwe: ['CWE-312', 'CWE-798'],
    },
    {
      name: 'Stripe Secret Key',
      pattern: /(sk_live_[A-Za-z0-9]{24,})/g,
      severity: Severity.CRITICAL,
      cwe: ['CWE-312', 'CWE-798'],
    },
    {
      name: 'Database Connection String',
      pattern: /(mongodb|postgresql|mysql|redis):\/\/[^:]+:[^@]+@[^\s'"<>]+/gi,
      severity: Severity.CRITICAL,
      cwe: ['CWE-312', 'CWE-798'],
    },
    {
      name: 'Email Address',
      pattern: /\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/g,
      severity: Severity.LOW,
      cwe: ['CWE-200'],
    },
    {
      name: 'Internal IP Address',
      pattern: /\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/g,
      severity: Severity.MEDIUM,
      cwe: ['CWE-200'],
    },
    {
      name: 'TODO with Sensitive Keywords',
      pattern: /\/\/\s*TODO[:\s].*(password|secret|key|token|auth|credential)/gi,
      severity: Severity.MEDIUM,
      cwe: ['CWE-200'],
    },
    {
      name: 'Hardcoded Bearer Token',
      pattern: /Authorization:\s*['"`]?Bearer\s+([A-Za-z0-9\-_\.]{20,})/gi,
      severity: Severity.CRITICAL,
      cwe: ['CWE-312', 'CWE-798'],
    },
  ];

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    // Avoid scanning minified JS which may contain false positives
    const scriptContent = this.extractScriptContent(html);
    const textContent = html;

    const foundTypes = new Set<string>();

    for (const detector of this.patterns) {
      const matches: string[] = [];
      const pattern = new RegExp(detector.pattern.source, detector.pattern.flags);
      let match;
      while ((match = pattern.exec(textContent)) !== null) {
        const found = match[1] ?? match[0] ?? '';
        // Filter out obviously fake/example values
        if (!this.isFakeValue(found) && !foundTypes.has(detector.name + found.slice(0, 10))) {
          matches.push(found.slice(0, 80));
          foundTypes.add(detector.name + found.slice(0, 10));
        }
        if (matches.length >= 3) break;
      }

      if (matches.length > 0) {
        const redacted = matches.map(m => this.redact(m));
        results.push(this.createResult(context, {
          title: `Sensitive Data Exposed: ${detector.name}`,
          description: `Found ${matches.length} potential ${detector.name} value(s) in page source. Sensitive data should never be in client-side code.`,
          severity: detector.severity,
          location: { url },
          evidence: redacted.join('\n'),
          whyItMatters: `${detector.name} values in client-side code are accessible to anyone who views the page source. Attackers actively scrape websites for these patterns.`,
          possibleCause: 'Developer accidentally included server-side configuration in frontend bundle, left debug code in, or committed secrets to the frontend codebase.',
          recommendedFix: 'Remove the secret immediately. Move all sensitive values to server-side environment variables. Rotate any exposed credentials. Use a secret scanner (truffleHog, git-secrets) in your CI pipeline.',
          estimatedImpact: 'Critical - Immediate security risk if credential is active',
          confidenceScore: 0.8,
          metadata: { cwe: detector.cwe },
        }));
      }
    }

    return results;
  }

  private extractScriptContent(html: string): string {
    const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let content = '';
    let match;
    while ((match = scriptPattern.exec(html)) !== null) {
      content += match[1] + '\n';
    }
    return content;
  }

  private isFakeValue(value: string): boolean {
    const fakePatterns = [
      'example', 'placeholder', 'your_', 'YOUR_', 'INSERT_', 'REPLACE_',
      'xxx', 'XXX', 'test', 'demo', 'sample', '1234567890',
    ];
    return fakePatterns.some(fake => value.toLowerCase().includes(fake.toLowerCase()));
  }

  private redact(value: string): string {
    if (value.length <= 8) return '***';
    return value.slice(0, 4) + '***' + value.slice(-4);
  }
}
