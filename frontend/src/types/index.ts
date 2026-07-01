export type AnalyzerCategory =
  | 'architecture'
  | 'html'
  | 'css'
  | 'javascript'
  | 'links'
  | 'images'
  | 'resources'
  | 'console'
  | 'performance'
  | 'seo'
  | 'accessibility'
  | 'security'
  | 'network'
  | 'pwa'
  | 'storage'
  | 'api'
  | 'responsive'
  | 'cross-browser'
  | 'forms'
  | 'navigation'
  | 'metadata'
  | 'social'
  | 'technology'
  | 'privacy';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type Viewport = 'mobile' | 'tablet' | 'desktop';

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
  createdAt: string;
}

export interface ScanOptions {
  viewport: Viewport;
  categories: AnalyzerCategory[];
  maxDepth: number;
  timeout: number;
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
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface ResultStats {
  total: number;
  bySeverity: Record<Severity, number>;
  byCategory: Record<AnalyzerCategory, number>;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
  page?: number;
  pageSize?: number;
  stats?: ResultStats;
  score?: number;
  categories?: AnalyzerCategory[];
}

export interface AnalyzerInfo {
  id: string;
  name: string;
  category: AnalyzerCategory;
  severity: Severity;
  description: string;
  enabled: boolean;
}
