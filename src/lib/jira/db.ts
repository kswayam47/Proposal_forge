/**
 * db.ts — SQLite via Node 22 built-in node:sqlite
 *
 * Requires: NODE_OPTIONS=--experimental-sqlite  (set in package.json scripts)
 * Node ≥ 22.5. Synchronous API, disk-persistent, zero native compilation.
 */

import fs from "fs";
import path from "path";

// node:sqlite types land in @types/node ≥ 22.5 under the same import path.
// We use require() so Next.js CJS bundler resolves it at runtime (not build-time).
// The flag --experimental-sqlite must be in NODE_OPTIONS when the server starts.
let Database: any = null;
let sqliteLoadError: string | null = null;
let usingSqlJs = false;
let sqlJsDb: any = null;

// Try better-sqlite3 first (native, fast, file-based)
try {
  Database = require("better-sqlite3");
} catch (e: any) {
  sqliteLoadError = e.message || "better-sqlite3 not available";
  console.warn(`[DB] Could not load better-sqlite3: ${sqliteLoadError}`);
}

// ─── Minimal type shim for node:sqlite's synchronous API ─────────────────────

export type SqliteValue = string | number | bigint | null;
export type Row = Record<string, SqliteValue>;

interface RawStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: unknown[]): Row | undefined;
  all(...params: unknown[]): Row[];
}

interface RawDb {
  exec(sql: string): void;
  prepare(sql: string): RawStatement;
  close(): void;
}

// Public DB type exposed to the rest of the app
export type { RawStatement as StatementSync, RawDb as DbSync };

// ─── sql.js adapter: wraps sql.js into the RawDb interface ───────────────────

class SqlJsRawDbAdapter implements RawDb {
  constructor(private inner: any) {}

  exec(sql: string): void {
    this.inner.run(sql);
  }

  prepare(sql: string): RawStatement {
    const db = this.inner;
    return {
      run(...params: unknown[]) {
        db.run(sql, params);
        return { changes: db.getRowsModified(), lastInsertRowid: 0 };
      },
      get(...params: unknown[]): Row | undefined {
        const result = db.exec(sql, params);
        if (!result || result.length === 0 || result[0].values.length === 0) return undefined;
        const { columns, values } = result[0];
        const obj: any = {};
        columns.forEach((col: string, i: number) => { obj[col] = values[0][i]; });
        return obj;
      },
      all(...params: unknown[]): Row[] {
        const result = db.exec(sql, params);
        if (!result || result.length === 0) return [];
        const { columns, values } = result[0];
        return values.map((row: any[]) => {
          const obj: any = {};
          columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
          return obj;
        });
      },
    };
  }

  close(): void {
    this.inner.close();
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _db: RawDb | null = null;

export function getDb(): RawDb {
  if (_db) return _db;

  // Try better-sqlite3 (native, file-based)
  if (Database) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const db = new Database(DB_PATH) as RawDb;
    _db = db;
    initSchema(db);
    return db;
  }

  // Fallback: try sql.js (pure WASM, in-memory)
  try {
    console.warn("[DB] Attempting sql.js in-memory fallback...");
    // sql.js init is async, but getDb is sync.
    // We use the synchronous constructor if already initialized.
    if (sqlJsDb) {
      _db = new SqlJsRawDbAdapter(sqlJsDb);
      initSchema(_db);
      return _db;
    }
    // If sql.js hasn't been initialized yet, we can't do async here.
    // Throw an informative error — the async path in db-async.ts handles this.
    throw new Error("sql.js not yet initialized. Use getAsyncDb() instead for server-side queries.");
  } catch (initErr: any) {
    const detail = sqliteLoadError ? `: ${sqliteLoadError}` : "";
    throw new Error(
      `No SQLite backend available${detail}. ` +
      `Use getAsyncDb() for async operations, or set JIRA_DB_TYPE=supabase.`
    );
  }
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "proposal-forge.db");

// ─── Schema ───────────────────────────────────────────────────────────────────

function initSchema(db: RawDb): void {
  // WAL mode + foreign keys must be set before table creation
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA synchronous = NORMAL");

  db.exec(`
      CREATE TABLE IF NOT EXISTS jira_issues (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        issue_id             TEXT    NOT NULL UNIQUE,
        issue_key            TEXT    NOT NULL,
        project_key          TEXT,
        summary              TEXT,
        assignee_id          TEXT,
        assignee_name        TEXT,
        status               TEXT    NOT NULL,
        story_points         REAL,
        created_date         TEXT    NOT NULL,
        completed_date       TEXT,
        reopened_flag        INTEGER NOT NULL DEFAULT 0,
        time_logged_seconds  INTEGER NOT NULL DEFAULT 0,
        sprint_name          TEXT,
        resolution_time_days REAL,
        is_spillover         INTEGER NOT NULL DEFAULT 0,
        fetched_at           TEXT    NOT NULL
      )
    `);

  // ── Safe migrations ──────────────────────────────────────────────────────
  const safeCols: [string, string][] = [
    ["project_key", "TEXT"],
    ["issue_type", "TEXT"],
    ["priority", "TEXT"],
    ["updated_date", "TEXT"],
  ];
  for (const [col, type] of safeCols) {
    try { db.exec(`ALTER TABLE jira_issues ADD COLUMN ${col} ${type}`); }
    catch { /* already exists */ }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id      TEXT    NOT NULL,
      date             TEXT    NOT NULL,
      hours_logged     REAL    NOT NULL,
      entry_type       TEXT    NOT NULL
                         CHECK(entry_type IN (
                           'work','public_holiday','personal_leave',
                           'sick_leave','half_day'
                         )),
      notes            TEXT,
      entry_timestamp  TEXT    NOT NULL,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(employee_id, date)
    )
  `);

  // Org-wide calendar: holidays + leave days (shared across all users)
  db.exec(`
    CREATE TABLE IF NOT EXISTS org_calendar (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT    NOT NULL UNIQUE,
      day_type    TEXT    NOT NULL CHECK(day_type IN ('holiday','leave')),
      label       TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_cal_date ON org_calendar(date)");

  db.exec(`
    CREATE TABLE IF NOT EXISTS etl_run_log (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      run_at         TEXT    NOT NULL DEFAULT (datetime('now')),
      issues_fetched INTEGER NOT NULL DEFAULT 0,
      status         TEXT    NOT NULL CHECK(status IN ('success','error')),
      error_message  TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS report_pipeline_queue (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      month           TEXT    NOT NULL,
      employee_id     TEXT    NOT NULL,
      employee_name   TEXT    NOT NULL,
      employee_email  TEXT,
      project_id      TEXT,
      status          TEXT    NOT NULL CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
      last_error      TEXT,
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(month, employee_id, project_id)
    )
  `);

  try {
    db.exec("ALTER TABLE report_pipeline_queue ADD COLUMN project_id TEXT");
  } catch (e) { }

  db.exec(`
    CREATE TABLE IF NOT EXISTS report_pipelines (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      gemini_keys     TEXT,
      smtp_host       TEXT,
      smtp_port       INTEGER,
      smtp_user       TEXT,
      smtp_pass       TEXT,
      admin_email     TEXT,
      selections      TEXT, -- JSON string
      trigger_time    TEXT, -- HH:mm (IST)
      trigger_day     INTEGER DEFAULT 1, -- day of month (1-28)
      is_active       INTEGER NOT NULL DEFAULT 1,
      last_run        TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  try { db.exec("ALTER TABLE report_pipelines ADD COLUMN trigger_day INTEGER DEFAULT 1"); } catch (e) { }
  try { db.exec("ALTER TABLE report_pipelines ADD COLUMN report_month TEXT DEFAULT 'current'"); } catch (e) { }

  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_run_logs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      pipeline_id     INTEGER NOT NULL,
      pipeline_name   TEXT    NOT NULL,
      run_at          TEXT    NOT NULL,
      status          TEXT    NOT NULL CHECK(status IN ('running','completed','failed','partial')),
      total_reports   INTEGER NOT NULL DEFAULT 0,
      sent_count      INTEGER NOT NULL DEFAULT 0,
      failed_count    INTEGER NOT NULL DEFAULT 0,
      details         TEXT, -- JSON string with per-employee results
      error_message   TEXT
    )
  `);
  try { db.exec("ALTER TABLE pipeline_run_logs ADD COLUMN gemini_keys TEXT"); } catch (e) { }

  // Employee-level leave tracking (per-person, separate from org-wide holidays)
  db.exec(`
    CREATE TABLE IF NOT EXISTS employee_leaves (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id     TEXT    NOT NULL,
      employee_name   TEXT,
      date            TEXT    NOT NULL,
      leave_type      TEXT    NOT NULL CHECK(leave_type IN ('personal','sick','casual','wfh','other')),
      reason          TEXT,
      status          TEXT    NOT NULL DEFAULT 'approved' CHECK(status IN ('pending','approved','rejected')),
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(employee_id, date)
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_el_emp   ON employee_leaves(employee_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_el_date  ON employee_leaves(date)");

  db.exec("CREATE INDEX IF NOT EXISTS idx_jira_assignee  ON jira_issues(assignee_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_jira_created   ON jira_issues(created_date)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_jira_completed ON jira_issues(completed_date)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_jira_project   ON jira_issues(project_key)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_te_employee    ON time_entries(employee_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_te_date        ON time_entries(date)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_te_emp_date    ON time_entries(employee_id, date)");
}
