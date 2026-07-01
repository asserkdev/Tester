import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database.js';
import { ScanStatus } from '../../types/index.js';
import type { Scan, ScanOptions, ScanStatistics } from '../../types/index.js';

export class ScanRepository {
  create(url: string, options: Partial<ScanOptions>): Scan {
    const db = getDatabase();
    const id = `scan_${uuidv4()}`;
    const defaultOptions: ScanOptions = {
      viewport: 'desktop',
      categories: [],
      maxDepth: 1,
      timeout: 300,
      followRedirects: true,
      checkExternalLinks: false,
      ...options,
    };

    const stmt = db.prepare(`
      INSERT INTO scans (id, url, status, options, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(id, url, ScanStatus.PENDING, JSON.stringify(defaultOptions));

    return {
      id,
      url,
      status: ScanStatus.PENDING,
      options: defaultOptions,
      createdAt: new Date(),
    };
  }

  findById(id: string): Scan | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM scans WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? this.mapRowToScan(row) : null;
  }

  findAll(limit = 50, offset = 0): Scan[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM scans ORDER BY created_at DESC LIMIT ? OFFSET ?');
    const rows = stmt.all(limit, offset) as Record<string, unknown>[];
    return rows.map((row) => this.mapRowToScan(row));
  }

  count(): number {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM scans');
    const row = stmt.get() as { count: number };
    return row.count;
  }

  updateStatus(id: string, status: ScanStatus, error?: string): boolean {
    const db = getDatabase();
    const updates: string[] = ['status = ?'];
    const params: (string | null)[] = [status];

    if (status === ScanStatus.RUNNING) {
      updates.push('started_at = datetime("now")');
    } else if (status === ScanStatus.COMPLETED || status === ScanStatus.FAILED || status === ScanStatus.CANCELLED) {
      updates.push('completed_at = datetime("now")');
    }

    if (error !== undefined) {
      updates.push('error = ?');
      params.push(error);
    }

    params.push(id);
    const stmt = db.prepare(`UPDATE scans SET ${updates.join(', ')} WHERE id = ?`);
    const result = stmt.run(...params);
    return result.changes > 0;
  }

  updateStatistics(id: string, statistics: ScanStatistics): boolean {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE scans SET statistics = ? WHERE id = ?');
    const result = stmt.run(JSON.stringify(statistics), id);
    return result.changes > 0;
  }

  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM scans WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  private mapRowToScan(row: Record<string, unknown>): Scan {
    return {
      id: row['id'] as string,
      url: row['url'] as string,
      status: row['status'] as ScanStatus,
      options: row['options'] ? JSON.parse(row['options'] as string) : {},
      statistics: row['statistics'] ? JSON.parse(row['statistics'] as string) : undefined,
      error: row['error'] as string | undefined,
      createdAt: new Date(row['created_at'] as string),
      startedAt: row['started_at'] ? new Date(row['started_at'] as string) : undefined,
      completedAt: row['completed_at'] ? new Date(row['completed_at'] as string) : undefined,
    };
  }
}

export const scanRepository = new ScanRepository();
