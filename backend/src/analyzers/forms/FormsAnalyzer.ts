import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class FormsAnalyzer extends BaseAnalyzer {
  readonly id = 'forms-analyzer';
  readonly name = 'Forms Analyzer';
  readonly category = AnalyzerCategory.FORMS;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Analyzes HTML forms for usability, accessibility, and security issues';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    // Extract all forms
    const formPattern = /<form([^>]*?)>([\s\S]*?)<\/form>/gi;
    let match;
    const forms: Array<{ attrs: string; content: string }> = [];
    while ((match = formPattern.exec(html)) !== null) {
      forms.push({ attrs: match[1] ?? '', content: match[2] ?? '' });
    }

    if (forms.length === 0) return results;

    let passwordFieldsWithoutAutocomplete = 0;
    let formsWithoutNoValidate = 0;
    let inputsWithoutAutocomplete = 0;
    const httpForms: string[] = [];

    for (const form of forms) {
      const { attrs, content } = form;

      // Check for forms submitting over HTTP
      const actionMatch = attrs.match(/action=["']([^"']+)["']/i);
      if (actionMatch) {
        const action = actionMatch[1] ?? '';
        if (action.startsWith('http://') && !action.includes('localhost')) {
          httpForms.push(action);
        }
      }

      // Check password fields for autocomplete
      const passwordInputs = [...content.matchAll(/<input[^>]*type=["']password["'][^>]*>/gi)];
      for (const pwInput of passwordInputs) {
        const pwTag = pwInput[0] ?? '';
        if (!pwTag.includes('autocomplete=')) {
          passwordFieldsWithoutAutocomplete++;
        }
      }

      // Check for inputs without autocomplete
      const allInputs = [...content.matchAll(/<input([^>]*?)>/gi)];
      for (const inputMatch of allInputs) {
        const inputAttrs = inputMatch[1] ?? '';
        const type = (inputAttrs.match(/type=["']([^"']+)["']/i)?.[1] ?? 'text').toLowerCase();
        if (['text', 'email', 'tel', 'url', 'number', 'search'].includes(type) && !inputAttrs.includes('autocomplete=')) {
          inputsWithoutAutocomplete++;
        }
      }
    }

    if (httpForms.length > 0) {
      results.push(this.createResult(context, {
        title: `${httpForms.length} Form(s) Submitting Over HTTP`,
        description: `Found ${httpForms.length} form(s) with action URLs using HTTP, sending form data unencrypted.`,
        severity: Severity.CRITICAL,
        location: { url },
        evidence: httpForms.slice(0, 3).join('\n'),
        whyItMatters: 'Form data (including passwords, personal info, payment data) is transmitted in plaintext over HTTP and can be intercepted by network attackers.',
        possibleCause: 'Form action URL not updated to HTTPS.',
        recommendedFix: 'Change all form action URLs to use https://.',
        estimatedImpact: 'Critical - Form data transmitted in plaintext',
        confidenceScore: 0.95,
        metadata: { cwe: ['CWE-319', 'CWE-311'] },
      }));
    }

    if (passwordFieldsWithoutAutocomplete > 0) {
      results.push(this.createResult(context, {
        title: `${passwordFieldsWithoutAutocomplete} Password Field(s) Missing autocomplete`,
        description: `${passwordFieldsWithoutAutocomplete} password input(s) missing autocomplete attribute.`,
        severity: Severity.MEDIUM,
        location: { url },
        whyItMatters: 'Without autocomplete="current-password" or "new-password", password managers may not correctly identify the field, degrading usability and security.',
        possibleCause: 'autocomplete attribute not specified on password fields.',
        recommendedFix: 'Add autocomplete="current-password" to login forms and autocomplete="new-password" to registration/change-password forms.',
        estimatedImpact: 'Medium - Password manager integration broken',
        confidenceScore: 0.85,
        metadata: { wcagCriteria: ['1.3.5'] },
      }));
    }

    if (inputsWithoutAutocomplete > 3) {
      results.push(this.createResult(context, {
        title: `${inputsWithoutAutocomplete} Input(s) Missing autocomplete Attribute`,
        description: `${inputsWithoutAutocomplete} text/email/phone inputs missing autocomplete hints.`,
        severity: Severity.LOW,
        location: { url },
        whyItMatters: 'Without autocomplete attributes, browsers and password managers cannot pre-fill form fields. Users with motor disabilities especially benefit from autocomplete.',
        possibleCause: 'autocomplete attribute not specified.',
        recommendedFix: 'Add appropriate autocomplete values: email, name, tel, street-address, postal-code, etc. See https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete',
        estimatedImpact: 'Low - Reduced form usability, WCAG 1.3.5 consideration',
        confidenceScore: 0.8,
        metadata: { wcagCriteria: ['1.3.5'] },
      }));
    }

    // Check for forms without method specified (defaults to GET — bad for sensitive data)
    const postFormsWithSensitiveFields = forms.filter(f => {
      const hasPassword = /<input[^>]*type=["']password["']/i.test(f.content);
      const hasEmail = /<input[^>]*type=["']email["']/i.test(f.content);
      const methodMatch = f.attrs.match(/method=["']([^"']+)["']/i);
      const method = (methodMatch?.[1] ?? 'get').toLowerCase();
      return (hasPassword || hasEmail) && method === 'get';
    });

    if (postFormsWithSensitiveFields.length > 0) {
      results.push(this.createResult(context, {
        title: `${postFormsWithSensitiveFields.length} Login/Sensitive Form(s) Using GET Method`,
        description: `Form(s) with password/email fields use GET method, sending sensitive data in the URL.`,
        severity: Severity.CRITICAL,
        location: { url },
        whyItMatters: 'GET requests append form data to the URL: passwords and emails appear in server logs, browser history, referrer headers, and analytics tools.',
        possibleCause: 'Form method not specified (defaults to GET) or incorrectly set.',
        recommendedFix: 'Change login and sensitive forms to use method="POST".',
        estimatedImpact: 'Critical - Passwords logged in server access logs',
        confidenceScore: 0.95,
        metadata: { cwe: ['CWE-598'] },
      }));
    }

    return results;
  }
}
