import { analyzerRegistry } from './base/AnalyzerRegistry.js';

// ── Existing Analyzers ──────────────────────────────────────────────────────
import { HTMLValidator } from './html/HTMLValidator.js';
import { CSSValidator } from './css/CSSValidator.js';
import { SecurityHeadersAnalyzer } from './security/SecurityHeadersAnalyzer.js';
import { PerformanceAnalyzer } from './performance/PerformanceAnalyzer.js';
import { AccessibilityAnalyzer } from './accessibility/AccessibilityAnalyzer.js';
import { SEOAnalyzer } from './seo/SEOAnalyzer.js';
import { LinksAnalyzer } from './links/LinksAnalyzer.js';
import { ConsoleAnalyzer } from './console/ConsoleAnalyzer.js';

// ── Security Analyzers ──────────────────────────────────────────────────────
import { HTTPSAnalyzer } from './security/HTTPSAnalyzer.js';
import { CORSAnalyzer } from './security/CORSAnalyzer.js';
import { XSSRiskAnalyzer } from './security/XSSRiskAnalyzer.js';
import { SensitiveDataAnalyzer } from './security/SensitiveDataAnalyzer.js';
import { CookieSecurityAnalyzer } from './security/CookieSecurityAnalyzer.js';
import { InfoDisclosureAnalyzer } from './security/InfoDisclosureAnalyzer.js';
import { ClickjackingAnalyzer } from './security/ClickjackingAnalyzer.js';
import { SubresourceIntegrityAnalyzer } from './security/SubresourceIntegrityAnalyzer.js';

// ── SEO Analyzers ───────────────────────────────────────────────────────────
import { RobotsTxtAnalyzer } from './seo/RobotsTxtAnalyzer.js';
import { SitemapAnalyzer } from './seo/SitemapAnalyzer.js';
import { CanonicalTagAnalyzer } from './seo/CanonicalTagAnalyzer.js';
import { StructuredDataAnalyzer } from './seo/StructuredDataAnalyzer.js';
import { HreflangAnalyzer } from './seo/HreflangAnalyzer.js';
import { SocialTagsAnalyzer } from './seo/SocialTagsAnalyzer.js';
import { ImageAltAnalyzer } from './seo/ImageAltAnalyzer.js';

// ── Performance Analyzers ───────────────────────────────────────────────────
import { RenderBlockingAnalyzer } from './performance/RenderBlockingAnalyzer.js';
import { ImageOptimizationAnalyzer } from './performance/ImageOptimizationAnalyzer.js';
import { FontLoadingAnalyzer } from './performance/FontLoadingAnalyzer.js';
import { CacheHeadersAnalyzer } from './performance/CacheHeadersAnalyzer.js';
import { CompressionAnalyzer } from './performance/CompressionAnalyzer.js';
import { ThirdPartyScriptsAnalyzer } from './performance/ThirdPartyScriptsAnalyzer.js';
import { ResourceHintsAnalyzer } from './performance/ResourceHintsAnalyzer.js';

// ── Accessibility Analyzers ─────────────────────────────────────────────────
import { ARIAAnalyzer } from './accessibility/ARIAAnalyzer.js';
import { ColorContrastAnalyzer } from './accessibility/ColorContrastAnalyzer.js';
import { FocusManagementAnalyzer } from './accessibility/FocusManagementAnalyzer.js';
import { SkipLinksAnalyzer } from './accessibility/SkipLinksAnalyzer.js';

// ── PWA Analyzers ───────────────────────────────────────────────────────────
import { ManifestAnalyzer } from './pwa/ManifestAnalyzer.js';
import { ServiceWorkerAnalyzer } from './pwa/ServiceWorkerAnalyzer.js';

// ── Network Analyzers ───────────────────────────────────────────────────────
import { LocalStorageAnalyzer } from './storage/LocalStorageAnalyzer.js';
import { MixedContentAnalyzer } from './network/MixedContentAnalyzer.js';
import { BrokenImagesAnalyzer } from './network/BrokenImagesAnalyzer.js';
import { RedirectAnalyzer } from './network/RedirectAnalyzer.js';

// ── JavaScript / CSS / Tech Analyzers ──────────────────────────────────────
import { JSQualityAnalyzer } from './javascript/JSQualityAnalyzer.js';
import { JSFrameworkAnalyzer } from './javascript/JSFrameworkAnalyzer.js';
import { UnusedCSSAnalyzer } from './css/UnusedCSSAnalyzer.js';
import { ResponsiveAnalyzer } from './responsive/ResponsiveAnalyzer.js';
import { TechStackAnalyzer } from './technology/TechStackAnalyzer.js';

// ── Privacy / Forms / Navigation Analyzers ─────────────────────────────────
import { PrivacyAnalyzer } from './privacy/PrivacyAnalyzer.js';
import { FormsAnalyzer } from './forms/FormsAnalyzer.js';
import { NavigationAnalyzer } from './navigation/NavigationAnalyzer.js';
import { ImageAnalyzer } from './images/ImageAnalyzer.js';
import { MetadataAnalyzer } from './metadata/MetadataAnalyzer.js';

// ── Register all analyzers ──────────────────────────────────────────────────
const analyzers = [
  // Core / existing
  new HTMLValidator(),
  new CSSValidator(),
  new SecurityHeadersAnalyzer(),
  new PerformanceAnalyzer(),
  new AccessibilityAnalyzer(),
  new SEOAnalyzer(),
  new LinksAnalyzer(),
  new ConsoleAnalyzer(),

  // Security
  new HTTPSAnalyzer(),
  new CORSAnalyzer(),
  new XSSRiskAnalyzer(),
  new SensitiveDataAnalyzer(),
  new CookieSecurityAnalyzer(),
  new InfoDisclosureAnalyzer(),
  new ClickjackingAnalyzer(),
  new SubresourceIntegrityAnalyzer(),

  // SEO
  new RobotsTxtAnalyzer(),
  new SitemapAnalyzer(),
  new CanonicalTagAnalyzer(),
  new StructuredDataAnalyzer(),
  new HreflangAnalyzer(),
  new SocialTagsAnalyzer(),
  new ImageAltAnalyzer(),

  // Performance
  new RenderBlockingAnalyzer(),
  new ImageOptimizationAnalyzer(),
  new FontLoadingAnalyzer(),
  new CacheHeadersAnalyzer(),
  new CompressionAnalyzer(),
  new ThirdPartyScriptsAnalyzer(),
  new ResourceHintsAnalyzer(),

  // Accessibility
  new ARIAAnalyzer(),
  new ColorContrastAnalyzer(),
  new FocusManagementAnalyzer(),
  new SkipLinksAnalyzer(),

  // PWA
  new ManifestAnalyzer(),
  new ServiceWorkerAnalyzer(),

  // Network / Storage
  new LocalStorageAnalyzer(),
  new MixedContentAnalyzer(),
  new BrokenImagesAnalyzer(),
  new RedirectAnalyzer(),

  // JavaScript / CSS / Tech
  new JSQualityAnalyzer(),
  new JSFrameworkAnalyzer(),
  new UnusedCSSAnalyzer(),
  new ResponsiveAnalyzer(),
  new TechStackAnalyzer(),

  // Privacy / Forms / Navigation / Images / Metadata
  new PrivacyAnalyzer(),
  new FormsAnalyzer(),
  new NavigationAnalyzer(),
  new ImageAnalyzer(),
  new MetadataAnalyzer(),
];

analyzers.forEach((analyzer) => {
  analyzerRegistry.register(analyzer);
});

console.log(`[Analyzers] Registered ${analyzerRegistry.count()} analyzers`);
