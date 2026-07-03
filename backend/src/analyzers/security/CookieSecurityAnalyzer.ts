import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class CookieSecurityAnalyzer extends BaseAnalyzer {
  readonly id = 'cookie-security-analyzer';
  readonly name = 'Cookie Security Analyzer';
  readonly category = AnalyzerCategory.SECURITY;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Analyzes cookie security flags and storage practices';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { url, resources } = context.page;

    // Analyze Set-Cookie headers from responses
    const setCookieHeaders: string[] = [];
    resources.forEach(r => {
      const headers = (r as any).headers || {};
      const setCookie = headers['set-cookie'];
      if (setCookie) {
        if (Array.isArray(setCookie)) {
          setCookieHeaders.push(...setCookie);
        } else {
          setCookieHeaders.push(setCookie);
        }
      }
    });

    const isHTTPS = url.startsWith('https://');

    setCookieHeaders.forEach((cookieHeader, idx) => {
      const cookieName = cookieHeader.split('=')[0]?.trim() ?? `Cookie #${idx + 1}`;
      const cookieLower = cookieHeader.toLowerCase();

      // Check HttpOnly flag
      if (!cookieLower.includes('httponly')) {
        results.push(this.createResult(context, {
          title: `Cookie Missing HttpOnly Flag: ${cookieName}`,
          description: `The cookie "${cookieName}" is missing the HttpOnly flag, making it accessible via JavaScript.`,
          severity: this.isSessionCookie(cookieName) ? Severity.HIGH : Severity.MEDIUM,
          location: { url },
          evidence: cookieHeader.slice(0, 100),
          whyItMatters: 'Without HttpOnly, JavaScript (including XSS payloads) can read this cookie. Session cookies without HttpOnly are directly exposed to session hijacking via XSS.',
          possibleCause: 'Cookie set without specifying HttpOnly flag in the server response.',
          recommendedFix: 'Add HttpOnly to all cookies that don\'t need JavaScript access: Set-Cookie: name=value; HttpOnly; Secure; SameSite=Strict',
          estimatedImpact: this.isSessionCookie(cookieName) ? 'High - Session may be stolen via XSS' : 'Medium - Cookie exposed to JS',
          confidenceScore: 0.95,
          metadata: { cwe: ['CWE-1004'] },
        }));
      }

      // Check Secure flag on HTTPS sites
      if (isHTTPS && !cookieLower.includes('; secure') && !cookieLower.includes(',secure')) {
        results.push(this.createResult(context, {
          title: `Cookie Missing Secure Flag: ${cookieName}`,
          description: `The cookie "${cookieName}" on an HTTPS site is missing the Secure flag.`,
          severity: this.isSessionCookie(cookieName) ? Severity.HIGH : Severity.MEDIUM,
          location: { url },
          evidence: cookieHeader.slice(0, 100),
          whyItMatters: 'Without the Secure flag, the cookie can be sent over HTTP connections. If a user ever visits an HTTP version of your site, their cookie is transmitted in plaintext.',
          possibleCause: 'Cookie set without Secure flag.',
          recommendedFix: 'Add Secure flag to cookies on HTTPS sites: Set-Cookie: name=value; Secure; HttpOnly',
          estimatedImpact: 'Medium - Cookie exposed over HTTP',
          confidenceScore: 0.95,
          metadata: { cwe: ['CWE-614'] },
        }));
      }

      // Check SameSite attribute
      if (!cookieLower.includes('samesite')) {
        results.push(this.createResult(context, {
          title: `Cookie Missing SameSite Attribute: ${cookieName}`,
          description: `The cookie "${cookieName}" has no SameSite attribute, potentially enabling CSRF attacks.`,
          severity: this.isSessionCookie(cookieName) ? Severity.HIGH : Severity.LOW,
          location: { url },
          evidence: cookieHeader.slice(0, 100),
          whyItMatters: 'Without SameSite, the browser sends this cookie with cross-site requests (e.g., when a user clicks a link on another site). For session cookies, this enables CSRF attacks.',
          possibleCause: 'Cookie set without SameSite attribute (browsers default to Lax which provides partial protection, but Strict is preferred).',
          recommendedFix: 'Add SameSite=Strict for maximum protection, or SameSite=Lax for compatibility with legitimate cross-site navigation.',
          estimatedImpact: this.isSessionCookie(cookieName) ? 'High - CSRF possible' : 'Low - Minor CSRF risk',
          confidenceScore: 0.9,
          metadata: { cwe: ['CWE-352'] },
        }));
      }

      // Check expiry (very long-lived cookies)
      const maxAgeMatch = cookieLower.match(/max-age=(\d+)/);
      if (maxAgeMatch) {
        const maxAge = parseInt(maxAgeMatch[1] ?? '0', 10);
        if (maxAge > 31536000) { // > 1 year
          results.push(this.createResult(context, {
            title: `Long-Lived Cookie: ${cookieName}`,
            description: `Cookie "${cookieName}" has max-age of ${Math.round(maxAge / 86400)} days (${Math.round(maxAge / 31536000)} year(s)).`,
            severity: Severity.LOW,
            location: { url },
            evidence: `max-age=${maxAge} (${Math.round(maxAge / 86400)} days)`,
            whyItMatters: 'Long-lived session cookies increase the window of opportunity for stolen cookie attacks. A stolen session cookie remains valid for over a year.',
            possibleCause: 'Cookie expiry set to a very long duration for "remember me" functionality or by default.',
            recommendedFix: 'Reduce session cookie lifetime. Use short-lived cookies with refresh token rotation instead of single long-lived tokens.',
            estimatedImpact: 'Low - Extended exposure window for stolen cookies',
            confidenceScore: 0.85,
            metadata: { cwe: ['CWE-539'] },
          }));
        }
      }
    });

    // Check for cookies being set via JavaScript (document.cookie)
    const { html } = context.page;
    const jsCookiePattern = /document\.cookie\s*=\s*/g;
    const jsCookieCount = (html.match(jsCookiePattern) || []).length;
    if (jsCookieCount > 0) {
      results.push(this.createResult(context, {
        title: `${jsCookieCount} Cookie(s) Set via JavaScript`,
        description: `${jsCookieCount} cookie(s) are being set via document.cookie. These cannot have the HttpOnly flag.`,
        severity: Severity.MEDIUM,
        location: { url },
        evidence: `${jsCookieCount} document.cookie = assignments found`,
        whyItMatters: 'Cookies set via document.cookie are always accessible to JavaScript and cannot use the HttpOnly protection flag, making them vulnerable to XSS-based theft.',
        possibleCause: 'Client-side code managing cookies directly instead of the server.',
        recommendedFix: 'Move cookie creation to the server side (Set-Cookie header) with HttpOnly, Secure, and SameSite flags.',
        estimatedImpact: 'Medium - These cookies are exposed to XSS',
        confidenceScore: 0.85,
        metadata: { cwe: ['CWE-1004'] },
      }));
    }

    return results;
  }

  private isSessionCookie(name: string): boolean {
    const sessionPatterns = ['session', 'sess', 'auth', 'token', 'jwt', 'sid', 'user'];
    return sessionPatterns.some(p => name.toLowerCase().includes(p));
  }
}
