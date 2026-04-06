import { NextRequest, NextResponse } from "next/server";
import { getAsyncDb } from "@/lib/jira/db-async";
import { startOfMonth, endOfMonth, format } from "date-fns";

// ─── Types returned by each drill ────────────────────────────────────────────

export interface DrillIssueRow {
  issue_key: string;
  summary: string;
  assignee_name: string;
  issue_type: string | null;
  priority: string | null;
  project_key: string | null;
  created_date: string;
  completed_date: string | null;
  updated_date: string | null;
  resolution_time_days: number | null;
  status: string;
  reopened_flag: number;
}

export interface DrillResponse {
  kpi: string;
  level: number;
  // Level 2 payloads (one per KPI)
  breakdown_by_assignee?: Array<{ name: string; count: number }>;
  breakdown_by_type?: Array<{ name: string; count: number }>;
  breakdown_by_priority?: Array<{ name: string; count: number }>;
  breakdown_by_project?: Array<{ name: string; count: number }>;
  resolution_buckets?: Array<{ bucket: string; count: number }>;
  daily_closures?: Array<{ date: string; closed: number; updated: number }>;
  reopened_issues?: DrillIssueRow[];
  activity_calendar?: Array<{ date: string; active: boolean; closed: number; updated: number; created: number; dayType?: string | null; label?: string | null }>;
  backlog_buckets?: Array<{ bucket: string; count: number; issues?: DrillIssueRow[] }>;
  // worked_on_holidays level 2
  holiday_days?: Array<{ date: string; day_type: string; label: string | null; count: number }>;
  // Level 3 payloads
  issues?: DrillIssueRow[];
  slowest_issues?: (DrillIssueRow & { transitions: Array<{ from: string; to: string; date: string }> })[];
  day_detail?: { date: string; closed: DrillIssueRow[]; updated: DrillIssueRow[] };
  reopen_cycles?: Array<DrillIssueRow & { first_closed: string | null; reopen_date: string | null; cycles: number }>;
  bucket_issues?: DrillIssueRow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildFilters(assigneeId: string | null, projectKey: string | null) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (assigneeId) {
    clauses.push("assignee_id = ?");
    params.push(assigneeId);
  }
  if (projectKey) {
    const keys = projectKey.split(/[+,\s]/).map(k => k.trim()).filter(Boolean);
    if (keys.length === 1) {
      clauses.push("project_key = ?");
      params.push(keys[0]);
    } else if (keys.length > 1) {
      clauses.push(`project_key IN (${keys.map(() => "?").join(",")})`);
      params.push(...keys);
    }
  }
  const where = clauses.length ? "AND " + clauses.join(" AND ") : "";
  return { where, params };
}

function toIssueRow(r: Record<string, unknown>): DrillIssueRow {
  return {
    issue_key: String(r.issue_key ?? ""),
    summary: String(r.summary ?? ""),
    assignee_name: String(r.assignee_name ?? "Unassigned"),
    issue_type: r.issue_type != null ? String(r.issue_type) : null,
    priority: r.priority != null ? String(r.priority) : null,
    project_key: r.project_key != null ? String(r.project_key) : null,
    created_date: String(r.created_date ?? ""),
    completed_date: r.completed_date != null ? String(r.completed_date) : null,
    updated_date: r.updated_date != null ? String(r.updated_date) : null,
    resolution_time_days: r.resolution_time_days != null ? Number(r.resolution_time_days) : null,
    status: String(r.status ?? ""),
    reopened_flag: Number(r.reopened_flag ?? 0),
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ kpi: string }> }
) {
  const { kpi } = await params;
  const sp = req.nextUrl.searchParams;
  const month = sp.get("month");
  const assigneeId = sp.get("assignee_id") || null;
  const projectKey = sp.get("project_key") || null;
  const level = Number(sp.get("level") ?? "2");
  // Level 3 context params
  const bucket = sp.get("bucket") || null;    // resolution/backlog bucket
  const date = sp.get("date") || null;    // velocity day drill

  const db = await getAsyncDb();

  // Robust date parsing
  let ref: Date;
  try {
    if (month) {
      // If month is just 'Jan', 'Feb', etc (3 chars), it's missing the year
      if (month.length === 3) {
        const curYear = new Date().getFullYear();
        ref = new Date(`${month} 01 ${curYear}`);
      } else {
        ref = new Date(`${month}-01T00:00:00`);
      }

      if (isNaN(ref.getTime())) {
        // Fallback if Date parsing still fails
        ref = new Date();
      }
    } else {
      ref = new Date();
    }
  } catch {
    ref = new Date();
  }

  const startStr = format(startOfMonth(ref), "yyyy-MM-dd");
  const endStr = format(endOfMonth(ref), "yyyy-MM-dd");
  const { where, params: fp } = buildFilters(assigneeId, projectKey);

  try {
    const resp: DrillResponse = { kpi, level };

    // Shared Level 2 distributions (Issue Type & Priority)
    if (level === 2) {
      // We use different date logic depending on the KPI
      let distWhere = "";
      let distParams: unknown[] = [];

      if (kpi === "backlog") {
        distWhere = `WHERE completed_date IS NULL ${where}`;
        distParams = fp;
      } else {
        distWhere = `WHERE completed_date BETWEEN ? AND ? ${where}`;
        distParams = [startStr, endStr, ...fp];
      }

      resp.breakdown_by_type = await db.query(
        `SELECT COALESCE(issue_type,'Unknown') AS name, COUNT(*) AS count
           FROM jira_issues
           ${distWhere}
           GROUP BY issue_type ORDER BY count DESC`,
        distParams
      );

      resp.breakdown_by_priority = await db.query(
        `SELECT COALESCE(priority,'Unknown') AS name, COUNT(*) AS count
           FROM jira_issues
           ${distWhere}
           GROUP BY priority ORDER BY count DESC`,
        distParams
      );
    }

    // ─── 1. Issues Closed ──────────────────────────────────────────────────
    if (kpi === "issues_closed") {
      if (level === 2) {
        // Breakdown by assignee
        resp.breakdown_by_assignee = await db.query(
          `SELECT assignee_name AS name, COUNT(*) AS count
             FROM jira_issues
             WHERE completed_date BETWEEN ? AND ? ${where}
             GROUP BY assignee_name ORDER BY count DESC`,
          [startStr, endStr, ...fp]
        );

        // Breakdown by project
        resp.breakdown_by_project = await db.query(
          `SELECT COALESCE(project_key,'Unknown') AS name, COUNT(*) AS count
             FROM jira_issues
             WHERE completed_date BETWEEN ? AND ? ${where}
             GROUP BY project_key ORDER BY count DESC`,
          [startStr, endStr, ...fp]
        );
      }


      if (level === 3) {
        // Full issue table
        const rows = await db.query(
          `SELECT issue_key, summary, assignee_name, issue_type, priority, project_key,
                  created_date, completed_date, updated_date, resolution_time_days, status, reopened_flag
           FROM jira_issues
           WHERE completed_date BETWEEN ? AND ? ${where}
           ORDER BY resolution_time_days DESC`,
          [startStr, endStr, ...fp]
        );
        resp.issues = rows.map(toIssueRow);
      }
    }

    // ─── 2. Avg Resolution Time ────────────────────────────────────────────
    if (kpi === "resolution_time") {
      if (level === 2) {
        const rows = await db.query(
          `SELECT resolution_time_days FROM jira_issues
           WHERE completed_date BETWEEN ? AND ? AND resolution_time_days IS NOT NULL ${where}`,
          [startStr, endStr, ...fp]
        ) as Array<{ resolution_time_days: number }>;

        const buckets: Record<string, number> = { "0–1 day": 0, "1–3 days": 0, "3–7 days": 0, "7+ days": 0 };
        for (const { resolution_time_days: d } of rows) {
          if (d <= 1) buckets["0–1 day"]++;
          else if (d <= 3) buckets["1–3 days"]++;
          else if (d <= 7) buckets["3–7 days"]++;
          else buckets["7+ days"]++;
        }
        resp.resolution_buckets = Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
      }

      if (level === 3) {
        // Slowest 10 issues
        const raw = await db.query(
          `SELECT issue_key, summary, assignee_name, issue_type, priority, project_key,
                  created_date, completed_date, updated_date, resolution_time_days, status, reopened_flag
           FROM jira_issues
           WHERE completed_date BETWEEN ? AND ? AND resolution_time_days IS NOT NULL ${where}
           ${bucket ? bucketSQLFilter(bucket) : ""}
           ORDER BY resolution_time_days DESC LIMIT 10`,
          [startStr, endStr, ...fp]
        );
        resp.slowest_issues = raw.map((r) => ({ ...toIssueRow(r), transitions: [] }));
      }
    }

    // ─── 3. Output Velocity ────────────────────────────────────────────────
    if (kpi === "output_velocity") {
      if (level === 2) {
        // Daily closure counts for the month
        const closedRows = await db.query(
          `SELECT completed_date AS date, COUNT(*) AS cnt
           FROM jira_issues
           WHERE completed_date BETWEEN ? AND ? ${where}
           GROUP BY completed_date ORDER BY completed_date`,
          [startStr, endStr, ...fp]
        ) as Array<{ date: string; cnt: number }>;

        const updatedRows = await db.query(
          `SELECT updated_date AS date, COUNT(*) AS cnt
           FROM jira_issues
           WHERE updated_date BETWEEN ? AND ? ${where}
           GROUP BY updated_date ORDER BY updated_date`,
          [startStr, endStr, ...fp]
        ) as Array<{ date: string; cnt: number }>;

        const closedMap = Object.fromEntries(closedRows.map((r) => [r.date, r.cnt]));
        const updatedMap = Object.fromEntries(updatedRows.map((r) => [r.date, r.cnt]));
        const allDateKeys = Object.keys(closedMap).concat(Object.keys(updatedMap));
        const allDates = allDateKeys.filter((d, i) => allDateKeys.indexOf(d) === i);
        resp.daily_closures = allDates.sort().map((d) => ({
          date: d,
          closed: closedMap[d] ?? 0,
          updated: updatedMap[d] ?? 0,
        }));
      }

      if (level === 3) {
        if (date) {
          // Day-level drill (interactive drawer)
          const closed = await db.query(
            `SELECT issue_key, summary, assignee_name, issue_type, priority, project_key,
                      created_date, completed_date, updated_date, resolution_time_days, status, reopened_flag
               FROM jira_issues WHERE completed_date = ? ${where} ORDER BY issue_key`,
            [date, ...fp]
          );

          const updated = await db.query(
            `SELECT issue_key, summary, assignee_name, issue_type, priority, project_key,
                      created_date, completed_date, updated_date, resolution_time_days, status, reopened_flag
               FROM jira_issues WHERE updated_date = ? AND (completed_date IS NULL OR completed_date != ?) ${where}
               ORDER BY issue_key`,
            [date, date, ...fp]
          );

          resp.day_detail = {
            date,
            closed: closed.map(toIssueRow),
            updated: updated.map(toIssueRow),
          };
        } else {
          // Report mode — all closed issues for the month
          const rows = await db.query(
            `SELECT issue_key, summary, assignee_name, issue_type, priority, project_key,
                      created_date, completed_date, updated_date, resolution_time_days, status, reopened_flag
               FROM jira_issues
               WHERE completed_date BETWEEN ? AND ? ${where}
               ORDER BY completed_date DESC`,
            [startStr, endStr, ...fp]
          );
          resp.issues = rows.map(toIssueRow);
        }
      }
    }

    // ─── 4. Stability Score ────────────────────────────────────────────────
    if (kpi === "stability") {
      if (level === 2) {
        const rows = await db.query(
          `SELECT issue_key, summary, assignee_name, issue_type, priority, project_key,
                  created_date, completed_date, updated_date, resolution_time_days, status, reopened_flag
           FROM jira_issues
           WHERE reopened_flag = 1 AND completed_date BETWEEN ? AND ? ${where}
           ORDER BY completed_date DESC`,
          [startStr, endStr, ...fp]
        );
        resp.reopened_issues = rows.map(toIssueRow);
      }

      if (level === 3) {
        // Reopen cycle detail
        const rows = await db.query(
          `SELECT issue_key, summary, assignee_name, issue_type, priority, project_key,
                  created_date, completed_date, updated_date, resolution_time_days, status, reopened_flag
           FROM jira_issues
           WHERE reopened_flag = 1 AND completed_date BETWEEN ? AND ? ${where}
           ORDER BY completed_date DESC`,
          [startStr, endStr, ...fp]
        );
        resp.reopen_cycles = rows.map((r) => ({
          ...toIssueRow(r),
          first_closed: r.completed_date != null ? String(r.completed_date) : null,
          reopen_date: r.updated_date != null ? String(r.updated_date) : null,
          cycles: 1,
        }));
      }
    }

    // ─── 5. Throughput Consistency ─────────────────────────────────────────
    if (kpi === "throughput") {
      // Level 3: clicking a day on the calendar — return actual issues for that date
      if (level === 3 && date) {
        const closed = await db.query(
          `SELECT issue_key, summary, assignee_name, issue_type, priority, project_key,
                      created_date, completed_date, updated_date, resolution_time_days, status, reopened_flag
               FROM jira_issues WHERE completed_date = ? ${where} ORDER BY issue_key`,
          [date, ...fp]
        );

        const updated = await db.query(
          `SELECT issue_key, summary, assignee_name, issue_type, priority, project_key,
                      created_date, completed_date, updated_date, resolution_time_days, status, reopened_flag
               FROM jira_issues WHERE updated_date = ? AND (completed_date IS NULL OR completed_date != ?) ${where}
               ORDER BY issue_key`,
          [date, date, ...fp]
        );

        const created = await db.query(
          `SELECT issue_key, summary, assignee_name, issue_type, priority, project_key,
                      created_date, completed_date, updated_date, resolution_time_days, status, reopened_flag
               FROM jira_issues WHERE created_date = ? AND (completed_date IS NULL OR completed_date != ?) AND (updated_date IS NULL OR updated_date != ?) ${where}
               ORDER BY issue_key`,
          [date, date, date, ...fp]
        );

        resp.day_detail = {
          date,
          closed: closed.map(toIssueRow),
          updated: [...updated.map(toIssueRow), ...created.map(toIssueRow)],
        };
        return NextResponse.json(resp);
      }

      // Level 2: build real calendar for the selected month
      const calStartStr = startStr;
      const calEndStr = endStr;

      // Fetch org calendar marks for this month
      const orgMarks = await db.query(
        `SELECT date, day_type, label FROM org_calendar WHERE date >= ? AND date <= ?`,
        [calStartStr, calEndStr]
      ) as Array<{ date: string; day_type: string; label: string | null }>;
      const orgMarkMap = new Map<string, { day_type: string; label: string | null }>();
      for (const m of orgMarks) orgMarkMap.set(m.date, { day_type: m.day_type, label: m.label });

      const createdRows = await db.query(
        `SELECT created_date AS date, COUNT(*) AS cnt FROM jira_issues
             WHERE created_date BETWEEN ? AND ? ${where}
             GROUP BY created_date`,
        [calStartStr, calEndStr, ...fp]
      ) as Array<{ date: string; cnt: number }>;

      const closedRows2 = await db.query(
        `SELECT completed_date AS date, COUNT(*) AS cnt FROM jira_issues
             WHERE completed_date BETWEEN ? AND ? ${where}
             GROUP BY completed_date`,
        [calStartStr, calEndStr, ...fp]
      ) as Array<{ date: string; cnt: number }>;

      const updatedRows2 = await db.query(
        `SELECT updated_date AS date, COUNT(*) AS cnt FROM jira_issues
             WHERE updated_date BETWEEN ? AND ? ${where}
             GROUP BY updated_date`,
        [calStartStr, calEndStr, ...fp]
      ) as Array<{ date: string; cnt: number }>;

      const createdMap = Object.fromEntries(createdRows.map(r => [r.date, r.cnt]));
      const closedMap2 = Object.fromEntries(closedRows2.map(r => [r.date, r.cnt]));
      const updatedMap2 = Object.fromEntries(updatedRows2.map(r => [r.date, r.cnt]));

      // All calendar days in range
      const allDays: string[] = [];
      const d = new Date(calStartStr + "T00:00:00");
      const end = new Date(calEndStr + "T00:00:00");
      while (d <= end) {
        allDays.push(format(d, "yyyy-MM-dd"));
        d.setDate(d.getDate() + 1);
      }

      resp.activity_calendar = allDays.map((day) => {
        const created = createdMap[day] ?? 0;
        const closed = closedMap2[day] ?? 0;
        const updated = updatedMap2[day] ?? 0;
        const mark = orgMarkMap.get(day) ?? null;
        return {
          date: day,
          active: (created + closed + updated) > 0,
          closed, updated, created,
          dayType: mark?.day_type ?? null,
          label: mark?.label ?? null,
        };
      });
    }

    // ─── 6. Backlog Health ─────────────────────────────────────────────────
    if (kpi === "backlog") {
      if (level === 2) {
        const openRows = await db.query(
          `SELECT issue_key, summary, assignee_name, issue_type, priority, project_key,
                  created_date, completed_date, updated_date, resolution_time_days, status, reopened_flag,
                  CAST(julianday('now') - julianday(created_date) AS INTEGER) AS age_days
           FROM jira_issues
           WHERE completed_date IS NULL ${where}
           ORDER BY age_days DESC`,
          fp
        ) as Array<Record<string, unknown> & { age_days: number }>;

        const buckets: Record<string, number> = { "0–7 days": 0, "8–14 days": 0, "15–30 days": 0, "30+ days": 0 };
        for (const r of openRows) {
          const age = Number(r.age_days);
          if (age <= 7) buckets["0–7 days"]++;
          else if (age <= 14) buckets["8–14 days"]++;
          else if (age <= 30) buckets["15–30 days"]++;
          else buckets["30+ days"]++;
        }
        resp.backlog_buckets = Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
      }

      if (level === 3) {
        if (bucket) {
          // Interactive drawer — specific bucket
          const [minAge, maxAge] = bucketToAgeBounds(bucket);
          const rows = await db.query(
            `SELECT issue_key, summary, assignee_name, issue_type, priority, project_key,
                      created_date, completed_date, updated_date, resolution_time_days, status, reopened_flag
               FROM jira_issues
               WHERE completed_date IS NULL
                 AND (julianday('now') - julianday(created_date)) >= ?
                 AND (julianday('now') - julianday(created_date)) ${maxAge === Infinity ? ">= ?" : "<= ?"}
                 ${where}
               ORDER BY created_date ASC`,
            [minAge, maxAge === Infinity ? minAge : maxAge, ...fp]
          );
          resp.bucket_issues = rows.map(toIssueRow);
        } else {
          // Report mode — all open issues sorted by age
          const rows = await db.query(
            `SELECT issue_key, summary, assignee_name, issue_type, priority, project_key,
                      created_date, completed_date, updated_date, resolution_time_days, status, reopened_flag
               FROM jira_issues
               WHERE completed_date IS NULL ${where}
               ORDER BY created_date ASC`,
            fp
          );
          resp.bucket_issues = rows.map(toIssueRow);
        }
      }
    }

    // ─── 7. Worked on Holidays ─────────────────────────────────────────────
    if (kpi === "worked_on_holidays") {
      // Fetch org off-days in range
      const offRows = await db.query(
        `SELECT date, day_type, label FROM org_calendar WHERE date >= ? AND date <= ? ORDER BY date`,
        [startStr, endStr]
      ) as Array<{ date: string; day_type: string; label: string | null }>;

      if (level === 2) {
        // For each holiday/leave day, count issues with activity on that day
        const holidayDays: Array<{ date: string; day_type: string; label: string | null; count: number }> = [];
        for (const off of offRows) {
          const rows = await db.query(
            `SELECT COUNT(*) AS cnt FROM jira_issues
               WHERE (completed_date = ? OR updated_date = ? OR created_date = ?) ${where}`,
            [off.date, off.date, off.date, ...fp]
          );
          const cnt = Number(rows[0]?.cnt ?? 0);
          if (cnt > 0) {
            holidayDays.push({ date: off.date, day_type: off.day_type, label: off.label, count: cnt });
          }
        }
        resp.holiday_days = holidayDays;
      }

      if (level === 3 && date) {
        // All issues with activity on that specific holiday/leave date
        const closed = await db.query(
          `SELECT issue_key, summary, assignee_name, issue_type, priority, project_key,
                    created_date, completed_date, updated_date, resolution_time_days, status, reopened_flag
             FROM jira_issues WHERE completed_date = ? ${where} ORDER BY issue_key`,
          [date, ...fp]
        );

        const updated = await db.query(
          `SELECT issue_key, summary, assignee_name, issue_type, priority, project_key,
                    created_date, completed_date, updated_date, resolution_time_days, status, reopened_flag
             FROM jira_issues WHERE updated_date = ? AND (completed_date IS NULL OR completed_date != ?) ${where}
             ORDER BY issue_key`,
          [date, date, ...fp]
        );

        const created = await db.query(
          `SELECT issue_key, summary, assignee_name, issue_type, priority, project_key,
                    created_date, completed_date, updated_date, resolution_time_days, status, reopened_flag
             FROM jira_issues WHERE created_date = ? AND (completed_date IS NULL OR completed_date != ?) AND (updated_date IS NULL OR updated_date != ?) ${where}
             ORDER BY issue_key`,
          [date, date, date, ...fp]
        );

        resp.day_detail = {
          date,
          closed: closed.map(toIssueRow),
          updated: [...updated.map(toIssueRow), ...created.map(toIssueRow)],
        };
      }
    }

    return NextResponse.json(resp);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bucketSQLFilter(bucket: string): string {
  if (bucket === "0–1 day") return "AND resolution_time_days <= 1";
  if (bucket === "1–3 days") return "AND resolution_time_days > 1 AND resolution_time_days <= 3";
  if (bucket === "3–7 days") return "AND resolution_time_days > 3 AND resolution_time_days <= 7";
  if (bucket === "7+ days") return "AND resolution_time_days > 7";
  return "";
}

function bucketToAgeBounds(bucket: string): [number, number] {
  if (bucket === "0–7 days") return [0, 7];
  if (bucket === "8–14 days") return [8, 14];
  if (bucket === "15–30 days") return [15, 30];
  return [31, Infinity];
}
