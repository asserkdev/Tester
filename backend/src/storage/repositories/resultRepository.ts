import { getDatabase } from '../database.js';
import type { AnalyzerResult, Severity, AnalyzerCategory } from '../../types/index.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars

export interface ResultFilter {
  scanId?: string;
  analyzerId?: string;
  category?: AnalyzerCategory;
  severity?: Severity;
  search?: string;
}

export interface ResultStats {
  total: number;
  bySeverity: Record<Severity, number>;
  byCategory: Record<AnalyzerCategory, number>;
}

export class ResultRepository {
  create(result: AnalyzerResult): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO results (
        id, scan_id, analyzer_id, category, severity, title, description,
        location, evidence, explanation, why_it_matters, possible_cause,
        recommended_fix, estimated_impact, confidence_score, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      result.id,
      result.scanId,
      result.analyzerId,
      result.category,
      result.severity,
      result.title,
      result.description,
      result.location ? JSON.stringify(result.location) : null,
      result.evidence ?? null,
      result.explanation ?? null,
      result.whyItMatters ?? null,
      result.possibleCause ?? null,
      result.recommendedFix ?? null,
      result.estimatedImpact ?? null,
      result.confidenceScore ?? null,
      result.metadata ? JSON.stringify(result.metadata) : null
    );
  }

  createBatch(results: AnalyzerResult[]): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO results (
        id, scan_id, analyzer_id, category, severity, title, description,
        location, evidence, explanation, why_it_matters, possible_cause,
        recommended_fix, estimated_impact, confidence_score, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const insertMany = db.transaction((items: AnalyzerResult[]) => {
      for (const result of items) {
        stmt.run(
          result.id,
          result.scanId,
          result.analyzerId,
          result.category,
          result.severity,
          result.title,
          result.description,
          result.location ? JSON.stringify(result.location) : null,
          result.evidence ?? null,
          result.explanation ?? null,
          result.whyItMatters ?? null,
          result.possibleCause ?? null,
          result.recommendedFix ?? null,
          result.estimatedImpact ?? null,
          result.confidenceScore ?? null,
          result.metadata ? JSON.stringify(result.metadata) : null
        );
      }
    });

    insertMany(results);
  }

  findById(id: string): AnalyzerResult | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM results WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? this.mapRowToResult(row) : null;
  }

  findByScanId(scanId: string): AnalyzerResult[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM results WHERE scan_id = ? ORDER BY severity DESC, created_at ASC');
    const rows = stmt.all(scanId) as Record<string, unknown>[];
    return rows.map((row) => this.mapRowToResult(row));
  }

  find(filter: ResultFilter, limit = 100, offset = 0): AnalyzerResult[] {
    const db = getDatabase();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.scanId) {
      conditions.push('scan_id = ?');
      params.push(filter.scanId);
    }
    if (filter.analyzerId) {
      conditions.push('analyzer_id = ?');
      params.push(filter.analyzerId);
    }
    if (filter.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }
    if (filter.severity) {
      conditions.push('severity = ?');
      params.push(filter.severity);
    }
    if (filter.search) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      const searchTerm = `%${filter.search}%`;
      params.push(searchTerm, searchTerm);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = db.prepare(`SELECT * FROM results ${whereClause} ORDER BY severity DESC, created_at ASC LIMIT ? OFFSET ?`);
    const rows = stmt.all(...params, limit, offset) as Record<string, unknown>[];
    return rows.map((row) => this.mapRowToResult(row));
  }

  count(filter?: ResultFilter): number {
    const db = getDatabase();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.scanId) {
      conditions.push('scan_id = ?');
      params.push(filter.scanId);
    }
    if (filter?.analyzerId) {
      conditions.push('analyzer_id = ?');
      params.push(filter.analyzerId);
    }
    if (filter?.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }
    if (filter?.severity) {
      conditions.push('severity = ?');
      params.push(filter.severity);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const stmt = db.prepare(`SELECT COUNT(*) as count FROM results ${whereClause}`);
    const row = stmt.get(...params) as { count: number };
    return row.count;
  }

  getStatsByScanId(scanId: string): ResultStats {
    const db = getDatabase();

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM results WHERE scan_id = ?');
    const countRow = countStmt.get(scanId) as { count: number };

    const severityStmt = db.prepare(`
      SELECT severity, COUNT(*) as count 
      FROM results 
      WHERE scan_id = ? 
      GROUP BY severity
    `);
    const severityRows = severityStmt.all(scanId) as Array<{ severity: Severity; count: number }>;

    const categoryStmt = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM results 
      WHERE scan_id = ? 
      GROUP BY category
    `);
    const categoryRows = categoryStmt.all(scanId) as Array<{ category: AnalyzerCategory; count: number }>;

    const bySeverity = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    } as Record<Severity, number>;

    const byCategory = {} as Record<AnalyzerCategory, number>;

    severityRows.forEach((row) => {
      bySeverity[row.severity as Severity] = row.count;
    });

    categoryRows.forEach((row) => {
      byCategory[row.category as AnalyzerCategory] = row.count;
    });

    return {
      total: countRow.count,
      bySeverity,
      byCategory,
    };
  }

  deleteByScanId(scanId: string): number {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM results WHERE scan_id = ?');
    const result = stmt.run(scanId);
    return result.changes;
  }

  private mapRowToResult(row: Record<string, unknown>): AnalyzerResult {
    return {
      id: row['id'] as string,
      scanId: row['scan_id'] as string,
      analyzerId: row['analyzer_id'] as string,
      category: row['category'] as AnalyzerCategory,
      severity: row['severity'] as Severity,
      title: row['title'] as string,
      description: row['description'] as string,
      location: row['location'] ? JSON.parse(row['location'] as string) : undefined,
      evidence: row['evidence'] as string | undefined,
      explanation: row['explanation'] as string | undefined,
      whyItMatters: row['why_it_matters'] as string | undefined,
      possibleCause: row['possible_cause'] as string | undefined,
      recommendedFix: row['recommended_fix'] as string | undefined,
      estimatedImpact: row['estimated_impact'] as string | undefined,
      confidenceScore: row['confidence_score'] as number | undefined,
      metadata: row['metadata'] ? JSON.parse(row['metadata'] as string) : undefined,
      createdAt: new Date(row['created_at'] as string),
    };
  }
}

export const resultRepository = new ResultRepository();
