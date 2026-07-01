import { analyzerRegistry } from './base/AnalyzerRegistry.js';

// HTML Analyzers
import { HTMLValidator } from './html/HTMLValidator.js';

// CSS Analyzers
import { CSSValidator } from './css/CSSValidator.js';

// Security Analyzers
import { SecurityHeadersAnalyzer } from './security/SecurityHeadersAnalyzer.js';

// Performance Analyzers
import { PerformanceAnalyzer } from './performance/PerformanceAnalyzer.js';

// Accessibility Analyzers
import { AccessibilityAnalyzer } from './accessibility/AccessibilityAnalyzer.js';

// SEO Analyzers
import { SEOAnalyzer } from './seo/SEOAnalyzer.js';

// Links Analyzers
import { LinksAnalyzer } from './links/LinksAnalyzer.js';

// Console Analyzers
import { ConsoleAnalyzer } from './console/ConsoleAnalyzer.js';

// Register all analyzers
const analyzers = [
  new HTMLValidator(),
  new CSSValidator(),
  new SecurityHeadersAnalyzer(),
  new PerformanceAnalyzer(),
  new AccessibilityAnalyzer(),
  new SEOAnalyzer(),
  new LinksAnalyzer(),
  new ConsoleAnalyzer(),
];

analyzers.forEach((analyzer) => {
  analyzerRegistry.register(analyzer);
});

console.log(`[Analyzers] Registered ${analyzerRegistry.count()} analyzers`);
