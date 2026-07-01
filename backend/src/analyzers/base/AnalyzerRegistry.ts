import type { Analyzer, AnalyzerInfo, AnalyzerCategory } from '../../types/index.js';

export class AnalyzerRegistry {
  private static instance: AnalyzerRegistry;
  private analyzers: Map<string, Analyzer> = new Map();

  private constructor() {}

  static getInstance(): AnalyzerRegistry {
    if (!AnalyzerRegistry.instance) {
      AnalyzerRegistry.instance = new AnalyzerRegistry();
    }
    return AnalyzerRegistry.instance;
  }

  register(analyzer: Analyzer): void {
    if (this.analyzers.has(analyzer.id)) {
      console.warn(`Analyzer with id "${analyzer.id}" is already registered. Replacing.`);
    }
    this.analyzers.set(analyzer.id, analyzer);
  }

  unregister(analyzerId: string): boolean {
    return this.analyzers.delete(analyzerId);
  }

  get(analyzerId: string): Analyzer | undefined {
    return this.analyzers.get(analyzerId);
  }

  getAll(): Analyzer[] {
    return Array.from(this.analyzers.values());
  }

  getByCategory(category: AnalyzerCategory): Analyzer[] {
    return this.getAll().filter((analyzer) => analyzer.category === category);
  }

  getByCategories(categories: AnalyzerCategory[]): Analyzer[] {
    return this.getAll().filter((analyzer) => categories.includes(analyzer.category));
  }

  getInfo(): AnalyzerInfo[] {
    return this.getAll().map((analyzer) => ({
      id: analyzer.id,
      name: analyzer.name,
      category: analyzer.category,
      severity: analyzer.defaultSeverity,
      description: analyzer.description,
      enabled: true,
    }));
  }

  getCategories(): AnalyzerCategory[] {
    const categories = new Set(this.getAll().map((a) => a.category));
    return Array.from(categories);
  }

  count(): number {
    return this.analyzers.size;
  }

  clear(): void {
    this.analyzers.clear();
  }
}

export const analyzerRegistry = AnalyzerRegistry.getInstance();

export function registerAnalyzer(analyzer: Analyzer): void {
  analyzerRegistry.register(analyzer);
}

export function getAnalyzer(analyzerId: string): Analyzer | undefined {
  return analyzerRegistry.get(analyzerId);
}

export function getAllAnalyzers(): Analyzer[] {
  return analyzerRegistry.getAll();
}

export function getAnalyzersByCategory(category: AnalyzerCategory): Analyzer[] {
  return analyzerRegistry.getByCategory(category);
}
