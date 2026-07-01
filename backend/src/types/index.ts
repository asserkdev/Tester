// Core Types for L.A.I. Web Inspector

export const AnalyzerCategory = {
  ARCHITECTURE: 'architecture',
  HTML: 'html',
  CSS: 'css',
  JAVASCRIPT: 'javascript',
  LINKS: 'links',
  IMAGES: 'images',
  RESOURCES: 'resources',
  CONSOLE: 'console',
  PERFORMANCE: 'performance',
  SEO: 'seo',
  ACCESSIBILITY: 'accessibility',
  SECURITY: 'security',
  NETWORK: 'network',
  PWA: 'pwa',
  STORAGE: 'storage',
  API: 'api',
  RESPONSIVE: 'responsive',
  CROSS_BROWSER: 'cross-browser',
  FORMS: 'forms',
  NAVIGATION: 'navigation',
  METADATA: 'metadata',
  SOCIAL: 'social',
  TECHNOLOGY: 'technology',
  PRIVACY: 'privacy',
} as const;

export type AnalyzerCategory = typeof AnalyzerCategory[keyof typeof AnalyzerCategory];

export const Severity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
} as const;

export type Severity = typeof Severity[keyof typeof Severity];

export const ScanStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type ScanStatus = typeof ScanStatus[keyof typeof ScanStatus];

export const Viewport = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
} as const;

export type Viewport = typeof Viewport[keyof typeof Viewport];

export interface ResultLocation {
  url: string;
  line?: number;
  column?: number;
  selector?: string;
  element?: string;
}

export interface AnalyzerMetadata {
  documentation?: string[];
  relatedIssues?: string[];
  tags?: string[];
  cwe?: string[];
  wcagCriteria?: string[];
}

export interface AnalyzerResult {
  id: string;
  scanId: string;
  analyzerId: string;
  category: AnalyzerCategory;
  severity: Severity;
  title: string;
  description: string;
  location?: ResultLocation;
  evidence?: string;
  explanation?: string;
  whyItMatters?: string;
  possibleCause?: string;
  recommendedFix?: string;
  estimatedImpact?: string;
  confidenceScore?: number;
  metadata?: AnalyzerMetadata;
  createdAt: Date;
}

export interface ScanOptions {
  viewport: Viewport;
  categories: AnalyzerCategory[];
  maxDepth: number;
  timeout: number;
  userAgent?: string;
  followRedirects: boolean;
  checkExternalLinks: boolean;
}

export interface ScanStatistics {
  totalRequests: number;
  totalSize: number;
  totalDuration: number;
  pageCount: number;
  resourceCount: number;
  errorCount: number;
  warningCount: number;
}

export interface Scan {
  id: string;
  url: string;
  status: ScanStatus;
  options: ScanOptions;
  statistics?: ScanStatistics;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface ScanProgress {
  scanId: string;
  status: ScanStatus;
  progress: {
    total: number;
    completed: number;
    active?: string;
    currentAnalyzer?: string;
  };
  results: AnalyzerResult[];
}

export interface PageData {
  url: string;
  html: string;
  dom: string;
  resources: ResourceData[];
  consoleMessages: ConsoleMessage[];
  screenshots?: {
    desktop?: string;
    tablet?: string;
    mobile?: string;
  };
  metadata: PageMetadata;
  performanceMetrics?: PerformanceMetrics;
}

export interface ResourceData {
  url: string;
  type: 'script' | 'style' | 'image' | 'font' | 'document' | 'other';
  size: number;
  loadTime: number;
  status: number;
  fromCache: boolean;
}

export interface ConsoleMessage {
  type: 'log' | 'info' | 'warn' | 'error';
  message: string;
  location?: string;
  timestamp: number;
}

export interface PageMetadata {
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;
  ogTags?: Record<string, string>;
  twitterCards?: Record<string, string>;
  robots?: string;
  canonical?: string;
  viewport?: string;
  charset?: string;
}

export interface PerformanceMetrics {
  domContentLoaded: number;
  loadComplete: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  timeToInteractive?: number;
  totalBlockingTime?: number;
}

export interface AnalysisContext {
  scanId: string;
  url: string;
  pages: PageData[];
  page: PageData;
  viewport: Viewport;
  options: ScanOptions;
  report: (result: AnalyzerResult) => void;
}

export interface Analyzer {
  readonly id: string;
  readonly name: string;
  readonly category: AnalyzerCategory;
  readonly defaultSeverity: Severity;
  readonly description: string;
  readonly supportedCategories?: AnalyzerCategory[];
  
  run(context: AnalysisContext): Promise<AnalyzerResult[]>;
  validate?(context: AnalysisContext): Promise<{ valid: boolean; message?: string }>;
}

export interface AnalyzerInfo {
  id: string;
  name: string;
  category: AnalyzerCategory;
  severity: Severity;
  description: string;
  enabled: boolean;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
  errors?: Array<{ path: string; message: string }>;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Export utility types
export type SeverityKey = keyof typeof Severity;
export type CategoryKey = keyof typeof AnalyzerCategory;
