import { scanRepository } from '../storage/repositories/scanRepository.js';
import { resultRepository } from '../storage/repositories/resultRepository.js';
import { analyzerRegistry } from '../analyzers/base/AnalyzerRegistry.js';
import { scanner } from '../scanner/Scanner.js';
import { AnalyzerCategory, ScanStatus, Viewport } from '../types/index.js';
import type {
  Scan,
  ScanOptions,
  AnalyzerResult,
  AnalysisContext,
  PageData,
} from '../types/index.js';

class ScanService {
  private activeScans: Map<string, { cancel: () => void }> = new Map();

  async createScan(url: string, options?: Partial<ScanOptions>): Promise<Scan> {
    const defaultOptions: ScanOptions = {
      viewport: Viewport.DESKTOP,
      categories: Object.values(AnalyzerCategory) as AnalyzerCategory[],
      maxDepth: 1,
      timeout: 300,
      followRedirects: true,
      checkExternalLinks: false,
      ...options,
    };

    const scan = scanRepository.create(url, defaultOptions);
    return scan;
  }

  async getScan(id: string): Promise<Scan | null> {
    return scanRepository.findById(id);
  }

  async getAllScans(limit = 50, offset = 0): Promise<Scan[]> {
    return scanRepository.findAll(limit, offset);
  }

  async getScanCount(): Promise<number> {
    return scanRepository.count();
  }

  async runScan(id: string, onProgress?: (progress: number, analyzer: string) => void): Promise<void> {
    const scan = scanRepository.findById(id);
    if (!scan) throw new Error('Scan not found');

    scanRepository.updateStatus(id, ScanStatus.RUNNING);

    try {
      await scanner.initialize();

      const page = await scanner.scanPage(scan.url, scan.options);
      const pages: PageData[] = [page];

      const results: AnalyzerResult[] = [];

      const context: AnalysisContext = {
        scanId: id,
        url: scan.url,
        pages,
        page,
        viewport: scan.options.viewport,
        options: scan.options,
        report: (result: AnalyzerResult) => {
          resultRepository.create(result);
          results.push(result);
        },
      };

      const analyzers = analyzerRegistry.getByCategories(scan.options.categories);
      const total = analyzers.length;

      for (let i = 0; i < analyzers.length; i++) {
        const analyzer = analyzers[i];
        if (!analyzer) continue;
        
        try {
          onProgress?.((i / total) * 100, analyzer.name);
          const analyzerResults = await analyzer.run(context);
          results.push(...analyzerResults);
        } catch (error) {
          console.error(`Analyzer ${analyzer.id} failed:`, error);
        }
      }

      if (results.length > 0) {
        resultRepository.createBatch(results);
      }

      const stats = {
        totalRequests: page.resources.length,
        totalSize: page.resources.reduce((sum, r) => sum + r.size, 0),
        totalDuration: page.performanceMetrics?.loadComplete || 0,
        pageCount: pages.length,
        resourceCount: page.resources.length,
        errorCount: page.consoleMessages.filter((m) => m.type === 'error').length,
        warningCount: page.consoleMessages.filter((m) => m.type === 'warn').length,
      };

      scanRepository.updateStatistics(id, stats);
      scanRepository.updateStatus(id, ScanStatus.COMPLETED);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      scanRepository.updateStatus(id, ScanStatus.FAILED, errorMessage);
      throw error;
    } finally {
      await scanner.close();
    }
  }

  async cancelScan(id: string): Promise<void> {
    const activeScan = this.activeScans.get(id);
    if (activeScan) {
      activeScan.cancel();
      this.activeScans.delete(id);
    }
    scanRepository.updateStatus(id, ScanStatus.CANCELLED);
  }

  async deleteScan(id: string): Promise<void> {
    resultRepository.deleteByScanId(id);
    scanRepository.delete(id);
  }

  async getScanResults(scanId: string): Promise<AnalyzerResult[]> {
    return resultRepository.findByScanId(scanId);
  }

  async getScanStats(scanId: string) {
    return resultRepository.getStatsByScanId(scanId);
  }

  calculateScore(results: AnalyzerResult[]): number {
    if (results.length === 0) return 100;

    const weights: Record<string, number> = {
      critical: 0,
      high: 25,
      medium: 50,
      low: 75,
      info: 100,
    };

    const totalWeight = results.reduce((sum, r) => sum + (weights[r.severity] ?? 50), 0);
    return Math.round(totalWeight / results.length);
  }
}

export const scanService = new ScanService();
