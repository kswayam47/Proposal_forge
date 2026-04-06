-- JIRA Application Supabase Migration Script
-- This script initializes the tables required for the JIRA metrics and reporting module.
-- Run this in your Supabase SQL Editor.

-- 1. JIRA Issues Table
CREATE TABLE IF NOT EXISTS jira_issues (
    id                   SERIAL PRIMARY KEY,
    issue_id             TEXT    NOT NULL UNIQUE,
    issue_key            TEXT    NOT NULL,
    project_key          TEXT,
    summary              TEXT,
    assignee_id          TEXT,
    assignee_name        TEXT,
    issue_type           TEXT,
    priority             TEXT,
    status               TEXT    NOT NULL,
    story_points         REAL,
    created_date         TEXT    NOT NULL,
    completed_date       TEXT,
    updated_date         TEXT,
    resolution_time_days REAL,
    reopened_flag        INTEGER NOT NULL DEFAULT 0,
    time_logged_seconds  INTEGER NOT NULL DEFAULT 0,
    sprint_name          TEXT,
    is_spillover         INTEGER NOT NULL DEFAULT 0,
    fetched_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jira_assignee  ON jira_issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_jira_created   ON jira_issues(created_date);
CREATE INDEX IF NOT EXISTS idx_jira_completed ON jira_issues(completed_date);
CREATE INDEX IF NOT EXISTS idx_jira_project   ON jira_issues(project_key);

-- 2. Time Entries Table
CREATE TABLE IF NOT EXISTS time_entries (
    id               SERIAL PRIMARY KEY,
    employee_id      TEXT    NOT NULL,
    date             TEXT    NOT NULL,
    hours_logged     REAL    NOT NULL,
    entry_type       TEXT    NOT NULL CHECK(entry_type IN (
                       'work','public_holiday','personal_leave',
                       'sick_leave','half_day'
                     )),
    notes            TEXT,
    entry_timestamp  TEXT    NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_te_employee    ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_te_date        ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_te_emp_date    ON time_entries(employee_id, date);

-- 3. Org Calendar Table
CREATE TABLE IF NOT EXISTS org_calendar (
    id          SERIAL PRIMARY KEY,
    date        TEXT    NOT NULL UNIQUE,
    day_type    TEXT    NOT NULL CHECK(day_type IN ('holiday','leave')),
    label       TEXT,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cal_date ON org_calendar(date);

-- 4. ETL Run Log Table
CREATE TABLE IF NOT EXISTS etl_run_log (
    id             SERIAL PRIMARY KEY,
    run_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    issues_fetched INTEGER NOT NULL DEFAULT 0,
    status         TEXT    NOT NULL CHECK(status IN ('success','error')),
    error_message  TEXT
);

-- 5. App Config Table
CREATE TABLE IF NOT EXISTS app_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- 6. Report Pipeline Queue Table
CREATE TABLE IF NOT EXISTS report_pipeline_queue (
    id              SERIAL PRIMARY KEY,
    month           TEXT    NOT NULL,
    employee_id     TEXT    NOT NULL,
    employee_name   TEXT    NOT NULL,
    employee_email  TEXT,
    project_id      TEXT,
    status          TEXT    NOT NULL CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    last_error      TEXT,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(month, employee_id, project_id)
);

-- 7. Report Pipelines Table
CREATE TABLE IF NOT EXISTS report_pipelines (
    id              SERIAL PRIMARY KEY,
    name            TEXT    NOT NULL,
    gemini_keys     TEXT,
    smtp_host       TEXT,
    smtp_port       INTEGER,
    smtp_user       TEXT,
    smtp_pass       TEXT,
    admin_email     TEXT,
    selections      TEXT, -- JSON string
    trigger_time    TEXT, -- HH:mm (IST)
    trigger_day     INTEGER DEFAULT 1,
    report_month    TEXT DEFAULT 'current',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_run        TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Pipeline Run Logs Table
CREATE TABLE IF NOT EXISTS pipeline_run_logs (
    id              SERIAL PRIMARY KEY,
    pipeline_id     INTEGER NOT NULL,
    pipeline_name   TEXT    NOT NULL,
    run_at          TEXT    NOT NULL,
    status          TEXT    NOT NULL CHECK(status IN ('running','completed','failed','partial')),
    total_reports   INTEGER NOT NULL DEFAULT 0,
    sent_count      INTEGER NOT NULL DEFAULT 0,
    failed_count    INTEGER NOT NULL DEFAULT 0,
    details         TEXT, -- JSON string with per-employee results
    error_message   TEXT
);
