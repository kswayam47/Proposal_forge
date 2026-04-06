import path from "path";
import fs from "fs";

/**
 * AsyncDb Interface
 */
export interface AsyncDb {
    query<T = any>(sql: string, params?: any[]): Promise<T[]>;
}

/**
 * SQLite Async Wrapper using better-sqlite3 (for local dev with file-based DB)
 */
class SqliteAsyncWrapper implements AsyncDb {
    private db: any = null;

    init() {
        if (this.db) return;
        try {
            const Database = require("better-sqlite3");
            const DB_DIR = path.join(process.cwd(), "data");
            const DB_PATH = path.join(DB_DIR, "proposal-forge.db");

            if (!fs.existsSync(DB_DIR)) {
                fs.mkdirSync(DB_DIR, { recursive: true });
            }
            this.db = new Database(DB_PATH);
            // Run migrations that db.ts initSchema would normally handle
            try { this.db.exec("ALTER TABLE pipeline_run_logs ADD COLUMN gemini_keys TEXT"); } catch (_e) { /* column already exists */ }
        } catch (e) {
            console.error("Failed to load better-sqlite3.");
            throw e;
        }
    }

    async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        this.init();
        try {
            let sqliteSql = sql;
            // Handle common Postgresisms -> SQLite
            sqliteSql = sqliteSql.replace(/CURRENT_DATE/gi, "date('now')");
            sqliteSql = sqliteSql.replace(/::date/gi, "");
            sqliteSql = sqliteSql.replace(/::text/gi, "");
            sqliteSql = sqliteSql.replace(/::integer/gi, "");

            // Handle age calculation patterns
            // pattern: date('now') - something
            sqliteSql = sqliteSql.replace(/date\('now'\)\s*-\s*([a-zA-Z0-9_\.]+)/gi, "CAST(julianday('now') - julianday($1) AS INTEGER)");
            // Handle STRING_AGG for SQLite
            // Pattern: STRING_AGG(DISTINCT col, sep) -> REPLACE(GROUP_CONCAT(DISTINCT col), ',', sep)
            sqliteSql = sqliteSql.replace(/STRING_AGG\s*\(\s*DISTINCT\s+([^,]+)\s*,\s*('[^']+')\s*\)/gi, "REPLACE(GROUP_CONCAT(DISTINCT $1), ',', $2)");
            // Pattern: STRING_AGG(col, sep) -> GROUP_CONCAT(col, sep)
            sqliteSql = sqliteSql.replace(/STRING_AGG\s*\(\s*([^,]+)\s*,\s*('[^']+')\s*\)/gi, "GROUP_CONCAT($1, $2)");

            const stmt = this.db.prepare(sqliteSql);
            // Better-sqlite3: use run() for non-SELECT statements to avoid "does not return data" error.
            const isRead = /^\s*(SELECT|PRAGMA|WITH\b.*SELECT)\b/i.test(sqliteSql);
            if (isRead) {
                return stmt.all(...params) as T[];
            } else {
                stmt.run(...params);
                return [] as T[];
            }
        } catch (error) {
            console.error("SQLite Query Error:", error);
            console.error("Original SQL:", sql);
            throw error;
        }
    }
}

/**
 * sql.js In-Memory SQLite Wrapper (fallback when better-sqlite3 native binary fails)
 * 
 * Uses pure JavaScript/WASM SQLite — zero native compilation needed.
 * Data is ephemeral (in-memory only), lost on process restart.
 * ETL can re-fetch JIRA data on startup.
 */
class SqlJsMemoryWrapper implements AsyncDb {
    private db: any = null;
    private initPromise: Promise<void> | null = null;
    private schemaCreated = false;

    private async ensureInit() {
        if (this.db) return;
        if (this.initPromise) {
            await this.initPromise;
            return;
        }
        this.initPromise = this._doInit();
        await this.initPromise;
    }

    private async _doInit() {
        try {
            const initSqlJs = require("sql.js");
            const SQL = await initSqlJs();
            this.db = new SQL.Database(); // in-memory
            console.log("[DB-ASYNC] sql.js in-memory SQLite initialized successfully");
            this._createSchema();
        } catch (e: any) {
            console.error("[DB-ASYNC] Failed to initialize sql.js:", e.message);
            throw e;
        }
    }

    private _createSchema() {
        if (this.schemaCreated) return;

        const ddl = `
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
                fetched_at           TEXT    NOT NULL,
                issue_type           TEXT,
                priority             TEXT,
                updated_date         TEXT
            );
            CREATE TABLE IF NOT EXISTS time_entries (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id      TEXT    NOT NULL,
                date             TEXT    NOT NULL,
                hours_logged     REAL    NOT NULL,
                entry_type       TEXT    NOT NULL,
                notes            TEXT,
                entry_timestamp  TEXT    NOT NULL,
                created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
                UNIQUE(employee_id, date)
            );
            CREATE TABLE IF NOT EXISTS org_calendar (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                date        TEXT    NOT NULL UNIQUE,
                day_type    TEXT    NOT NULL,
                label       TEXT,
                created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS etl_run_log (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                run_at         TEXT    NOT NULL DEFAULT (datetime('now')),
                issues_fetched INTEGER NOT NULL DEFAULT 0,
                status         TEXT    NOT NULL,
                error_message  TEXT
            );
            CREATE TABLE IF NOT EXISTS app_config (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS report_pipeline_queue (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                month           TEXT    NOT NULL,
                employee_id     TEXT    NOT NULL,
                employee_name   TEXT    NOT NULL,
                employee_email  TEXT,
                project_id      TEXT,
                status          TEXT    NOT NULL,
                last_error      TEXT,
                updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
                UNIQUE(month, employee_id, project_id)
            );
            CREATE TABLE IF NOT EXISTS report_pipelines (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                name            TEXT    NOT NULL,
                gemini_keys     TEXT,
                smtp_host       TEXT,
                smtp_port       INTEGER,
                smtp_user       TEXT,
                smtp_pass       TEXT,
                admin_email     TEXT,
                selections      TEXT,
                trigger_time    TEXT,
                trigger_day     INTEGER DEFAULT 1,
                report_month    TEXT DEFAULT 'current',
                is_active       INTEGER NOT NULL DEFAULT 1,
                last_run        TEXT,
                created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS pipeline_run_logs (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                pipeline_id     INTEGER NOT NULL,
                pipeline_name   TEXT    NOT NULL,
                run_at          TEXT    NOT NULL,
                status          TEXT    NOT NULL,
                total_reports   INTEGER NOT NULL DEFAULT 0,
                sent_count      INTEGER NOT NULL DEFAULT 0,
                failed_count    INTEGER NOT NULL DEFAULT 0,
                details         TEXT,
                error_message   TEXT,
                gemini_keys     TEXT
            );
            CREATE TABLE IF NOT EXISTS employee_leaves (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id     TEXT    NOT NULL,
                employee_name   TEXT,
                date            TEXT    NOT NULL,
                leave_type      TEXT    NOT NULL,
                reason          TEXT,
                status          TEXT    NOT NULL DEFAULT 'approved',
                created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
                UNIQUE(employee_id, date)
            );
            CREATE INDEX IF NOT EXISTS idx_jira_assignee  ON jira_issues(assignee_id);
            CREATE INDEX IF NOT EXISTS idx_jira_created   ON jira_issues(created_date);
            CREATE INDEX IF NOT EXISTS idx_jira_completed ON jira_issues(completed_date);
            CREATE INDEX IF NOT EXISTS idx_jira_project   ON jira_issues(project_key);
            CREATE INDEX IF NOT EXISTS idx_te_employee    ON time_entries(employee_id);
            CREATE INDEX IF NOT EXISTS idx_te_date        ON time_entries(date);
            CREATE INDEX IF NOT EXISTS idx_el_emp         ON employee_leaves(employee_id);
            CREATE INDEX IF NOT EXISTS idx_el_date        ON employee_leaves(date);
            CREATE INDEX IF NOT EXISTS idx_cal_date       ON org_calendar(date);
        `;

        // sql.js exec() runs multiple statements
        this.db.run(ddl);
        this.schemaCreated = true;
        console.log("[DB-ASYNC] In-memory schema created successfully");
    }

    async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        await this.ensureInit();
        try {
            let sqliteSql = sql;
            // Handle common Postgresisms -> SQLite
            sqliteSql = sqliteSql.replace(/CURRENT_DATE/gi, "date('now')");
            sqliteSql = sqliteSql.replace(/::date/gi, "");
            sqliteSql = sqliteSql.replace(/::text/gi, "");
            sqliteSql = sqliteSql.replace(/::integer/gi, "");
            sqliteSql = sqliteSql.replace(/date\('now'\)\s*-\s*([a-zA-Z0-9_\.]+)/gi, "CAST(julianday('now') - julianday($1) AS INTEGER)");
            sqliteSql = sqliteSql.replace(/STRING_AGG\s*\(\s*DISTINCT\s+([^,]+)\s*,\s*('[^']+')\s*\)/gi, "REPLACE(GROUP_CONCAT(DISTINCT $1), ',', $2)");
            sqliteSql = sqliteSql.replace(/STRING_AGG\s*\(\s*([^,]+)\s*,\s*('[^']+')\s*\)/gi, "GROUP_CONCAT($1, $2)");

            const isRead = /^\s*(SELECT|PRAGMA|WITH\b.*SELECT)\b/i.test(sqliteSql);

            if (isRead) {
                // sql.js: exec() returns [{columns: [...], values: [[...]]}]
                const result = this.db.exec(sqliteSql, params);
                if (!result || result.length === 0) return [] as T[];

                const { columns, values } = result[0];
                return values.map((row: any[]) => {
                    const obj: any = {};
                    columns.forEach((col: string, i: number) => {
                        obj[col] = row[i];
                    });
                    return obj;
                }) as T[];
            } else {
                this.db.run(sqliteSql, params);
                return [] as T[];
            }
        } catch (error) {
            console.error("[DB-ASYNC] sql.js Query Error:", error);
            console.error("Original SQL:", sql);
            throw error;
        }
    }
}

/**
 * PostgreSQL/Supabase Async Wrapper (for production)
 */
class PostgresAsyncWrapper implements AsyncDb {
    private sql: any;

    constructor() {
        const postgres = require("postgres");
        let connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
        if (!connectionString) {
            throw new Error("DATABASE_URL or SUPABASE_DB_URL is not set");
        }

        // Force Transaction Mode (Port 6543) for Supabase if detected
        if (connectionString.includes("pooler.supabase.com") && connectionString.includes(":5432")) {
            console.log("[DB-ASYNC] Switching Supabase URL to Transaction Mode port 6543");
            connectionString = connectionString.replace(":5432", ":6543");
        }

        const globalRef = global as any;
        if (!globalRef.postgres_sql) {
            console.log("[DB-ASYNC] Initializing new Postgres connection pool");
            globalRef.postgres_sql = postgres(connectionString, {
                ssl: { rejectUnauthorized: false },
                prepare: false, // Mandatory for Supabase pooler
                max: 3,         // Ultra-conservative for Free Tier + Parallel avoidance
                idle_timeout: 10,
                connect_timeout: 10,
            });
        }
        this.sql = globalRef.postgres_sql;
    }

    async query<T = any>(query: string, params: any[] = []): Promise<T[]> {
        try {
            // PostgreSQL uses $1, $2 instead of ?
            let pgQuery = query;
            let pIdx = 1;
            while (pgQuery.includes("?")) {
                pgQuery = pgQuery.replace("?", `$${pIdx++}`);
            }

            // Also handle some common SQLite -> PG conversions
            pgQuery = pgQuery.replace(/datetime\('now'\)/gi, "CURRENT_TIMESTAMP");
            pgQuery = pgQuery.replace(/strftime\('%Y-%m',/gi, "to_char(");

            pgQuery = pgQuery.replace(/strftime\('%s',\s*'now'\)/gi, "EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)");
            pgQuery = pgQuery.replace(/strftime\('%s',\s*([^)]+)\)/gi, "EXTRACT(EPOCH FROM CAST($1 AS TIMESTAMP))");

            pgQuery = pgQuery.replace(/instr\(/gi, "strpos(");

            if (pgQuery.includes("group_concat(")) {
                pgQuery = pgQuery.replace(/group_concat\(([^,)]+)\)/gi, "string_agg($1, ',')");
                pgQuery = pgQuery.replace(/group_concat\(([^,]+),([^)]+)\)/gi, "string_agg($1, $2)");
            }

            const result = await this.sql.unsafe(pgQuery, params);
            return result as T[];
        } catch (error) {
            console.error("Postgres Query Error:", error);
            console.error("Query:", query);
            throw error;
        }
    }
}

export function getAsyncDb(): AsyncDb {
    const globalRef = global as any;
    if (globalRef._db_async_instance) return globalRef._db_async_instance;

    const dbType = process.env.JIRA_DB_TYPE || "sqlite";
    console.log(`[DB-ASYNC] Selected DB Type: ${dbType}`);

    if (dbType === "supabase" || dbType === "postgres") {
        globalRef._db_async_instance = new PostgresAsyncWrapper();
    } else {
        // Try better-sqlite3 first (file-based, fast, persistent)
        try {
            const wrapper = new SqliteAsyncWrapper();
            wrapper.init(); // Force init to catch native binary errors early
            globalRef._db_async_instance = wrapper;
            console.log("[DB-ASYNC] Using better-sqlite3 (file-based)");
        } catch (e: any) {
            console.warn(`[DB-ASYNC] better-sqlite3 failed: ${e.message}`);
            console.warn("[DB-ASYNC] Falling back to sql.js (in-memory, no native deps)...");

            // Fallback to sql.js — pure JS/WASM SQLite, works everywhere
            try {
                globalRef._db_async_instance = new SqlJsMemoryWrapper();
                console.log("[DB-ASYNC] Using sql.js in-memory fallback");
            } catch (sqlJsErr: any) {
                console.error("[DB-ASYNC] sql.js also failed:", sqlJsErr.message);
                throw new Error(
                    "No SQLite backend available. Install better-sqlite3 or sql.js. " +
                    "Alternatively, set JIRA_DB_TYPE=supabase and configure DATABASE_URL."
                );
            }
        }
    }

    return globalRef._db_async_instance;
}
