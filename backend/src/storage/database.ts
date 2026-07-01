import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/lai-inspector.db');

let db: Database.Database | null = null;

export function initializeDatabase(): Database.Database {
  if (db) return db;

  const dbDir = path.dirname(dbPath);
  const fs = require('fs');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables(db);
  return db;
}

function createTables(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      options TEXT,
      statistics TEXT,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS results (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL,
      analyzer_id TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      evidence TEXT,
      explanation TEXT,
      why_it_matters TEXT,
      possible_cause TEXT,
      recommended_fix TEXT,
      estimated_impact TEXT,
      confidence_score REAL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_results_scan_id ON results(scan_id);
    CREATE INDEX IF NOT EXISTS idx_results_analyzer_id ON results(analyzer_id);
    CREATE INDEX IF NOT EXISTS idx_results_severity ON results(severity);
    CREATE INDEX IF NOT EXISTS idx_results_category ON results(category);
    CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
    CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at);
  `);
}

export function getDatabase(): Database.Database {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
