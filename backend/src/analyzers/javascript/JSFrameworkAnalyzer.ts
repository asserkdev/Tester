import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class JSFrameworkAnalyzer extends BaseAnalyzer {
  readonly id = 'js-framework-analyzer';
  readonly name = 'JavaScript Framework Detector';
  readonly category = AnalyzerCategory.TECHNOLOGY;
  readonly defaultSeverity = Severity.INFO;
  readonly description = 'Detects JavaScript frameworks, libraries, and versions used on the page';

  private readonly detectors = [
    { name: 'React', pattern: /(?:React\.createElement|_jsx|__reactFiber|__reactProps|\bReact\b.*\bversion\b)/i, versionPattern: /React.*version['":\s]*([0-9.]+)/i },
    { name: 'Vue.js', pattern: /(?:__vue__|Vue\.version|vue-app|v-cloak|\bVue\b.*\bversion\b)/i, versionPattern: /Vue.*version['":\s]*([0-9.]+)/i },
    { name: 'Angular', pattern: /(?:ng-version|angular\.version|\bngModule\b|NgZone|__NgContext__)/i, versionPattern: /angular.*version['":\s]*([0-9.]+)/i },
    { name: 'Next.js', pattern: /(?:__NEXT_DATA__|next\/dist|_next\/static)/i, versionPattern: null },
    { name: 'Nuxt.js', pattern: /(?:__NUXT__|nuxt-loading|nuxt-link)/i, versionPattern: null },
    { name: 'Svelte', pattern: /(?:svelte-|\bSvelte\b|__svelte_)/i, versionPattern: null },
    { name: 'jQuery', pattern: /(?:jQuery\.fn\.jquery|window\.\$\.fn|jquery\.min\.js|jquery-\d)/i, versionPattern: /jQuery v([0-9.]+)/i },
    { name: 'Backbone.js', pattern: /(?:Backbone\.VERSION|backbone\.js|backbone\.min)/i, versionPattern: /Backbone.*VERSION['":\s]*([0-9.]+)/i },
    { name: 'Ember.js', pattern: /(?:Ember\.VERSION|ember\.js|ember-source)/i, versionPattern: /Ember.*VERSION['":\s]*([0-9.]+)/i },
    { name: 'Alpine.js', pattern: /(?:x-data=|x-init=|Alpine\.version|alpinejs)/i, versionPattern: null },
    { name: 'Stimulus', pattern: /(?:stimulus|@hotwired\/stimulus)/i, versionPattern: null },
    { name: 'HTMX', pattern: /(?:htmx\.version|hx-get=|hx-post=|htmx\.js)/i, versionPattern: /htmx.*version['":\s]*([0-9.]+)/i },
    { name: 'Astro', pattern: /(?:astro-island|astro:page-load|__ASTRO_)/i, versionPattern: null },
    { name: 'Remix', pattern: /(?:__remixContext|remix-run|__remix)/i, versionPattern: null },
    { name: 'Webpack', pattern: /(?:webpackJsonp|__webpack_require__|webpackChunk)/i, versionPattern: null },
    { name: 'Vite', pattern: /(?:@vite\/client|vite\/modulepreload|__vite)/i, versionPattern: null },
    { name: 'Bootstrap', pattern: /(?:bootstrap\.min|bootstrap\.bundle|bs\.modal|data-bs-)/i, versionPattern: /Bootstrap v([0-9.]+)/i },
    { name: 'Tailwind CSS', pattern: /(?:tailwindcss|tailwind\.config|tw-)/i, versionPattern: null },
    { name: 'Material UI', pattern: /(?:MuiButton|MuiTypography|@mui\/material)/i, versionPattern: null },
    { name: 'Chakra UI', pattern: /(?:chakra-ui|@chakra-ui)/i, versionPattern: null },
    { name: 'WordPress', pattern: /(?:wp-content|wp-includes|WordPress|xmlrpc\.php)/i, versionPattern: /WordPress ([0-9.]+)/i },
    { name: 'Shopify', pattern: /(?:shopify-section|\.myshopify\.com|Shopify\.theme)/i, versionPattern: null },
    { name: 'Drupal', pattern: /(?:drupal\.js|Drupal\.settings|drupal-root)/i, versionPattern: /Drupal ([0-9.]+)/i },
    { name: 'Joomla', pattern: /(?:Joomla\.version|joomla-version|\/components\/com_)/i, versionPattern: null },
    { name: 'Wix', pattern: /(?:wix-warmup-data|\.wixsite\.com|wix\.com\/static)/i, versionPattern: null },
    { name: 'Squarespace', pattern: /(?:squarespace\.com|static\.squarespace\.com|y-block-outer)/i, versionPattern: null },
    { name: 'Webflow', pattern: /(?:webflow\.js|\.webflow\.com|webflow-badge)/i, versionPattern: null },
    { name: 'Ghost', pattern: /(?:ghost-url|content\.ghost\.org|\/ghost\/)/i, versionPattern: null },
  ];

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url } = context.page;

    const detected: Array<{ name: string; version?: string }> = [];

    for (const detector of this.detectors) {
      if (detector.pattern.test(html)) {
        let version: string | undefined;
        if (detector.versionPattern) {
          const versionMatch = html.match(detector.versionPattern);
          version = versionMatch?.[1];
        }
        detected.push({ name: detector.name, version });
      }
    }

    if (detected.length > 0) {
      results.push(this.createResult(context, {
        title: `Technology Stack Detected: ${detected.map(d => d.name).join(', ')}`,
        description: `Identified ${detected.length} technology/framework(s) in use on this page.`,
        severity: Severity.INFO,
        location: { url },
        evidence: detected.map(d => d.version ? `${d.name} v${d.version}` : d.name).join('\n'),
        whyItMatters: 'Knowing the technology stack helps understand what security updates and optimizations apply. Outdated library versions may have known CVEs.',
        possibleCause: 'N/A — informational detection.',
        recommendedFix: 'Verify all detected frameworks are updated to their latest secure versions. Remove unused libraries.',
        estimatedImpact: 'Info - Technology fingerprint',
        confidenceScore: 0.85,
      }));
    }

    // Check for conflicting frameworks
    const hasReact = detected.some(d => d.name === 'React');
    const hasVue = detected.some(d => d.name === 'Vue.js');
    const hasAngular = detected.some(d => d.name === 'Angular');
    const majorFrameworks = [hasReact, hasVue, hasAngular].filter(Boolean).length;

    if (majorFrameworks > 1) {
      results.push(this.createResult(context, {
        title: 'Multiple JavaScript Frameworks Detected',
        description: 'Page appears to use multiple major JavaScript frameworks simultaneously.',
        severity: Severity.HIGH,
        location: { url },
        evidence: detected.filter(d => ['React', 'Vue.js', 'Angular'].includes(d.name)).map(d => d.name).join(', '),
        whyItMatters: 'Loading multiple JS frameworks massively increases bundle size and can cause conflicts. This is almost always unintentional — usually a migration issue or accidental dependency.',
        possibleCause: 'Partial migration from one framework to another, or a UI component library pulling in a different framework.',
        recommendedFix: 'Audit your dependencies and remove unused frameworks. Complete the migration to a single framework.',
        estimatedImpact: 'High - Massive bundle size increase',
        confidenceScore: 0.8,
      }));
    }

    // Check for jQuery alongside modern framework
    const hasJQuery = detected.some(d => d.name === 'jQuery');
    if (hasJQuery && (hasReact || hasVue || hasAngular)) {
      results.push(this.createResult(context, {
        title: 'jQuery Used Alongside Modern Framework',
        description: 'jQuery detected alongside a modern JS framework. jQuery is likely unnecessary.',
        severity: Severity.MEDIUM,
        location: { url },
        evidence: `jQuery + ${detected.filter(d => ['React', 'Vue.js', 'Angular'].includes(d.name)).map(d => d.name).join('/')}`,
        whyItMatters: 'jQuery adds ~90KB to the bundle but its functionality is fully covered by modern frameworks and native browser APIs. It\'s dead weight.',
        possibleCause: 'Legacy dependency on jQuery not removed during modern framework adoption.',
        recommendedFix: 'Remove jQuery. Replace any jQuery usage with native DOM APIs or framework equivalents. See youmightnotneedjquery.com',
        estimatedImpact: 'Medium - ~90KB unnecessary bundle weight',
        confidenceScore: 0.8,
      }));
    }

    return results;
  }
}
