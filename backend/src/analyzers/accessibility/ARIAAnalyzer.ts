import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class ARIAAnalyzer extends BaseAnalyzer {
  readonly id = 'aria-analyzer';
  readonly name = 'ARIA Roles & Attributes Analyzer';
  readonly category = AnalyzerCategory.ACCESSIBILITY;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Validates ARIA roles, states, and properties for correct usage';

  private readonly validRoles = new Set([
    'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
    'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
    'contentinfo', 'definition', 'dialog', 'directory', 'document',
    'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
    'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
    'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
    'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation',
    'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
    'rowheader', 'scrollbar', 'search', 'searchbox', 'separator',
    'slider', 'spinbutton', 'status', 'switch', 'tab', 'table',
    'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar',
    'tooltip', 'tree', 'treegrid', 'treeitem',
  ]);

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    // Check for invalid ARIA roles
    const rolePattern = /role=["']([^"']+)["']/gi;
    const invalidRoles: string[] = [];
    let match;
    while ((match = rolePattern.exec(html)) !== null) {
      const roles = (match[1] ?? '').split(/\s+/);
      for (const role of roles) {
        if (role && !this.validRoles.has(role.toLowerCase())) {
          invalidRoles.push(role);
        }
      }
    }

    if (invalidRoles.length > 0) {
      results.push(this.createResult(context, {
        title: `Invalid ARIA Role(s): ${[...new Set(invalidRoles)].slice(0, 3).join(', ')}`,
        description: `Found ${invalidRoles.length} invalid ARIA role value(s). Screen readers will ignore unknown roles.`,
        severity: Severity.HIGH,
        location: { url },
        evidence: [...new Set(invalidRoles)].slice(0, 5).map(r => `role="${r}"`).join('\n'),
        whyItMatters: 'Invalid ARIA roles are ignored by assistive technologies. Users with screen readers won\'t receive the intended semantic information.',
        possibleCause: 'Typo in role name or using a non-standard/vendor-specific role.',
        recommendedFix: 'Use only valid ARIA roles from the WAI-ARIA specification. Check https://www.w3.org/TR/wai-aria/ for the complete list.',
        estimatedImpact: 'High - Screen readers receive wrong or no semantic information',
        confidenceScore: 0.9,
        metadata: { wcagCriteria: ['4.1.2'], cwe: [] },
      }));
    }

    // Check for aria-label on non-interactive elements
    const ariaLabelPattern = /<(\w+)([^>]*?)\baria-label=["'][^"']+["']([^>]*?)>/gi;
    const nonInteractiveTags = new Set(['div', 'span', 'p', 'section', 'article', 'main', 'aside', 'header', 'footer', 'nav']);
    const misusedAriaLabels: string[] = [];
    while ((match = ariaLabelPattern.exec(html)) !== null) {
      const tag = (match[1] ?? '').toLowerCase();
      const attrs = (match[2] ?? '') + (match[3] ?? '');
      if (nonInteractiveTags.has(tag) && !attrs.includes('role=') && !attrs.includes('tabindex=')) {
        misusedAriaLabels.push(`<${tag}>`);
      }
    }

    if (misusedAriaLabels.length > 2) {
      results.push(this.createResult(context, {
        title: `aria-label on Non-Interactive Elements (${misusedAriaLabels.length})`,
        description: `Found ${misusedAriaLabels.length} non-interactive element(s) (div, span, etc.) with aria-label but no role.`,
        severity: Severity.LOW,
        location: { url },
        evidence: [...new Set(misusedAriaLabels)].slice(0, 5).join(', '),
        whyItMatters: 'aria-label is only announced by screen readers on interactive elements or elements with ARIA roles. Labels on plain div/span elements are often ignored.',
        possibleCause: 'aria-label added without corresponding role.',
        recommendedFix: 'Add an appropriate role alongside aria-label, or use a semantic HTML element (button, a, etc.) instead.',
        estimatedImpact: 'Low - Labels may be silently ignored',
        confidenceScore: 0.75,
        metadata: { wcagCriteria: ['4.1.2'] },
      }));
    }

    // Check for aria-hidden="true" on focusable elements
    const ariaHiddenFocusable = /<(a|button|input|select|textarea|area)([^>]*?)\baria-hidden=["']true["']([^>]*?)>/gi;
    const hiddenFocusable: string[] = [];
    while ((match = ariaHiddenFocusable.exec(html)) !== null) {
      const tag = match[1] ?? '';
      const attrs = (match[2] ?? '') + (match[3] ?? '');
      // Check it doesn't have tabindex="-1"
      if (!attrs.includes('tabindex="-1"') && !attrs.includes("tabindex='-1'")) {
        hiddenFocusable.push(`<${tag}>`);
      }
    }

    if (hiddenFocusable.length > 0) {
      results.push(this.createResult(context, {
        title: `Focusable Elements Hidden from Accessibility Tree (${hiddenFocusable.length})`,
        description: `${hiddenFocusable.length} interactive element(s) have aria-hidden="true" but remain keyboard-focusable.`,
        severity: Severity.HIGH,
        location: { url },
        evidence: hiddenFocusable.slice(0, 5).join(', '),
        whyItMatters: 'Keyboard users can focus these elements, but screen readers won\'t announce them. This creates a confusing experience where focus moves to seemingly empty areas.',
        possibleCause: 'aria-hidden applied to hide visual decoration but accidentally applied to interactive elements.',
        recommendedFix: 'Add tabindex="-1" to elements with aria-hidden="true" to remove them from keyboard focus order, or remove aria-hidden if the element should be accessible.',
        estimatedImpact: 'High - Keyboard/screen reader users encounter invisible focus targets',
        confidenceScore: 0.9,
        metadata: { wcagCriteria: ['1.3.1', '4.1.2'] },
      }));
    }

    // Check for duplicate IDs used by ARIA (aria-labelledby, aria-describedby)
    const ariaRefPattern = /aria-(?:labelledby|describedby|controls|owns)=["']([^"']+)["']/gi;
    const referencedIds: string[] = [];
    while ((match = ariaRefPattern.exec(html)) !== null) {
      referencedIds.push(...(match[1] ?? '').split(/\s+/));
    }

    const idPattern = /\bid=["']([^"']+)["']/gi;
    const allIds: Record<string, number> = {};
    while ((match = idPattern.exec(html)) !== null) {
      const id = match[1] ?? '';
      allIds[id] = (allIds[id] || 0) + 1;
    }

    const brokenRefs = referencedIds.filter(id => !allIds[id]);
    if (brokenRefs.length > 0) {
      results.push(this.createResult(context, {
        title: `ARIA References Point to Non-Existent IDs (${brokenRefs.length})`,
        description: `Found ${brokenRefs.length} aria-labelledby/aria-describedby reference(s) pointing to IDs that don't exist in the DOM.`,
        severity: Severity.HIGH,
        location: { url },
        evidence: brokenRefs.slice(0, 5).join(', '),
        whyItMatters: 'Broken ARIA references mean screen readers cannot find and announce the referenced element. Labels and descriptions are silently lost.',
        possibleCause: 'ID mismatch between ARIA reference and the target element, or target removed from DOM dynamically.',
        recommendedFix: 'Ensure the IDs referenced in aria-labelledby/aria-describedby exist in the DOM and match exactly (case-sensitive).',
        estimatedImpact: 'High - Screen reader labels/descriptions not working',
        confidenceScore: 0.9,
        metadata: { wcagCriteria: ['1.3.1', '4.1.2'] },
      }));
    }

    return results;
  }
}
