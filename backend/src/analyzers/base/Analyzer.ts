import { v4 as uuidv4 } from 'uuid';
import type {
  Analyzer as IAnalyzer,
  AnalyzerResult,
  AnalysisContext,
  AnalyzerCategory,
  Severity,
} from '../../types/index.js';

export abstract class BaseAnalyzer implements IAnalyzer {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly category: AnalyzerCategory;
  abstract readonly defaultSeverity: Severity;
  description: string = '';
  supportedCategories?: AnalyzerCategory[];

  protected createResult(
    context: AnalysisContext,
    partial: Partial<AnalyzerResult> & Pick<AnalyzerResult, 'title' | 'description'>
  ): AnalyzerResult {
    return {
      id: uuidv4(),
      scanId: context.scanId,
      analyzerId: this.id,
      category: this.category,
      severity: this.defaultSeverity,
      ...partial,
      createdAt: new Date(),
    };
  }

  abstract run(context: AnalysisContext): Promise<AnalyzerResult[]>;

  async validate?(context: AnalysisContext): Promise<{ valid: boolean; message?: string }>;
}
