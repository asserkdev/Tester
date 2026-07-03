import { BaseAnalyzer } from '../base/Analyzer.js';
import { AnalyzerCategory, Severity } from '../../types/index.js';
import type { AnalyzerResult, AnalysisContext } from '../../types/index.js';

export class ManifestAnalyzer extends BaseAnalyzer {
  readonly id = 'manifest-analyzer';
  readonly name = 'Web App Manifest Analyzer';
  readonly category = AnalyzerCategory.PWA;
  readonly defaultSeverity = Severity.MEDIUM;
  readonly description = 'Validates the Web App Manifest for PWA installability';

  async run(context: AnalysisContext): Promise<AnalyzerResult[]> {
    const results: AnalyzerResult[] = [];
    const { html, url, resources } = context.page;

    // Check for manifest link
    const manifestLinkMatch = html.match(/<link[^>]+rel=["']manifest["'][^>]+href=["']([^"']+)["']/i) ||
                              html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']manifest["']/i);

    if (!manifestLinkMatch) {
      results.push(this.createResult(context, {
        title: 'No Web App Manifest Found',
        description: 'Page does not link to a Web App Manifest file.',
        severity: Severity.MEDIUM,
        location: { url },
        whyItMatters: 'Without a manifest, the site cannot be installed as a PWA. Users lose the ability to add to home screen, and the app won\'t get its own launch icon, splash screen, or standalone window.',
        possibleCause: 'Manifest not created or not linked in HTML.',
        recommendedFix: 'Create a manifest.json file and link it: <link rel="manifest" href="/manifest.json">',
        estimatedImpact: 'Medium - Site not installable as PWA',
        confidenceScore: 0.95,
      }));
      return results;
    }

    // Try to find manifest content in resources
    const manifestUrl = manifestLinkMatch[1] ?? '';
    const manifestResource = resources.find(r =>
      r.url.includes('manifest') && (r.url.endsWith('.json') || r.url.endsWith('manifest'))
    );

    if (manifestResource && manifestResource.status === 404) {
      results.push(this.createResult(context, {
        title: 'Web App Manifest Returns 404',
        description: `Manifest file referenced at "${manifestUrl}" returns a 404 error.`,
        severity: Severity.HIGH,
        location: { url: manifestUrl },
        evidence: 'HTTP 404',
        whyItMatters: 'A missing manifest prevents PWA installation and may trigger browser warnings.',
        possibleCause: 'Manifest file not deployed, or path in link element is wrong.',
        recommendedFix: 'Ensure the manifest.json file exists at the referenced path and is served correctly.',
        estimatedImpact: 'High - PWA functionality broken',
        confidenceScore: 0.95,
      }));
    }

    // Check for theme-color meta tag
    if (!html.match(/<meta[^>]+name=["']theme-color["']/i)) {
      results.push(this.createResult(context, {
        title: 'Missing theme-color Meta Tag',
        description: 'Page has no <meta name="theme-color"> tag.',
        severity: Severity.LOW,
        location: { url },
        whyItMatters: 'theme-color controls the browser UI color on Android Chrome and other mobile browsers, providing a branded experience.',
        possibleCause: 'Theme color not configured.',
        recommendedFix: 'Add: <meta name="theme-color" content="#your-brand-color">',
        estimatedImpact: 'Low - Browser UI not branded',
        confidenceScore: 0.9,
      }));
    }

    // Check for apple-touch-icon (iOS installability)
    if (!html.match(/<link[^>]+rel=["']apple-touch-icon["']/i)) {
      results.push(this.createResult(context, {
        title: 'Missing Apple Touch Icon',
        description: 'No apple-touch-icon link found for iOS home screen installation.',
        severity: Severity.LOW,
        location: { url },
        whyItMatters: 'Without an Apple touch icon, iOS uses a screenshot of your page as the home screen icon, which looks unprofessional.',
        possibleCause: 'iOS-specific icon not added.',
        recommendedFix: 'Add: <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
        estimatedImpact: 'Low - Poor appearance on iOS home screen',
        confidenceScore: 0.9,
      }));
    }

    // Check for viewport meta (required for mobile)
    if (!html.match(/<meta[^>]+name=["']viewport["']/i)) {
      results.push(this.createResult(context, {
        title: 'Missing Viewport Meta Tag',
        description: 'Page has no viewport meta tag, causing incorrect rendering on mobile devices.',
        severity: Severity.HIGH,
        location: { url },
        whyItMatters: 'Without a viewport meta tag, mobile browsers render the page at desktop width and scale it down, making text tiny and the site unusable without zooming.',
        possibleCause: 'Viewport meta tag not added.',
        recommendedFix: 'Add: <meta name="viewport" content="width=device-width, initial-scale=1">',
        estimatedImpact: 'High - Site unusable on mobile without zoom',
        confidenceScore: 0.95,
      }));
    }

    return results;
  }
}
