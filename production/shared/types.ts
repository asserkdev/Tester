// Shared Type Definitions for L.A.I. Web Inspector - Production Edition

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Category = 
  | 'Security' | 'Performance' | 'Accessibility' | 'SEO' 
  | 'HTML' | 'CSS' | 'JavaScript' | 'Links' | 'Forms'
  | 'API' | 'PWA' | 'Social' | 'Analytics' | 'Privacy'
  | 'Code Quality' | 'Internationalization' | 'Infrastructure';

export interface Issue {
  id: string;
  analyzerId: string;
  title: string;
  description: string;
  severity: Severity;
  category: Category;
  location: IssueLocation;
  evidence: Evidence[];
  recommendation: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  relatedIssues: string[];
  references: Reference[];
  languages?: string[]; // Programming languages affected
  confidence: number; // 0-100
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface IssueLocation {
  url: string;
  line?: number;
  column?: number;
  selector?: string;
  xpath?: string;
  element?: string;
  resource?: string;
  snippet?: string;
}

export interface Evidence {
  type: 'screenshot' | 'console_log' | 'network_request' | 'html_snippet' | 'css_snippet' | 'js_error' | 'header' | 'metric';
  data: string;
  timestamp?: number;
}

export interface Reference {
  title: string;
  url: string;
  type: 'documentation' | 'guide' | 'specification' | 'article';
}

export interface ScanConfig {
  url: string;
  viewport: 'mobile' | 'tablet' | 'desktop';
  maxDepth: number;
  maxPages: number;
  timeout: number;
  categories: Category[];
  analyzerIds: string[];
  followRedirects: boolean;
  checkExternalLinks: boolean;
  captureScreenshots: boolean;
  captureConsole: boolean;
  locale: string;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface ScanResult {
  id: string;
  config: ScanConfig;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  score: Score;
  stats: ScanStats;
  pages: PageResult[];
  issues: Issue[];
  metadata: ScanMetadata;
}

export interface Score {
  overall: number;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa: number;
}

export interface ScanStats {
  totalPages: number;
  analyzedPages: number;
  totalIssues: number;
  issuesBySeverity: Record<Severity, number>;
  issuesByCategory: Record<Category, number>;
  totalRequests: number;
  totalSize: number;
  loadTime: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  domDepth: number;
  domNodes: number;
  largestImage?: string;
  heaviestScript?: string;
  unusedCSS?: number;
  unusedJS?: number;
}

export interface PageResult {
  url: string;
  status: number;
  title: string;
  description?: string;
  h1s: string[];
  canonical?: string;
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
  resources: Resource[];
  errors: ErrorEntry[];
  warnings: WarningEntry[];
  consoleMessages: ConsoleEntry[];
  performanceMetrics: PerformanceMetrics;
  accessibilityIssues: string[];
  htmlValid: boolean;
  htmlErrors: ValidationError[];
  cssValid: boolean;
  cssErrors: ValidationError[];
  jsErrors: ErrorEntry[];
}

export interface Resource {
  url: string;
  type: 'document' | 'script' | 'style' | 'image' | 'font' | 'media' | 'other';
  size: number;
  loadTime: number;
  status: number;
  fromCache: boolean;
  compression?: string;
  renderBlocking?: boolean;
}

export interface ErrorEntry {
  message: string;
  stack?: string;
  line?: number;
  column?: number;
  source?: string;
  timestamp: number;
}

export interface WarningEntry {
  message: string;
  source?: string;
  line?: number;
}

export interface ConsoleEntry {
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  location?: { url: string; line: number; column: number };
}

export interface PerformanceMetrics {
  navigationStart: number;
  loadEventEnd: number;
  domContentLoaded: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  speedIndex?: number;
  timeToInteractive?: number;
  totalBlockingTime?: number;
  bundleSize?: Record<string, number>;
  networkRequests: number;
  networkDuration: number;
}

export interface ValidationError {
  message: string;
  line?: number;
  column?: number;
  selector?: string;
  context?: string;
}

export interface ScanMetadata {
  userAgent: string;
  viewport: { width: number; height: number };
  locale: string;
  timezone: string;
  platform: string;
  technologies: Technology[];
  hostingProvider?: string;
  cdn?: string;
  framework?: string;
  cms?: string;
  serverInfo?: string;
}

export interface Technology {
  name: string;
  version?: string;
  confidence: number;
  category: string;
}

// Analyzer Interface
export interface Analyzer {
  id: string;
  name: string;
  description: string;
  categories: Category[];
  severity: Severity;
  
  initialize(config: ScanConfig): Promise<void>;
  analyze(page: PageResult, scan: ScanResult): Promise<Issue[]>;
  cleanup(): Promise<void>;
  
  // Multi-language support
  supportedLanguages: string[];
  detectLanguage(code: string): string;
  
  // Accurate location detection
  findExactLocation(code: string, issue: string): IssueLocation;
}

// Worker Message Types
export interface WorkerMessage {
  type: 'analyze' | 'result' | 'error' | 'progress' | 'complete';
  analyzerId?: string;
  data?: unknown;
  error?: string;
  progress?: number;
}

// Localization
export interface Localization {
  language: string;
  analyzerName: string;
  messages: Record<string, string>;
  errorPatterns: Record<string, RegExp>;
  severityLabels: Record<Severity, string>;
}
