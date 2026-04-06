import { getAsyncDb } from "./db-async";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  eachDayOfInterval,
  format,
  isWeekend,
  differenceInDays,
  parseISO,
} from "date-fns";
import type {
  KPICard,
  MoMValue,
  JiraMetrics,
  Alert,
  DashboardData,
  CalendarSummary,
  EmployeeSummary,
  AdminDashboardData,
  TrendData,
  MonthlyTrendPoint,
  BacklogAgingBucket,
} from "@/types";
import { calculateCompositeScore } from "./scoring";

function buildProjectClause(projectKey: string | null): { clause: string; params: string[] } {
  if (!projectKey) return { clause: "", params: [] };
  // Split on +, comma, or space (URL decodes + as space)
  const keys = projectKey.split(/[+,\s]/).map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) return { clause: "", params: [] };
  if (keys.length === 1) return { clause: "AND project_key = ?", params: [keys[0]] };
  return {
    clause: `AND project_key IN (${keys.map(() => "?").join(",")})`,
    params: keys,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function momChange(current: number, previous: number): MoMValue {
  const change_pct =
    previous === 0
      ? null
      : Math.round(((current - previous) / previous) * 1000) / 10;
  return { current: round2(current), previous: round2(previous), change_pct };
}

// ─── Org calendar helpers ─────────────────────────────────────────────────────

/** Returns a Set of all holiday/leave dates from org_calendar + employee_leaves */
async function getOrgOffDates(startStr: string, endStr: string, assigneeId?: string | null): Promise<Set<string>> {
  const db = await getAsyncDb();
  const rows = await db.query(
    `SELECT date FROM org_calendar WHERE date >= ? AND date <= ?`,
    [startStr, endStr]
  ) as Array<{ date: string }>;
  const dates = new Set(rows.map((r) => r.date));

  // Also include employee-specific leaves
  if (assigneeId) {
    try {
      const empRows = await db.query(
        `SELECT date FROM employee_leaves WHERE employee_id = ? AND date >= ? AND date <= ? AND status = 'approved'`,
        [assigneeId, startStr, endStr]
      ) as Array<{ date: string }>;
      for (const r of empRows) dates.add(r.date);
    } catch (_e) {
      // table may not exist yet
    }
  }
  return dates;
}

// ─── Working days in a range (Mon–Fri, minus org holidays/leaves/employee leaves) ─

async function workingDaysInRange(start: Date, end: Date, assigneeId?: string | null): Promise<string[]> {
  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");
  const offDates = await getOrgOffDates(startStr, endStr, assigneeId);
  return eachDayOfInterval({ start, end })
    .filter((d) => !isWeekend(d) && !offDates.has(format(d, "yyyy-MM-dd")))
    .map((d) => format(d, "yyyy-MM-dd"));
}

// ─── Core period calculator ───────────────────────────────────────────────────

interface PeriodResult {
  issuesClosed: number;
  avgResolutionDays: number;
  outputVelocity: number;
  efficiencyIndex: number;
  focusRatio: number;
  stabilityScore: number;
  throughputConsistency: number;
  lowActivityDays: number;
  backlogHealth: number;
  reopenedIssues: number;
  workingDayCount: number;
  workedOnHolidays: number;    // issues with activity on an org holiday/leave day
}

async function calcPeriod(
  monthStart: Date,
  monthEnd: Date,
  assigneeId: string | null,
  projectKey: string | null
): Promise<PeriodResult> {
  const db = await getAsyncDb();
  const startStr = format(monthStart, "yyyy-MM-dd");
  const endStr = format(monthEnd, "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");
  const effectiveEnd = endStr < today ? endStr : today;

  const ac = assigneeId ? "AND assignee_id = ?" : "";
  const { clause: pc, params: projectParams } = buildProjectClause(projectKey);

  function args(...base: string[]): unknown[] {
    const extra: unknown[] = [];
    if (assigneeId) extra.push(assigneeId);
    extra.push(...projectParams);
    return [...base, ...extra];
  }

  // 1. Issues Closed: status category = Done within period (completed_date)
  const closedRows = await db.query(
    `SELECT created_date, completed_date
       FROM jira_issues
       WHERE completed_date BETWEEN ? AND ? ${ac} ${pc}`,
    args(startStr, endStr)
  ) as Array<{ created_date: string; completed_date: string }>;

  const issuesClosed = closedRows.length;
  
  // Calculate average resolution time excluding non-working days
  let totalWorkDays = 0;
  if (issuesClosed > 0) {
    // Determine the earliest created date to fetch sufficient off-dates
    let earliestCreated = startStr;
    for (const r of closedRows) {
      if (r.created_date < earliestCreated) earliestCreated = r.created_date;
    }
    const offDates = await getOrgOffDates(earliestCreated, endStr, assigneeId);
    
    for (const r of closedRows) {
      if (!r.created_date || !r.completed_date) continue;
      const days = eachDayOfInterval({ 
        start: parseISO(r.created_date), 
        end: parseISO(r.completed_date) 
      }).filter(d => !isWeekend(d) && !offDates.has(format(d, "yyyy-MM-dd")));
      // Resolution time is "days between", so same-day is 0.
      totalWorkDays += Math.max(0, days.length - 1);
    }
  }
  const avgResolutionDays = issuesClosed > 0 ? round2(totalWorkDays / issuesClosed) : 0;

  // Issues assigned in period (created in period = assigned to work on)
  const assignedRows = await db.query(
    `SELECT COUNT(*) AS cnt FROM jira_issues
       WHERE created_date BETWEEN ? AND ? ${ac} ${pc}`,
    args(startStr, endStr)
  );
  const assignedRow = assignedRows[0] || { cnt: 0 };
  const issuesAssigned = Number(assignedRow.cnt || 0);

  // Working days up to today in this period
  const wdAll = await workingDaysInRange(monthStart, monthEnd, assigneeId);
  const wdToDate = wdAll.filter((d) => d <= effectiveEnd);
  const workingDayCount = wdToDate.length;

  // 3. Output Velocity = issues closed / working days
  const outputVelocity =
    workingDayCount > 0 ? round2(issuesClosed / workingDayCount) : 0;

  // 4. Efficiency Index = issues closed / avg resolution days
  const efficiencyIndex =
    avgResolutionDays > 0 ? round2(issuesClosed / avgResolutionDays) : 0;

  // 5. Focus Ratio = (closed / assigned) * 100
  const focusRatio =
    issuesAssigned > 0 ? Math.min(100, round1((issuesClosed / issuesAssigned) * 100)) : 0;

  // 6. Stability Score = (1 - reopened/closed) * 100
  // Reopened = issues where changelog shows Done -> In Progress transition
  const reopenedRows = await db.query(
    `SELECT COUNT(*) AS cnt FROM jira_issues
       WHERE reopened_flag = 1 AND completed_date BETWEEN ? AND ? ${ac} ${pc}`,
    args(startStr, endStr)
  );
  const reopenedRow = reopenedRows[0] || { cnt: 0 };
  const reopenedIssues = Number(reopenedRow.cnt || 0);
  const stabilityScore =
    issuesClosed > 0
      ? Math.max(0, Math.min(100, round1((1 - reopenedIssues / issuesClosed) * 100)))
      : 100;

  // 7. Throughput Consistency = (active working days / total working days) * 100
  // Active = a working day with at least one issue created, updated (fetched_at), or closed
  const activityRows = await db.query(
    `SELECT created_date AS d FROM jira_issues
       WHERE created_date BETWEEN ? AND ? ${ac} ${pc}
       UNION
       SELECT completed_date AS d FROM jira_issues
       WHERE completed_date BETWEEN ? AND ? ${ac} ${pc}`,
    [
      startStr, endStr,
      ...(assigneeId ? [assigneeId] : []),
      ...projectParams,
      startStr, endStr,
      ...(assigneeId ? [assigneeId] : []),
      ...projectParams,
    ]
  ) as Array<{ d: string | null }>;

  const activeDaySet = new Set<string>();
  for (const r of activityRows) {
    if (r.d && r.d >= startStr && r.d <= effectiveEnd) activeDaySet.add(r.d);
  }
  const activeWorkingDays = wdToDate.filter((d) => activeDaySet.has(d)).length;
  const throughputConsistency =
    workingDayCount > 0
      ? Math.max(0, Math.min(100, round1((activeWorkingDays / workingDayCount) * 100)))
      : 0;

  // 8. Low Activity Days = working days with zero issue activity
  const lowActivityDays = workingDayCount - activeWorkingDays;

  // 9. Backlog Health = (open issues older than 14d / total open) * 100
  // Note: we use CURRENT_DATE in PG wrapper to handle julian conversion
  const openRows = await db.query(
    `SELECT COUNT(*) AS total,
              SUM(CASE WHEN (strftime('%s', 'now') - strftime('%s', created_date)) / 86400 > 14 THEN 1 ELSE 0 END) AS old
       FROM jira_issues
       WHERE completed_date IS NULL ${ac} ${pc}`,
    [
      ...(assigneeId ? [assigneeId] : []),
      ...projectParams
    ]
  );
  const openRow = openRows[0] || { total: 0, old: 0 };
  const backlogHealth =
    Number(openRow.total || 0) > 0 ? Math.max(0, Math.min(100, round1((Number(openRow.old || 0) / Number(openRow.total || 0)) * 100))) : 0;

  // 10. Worked on Holidays = distinct days with Jira activity that fall on an org holiday/leave
  const offDates = await getOrgOffDates(startStr, endStr, assigneeId);
  let workedOnHolidays = 0;
  if (offDates.size > 0) {
    const offList = Array.from(offDates).map(() => "?").join(",");
    const offArgs = Array.from(offDates);
    const holidayActivityRows = await db.query(
      `SELECT COUNT(DISTINCT COALESCE(completed_date, updated_date, created_date)) AS cnt
       FROM jira_issues
       WHERE (
         (completed_date IN (${offList})) OR
         (updated_date IN (${offList})) OR
         (created_date IN (${offList}))
       ) ${ac} ${pc}`,
      [...offArgs, ...offArgs, ...offArgs,
      ...(assigneeId ? [assigneeId] : []),
      ...projectParams]
    );
    const holidayActivityRow = holidayActivityRows[0] || { cnt: 0 };
    workedOnHolidays = Number(holidayActivityRow.cnt || 0);
  }

  return {
    issuesClosed,
    avgResolutionDays,
    outputVelocity,
    efficiencyIndex,
    focusRatio,
    stabilityScore,
    throughputConsistency,
    lowActivityDays,
    backlogHealth,
    reopenedIssues,
    workingDayCount,
    workedOnHolidays,
  };
}

// ─── Trend data (last 6 months) ───────────────────────────────────────────────

async function buildTrends(
  refDate: Date,
  assigneeId: string | null,
  projectKey: string | null
): Promise<TrendData> {
  const db = await getAsyncDb();
  const MONTHS = 6;

  const output_trend: MonthlyTrendPoint[] = [];
  const resolution_trend: MonthlyTrendPoint[] = [];
  const stability_trend: MonthlyTrendPoint[] = [];
  const backlog_aging: BacklogAgingBucket[] = [];

  const ac = assigneeId ? "AND assignee_id = ?" : "";
  const { clause: pc, params: projectParams } = buildProjectClause(projectKey);
  const trendArgs = (...base: string[]): unknown[] => {
    const extra: unknown[] = [];
    if (assigneeId) extra.push(assigneeId);
    extra.push(...projectParams);
    return [...base, ...extra];
  };

  for (let i = MONTHS - 1; i >= 0; i--) {
    const mRef = subMonths(refDate, i);
    const mStart = startOfMonth(mRef);
    const mEnd = endOfMonth(mRef);
    const mStartStr = format(mStart, "yyyy-MM-dd");
    const mEndStr = format(mEnd, "yyyy-MM-dd");
    const monthKey = format(mRef, "yyyy-MM");
    const monthLabel = format(mRef, "MMM");

    // Output trend: issues closed
    const closedRows = await db.query(
      `SELECT COUNT(*) AS cnt, AVG(resolution_time_days) AS avg_res
         FROM jira_issues WHERE completed_date BETWEEN ? AND ? ${ac} ${pc}`,
      trendArgs(mStartStr, mEndStr)
    );
    const closedRow = closedRows[0] || { cnt: 0, avg_res: null };

    output_trend.push({ month: monthLabel, month_key: monthKey, value: Number(closedRow.cnt || 0) });
    resolution_trend.push({
      month: monthLabel,
      month_key: monthKey,
      value: closedRow.avg_res ? round2(Number(closedRow.avg_res)) : 0,
    });

    // Stability trend
    const reopenedRows = await db.query(
      `SELECT COUNT(*) AS cnt FROM jira_issues
         WHERE reopened_flag = 1 AND completed_date BETWEEN ? AND ? ${ac} ${pc}`,
      trendArgs(mStartStr, mEndStr)
    );
    const reopenedRow = reopenedRows[0] || { cnt: 0 };
    const stability =
      Number(closedRow.cnt || 0) > 0
        ? round1((1 - Number(reopenedRow.cnt || 0) / Number(closedRow.cnt || 0)) * 100)
        : 100;
    stability_trend.push({ month: monthLabel, month_key: monthKey, value: stability });

    // Backlog aging buckets (snapshot of open issues at end of that month)
    const agingRows = await db.query(
      `SELECT created_date FROM jira_issues
         WHERE created_date <= ? AND (completed_date IS NULL OR completed_date > ?) ${ac} ${pc}`,
      trendArgs(mEndStr, mEndStr)
    ) as Array<{ created_date: string }>;

    const buckets = { "0-7": 0, "8-14": 0, "15-30": 0, "30+": 0 };
    const snapDate = new Date(mEndStr + "T00:00:00");
    for (const row of agingRows) {
      const age = differenceInDays(snapDate, new Date(row.created_date + "T00:00:00"));
      if (age <= 7) buckets["0-7"]++;
      else if (age <= 14) buckets["8-14"]++;
      else if (age <= 30) buckets["15-30"]++;
      else buckets["30+"]++;
    }
    backlog_aging.push({ month: monthLabel, month_key: monthKey, ...buckets });
  }

  return { output_trend, resolution_trend, stability_trend, backlog_aging };
}

// ─── Calendar summary ─────────────────────────────────────────────────────────

async function buildCalendarSummary(monthStart: Date, monthEnd: Date, employeeId?: string | null): Promise<CalendarSummary> {
  const db = await getAsyncDb();
  const startStr = format(monthStart, "yyyy-MM-dd");
  const endStr = format(monthEnd, "yyyy-MM-dd");

  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const total_days_in_month = allDays.length;
  const weekends = allDays.filter((d) => isWeekend(d)).length;

  const calRows = await db.query(
    `SELECT date, day_type FROM org_calendar WHERE date >= ? AND date <= ?`,
    [startStr, endStr]
  ) as Array<{ date: string; day_type: string }>;

  const holidayDates = new Set(calRows.filter((r) => r.day_type === "holiday").map((r) => r.date));
  const leaveDates = new Set(calRows.filter((r) => r.day_type === "leave").map((r) => r.date));

  // Also include employee-specific leaves from employee_leaves table
  if (employeeId) {
    try {
      const empLeaveRows = await db.query(
        `SELECT date FROM employee_leaves WHERE employee_id = ? AND date >= ? AND date <= ? AND status = 'approved'`,
        [employeeId, startStr, endStr]
      ) as Array<{ date: string }>;
      for (const row of empLeaveRows) {
        leaveDates.add(row.date);
      }
    } catch (_e) {
      // employee_leaves table may not exist yet — skip silently
    }
  }

  // Count only non-weekend holidays/leaves
  const public_holidays = allDays.filter((d) => !isWeekend(d) && holidayDates.has(format(d, "yyyy-MM-dd"))).length;
  const leave_days = allDays.filter((d) => !isWeekend(d) && leaveDates.has(format(d, "yyyy-MM-dd"))).length;
  const working_days = allDays.filter((d) => !isWeekend(d) && !holidayDates.has(format(d, "yyyy-MM-dd")) && !leaveDates.has(format(d, "yyyy-MM-dd"))).length;

  return { total_days_in_month, working_days, weekends, public_holidays, leave_days };
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

function buildAlerts(
  p: PeriodResult,
  _assigneeId: string | null
): Alert[] {
  const alerts: Alert[] = [];

  if (p.lowActivityDays >= 5) {
    alerts.push({
      id: "low-activity-5d",
      type: "danger",
      message: `${p.lowActivityDays} working days with zero Jira activity this month.`,
    });
  } else if (p.lowActivityDays >= 3) {
    alerts.push({
      id: "low-activity-3d",
      type: "warning",
      message: `${p.lowActivityDays} working days with no Jira activity recorded.`,
    });
  }

  if (p.stabilityScore < 70) {
    alerts.push({
      id: "low-stability",
      type: "danger",
      message: `Stability score is ${p.stabilityScore}% — high issue reopen rate detected.`,
    });
  }

  if (p.backlogHealth > 50) {
    alerts.push({
      id: "backlog-aging",
      type: "warning",
      message: `${p.backlogHealth}% of open issues are older than 14 days.`,
    });
  }

  if (p.focusRatio >= 90 && p.issuesClosed > 0) {
    alerts.push({
      id: "high-focus",
      type: "success",
      message: `Excellent focus this month — ${p.focusRatio}% of assigned issues closed.`,
    });
  }

  return alerts;
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export async function calculateDashboardData(
  _employeeId: string,
  assigneeId: string | null,
  projectKey: string | null = null,
  month: string | null = null
): Promise<DashboardData> {
  const db = await getAsyncDb();
  const ref = month ? new Date(`${month}-01T00:00:00`) : new Date();
  const curStart = startOfMonth(ref);
  const curEnd = endOfMonth(ref);
  const prevStart = startOfMonth(subMonths(ref, 1));
  const prevEnd = endOfMonth(subMonths(ref, 1));

  // Per-user baseline
  let baselineDate: string;
  if (assigneeId) {
    const rows = await db.query(`SELECT MIN(created_date) AS first FROM jira_issues WHERE assignee_id = ?`, [assigneeId]);
    const row = rows[0];
    baselineDate = row?.first ?? format(curStart, "yyyy-MM-dd");
  } else {
    const rows = await db.query(`SELECT MIN(created_date) AS first FROM jira_issues`);
    const row = rows[0];
    baselineDate = row?.first ?? format(curStart, "yyyy-MM-dd");
  }

  const lastEtlRows = await db.query(`SELECT run_at FROM etl_run_log WHERE status = 'success' ORDER BY id DESC LIMIT 1`);
  const lastEtlRow = lastEtlRows[0];

  const cur = await calcPeriod(curStart, curEnd, assigneeId, projectKey);
  const prev = await calcPeriod(prevStart, prevEnd, assigneeId, projectKey);

  const jiraMetrics: JiraMetrics = {
    issues_closed: cur.issuesClosed,
    avg_resolution_time_days: cur.avgResolutionDays,
    output_velocity: cur.outputVelocity,
    efficiency_index: cur.efficiencyIndex,
    focus_ratio: cur.focusRatio,
    stability_score: cur.stabilityScore,
    throughput_consistency: cur.throughputConsistency,
    low_activity_days: cur.lowActivityDays,
    backlog_health: cur.backlogHealth,
    worked_on_holidays: cur.workedOnHolidays,
    mom_issues_closed: momChange(cur.issuesClosed, prev.issuesClosed),
    mom_resolution_time: momChange(cur.avgResolutionDays, prev.avgResolutionDays),
    mom_output_velocity: momChange(cur.outputVelocity, prev.outputVelocity),
    mom_efficiency_index: momChange(cur.efficiencyIndex, prev.efficiencyIndex),
    mom_stability_score: momChange(cur.stabilityScore, prev.stabilityScore),
  };

  const kpiCards: KPICard[] = [
    {
      label: "Issues Closed",
      value: cur.issuesClosed,
      mom: momChange(cur.issuesClosed, prev.issuesClosed),
      color: cur.issuesClosed >= prev.issuesClosed ? "green" : "amber",
      description: "Issues where status = Done within selected period",
    },
    {
      label: "Avg Resolution Time",
      value: cur.avgResolutionDays,
      unit: "days",
      mom: momChange(cur.avgResolutionDays, prev.avgResolutionDays),
      color: cur.avgResolutionDays === 0 ? "neutral" : cur.avgResolutionDays <= 3 ? "green" : cur.avgResolutionDays <= 7 ? "amber" : "red",
      description: "Avg days from created to resolved",
    },
    {
      label: "Output Velocity",
      value: cur.outputVelocity,
      unit: "iss/day",
      mom: momChange(cur.outputVelocity, prev.outputVelocity),
      color: cur.outputVelocity >= 0.5 ? "green" : cur.outputVelocity >= 0.2 ? "amber" : "red",
      description: "Issues closed per working day",
    },
    {
      label: "Efficiency Index",
      value: cur.efficiencyIndex,
      unit: "iss/day",
      mom: momChange(cur.efficiencyIndex, prev.efficiencyIndex),
      color: cur.efficiencyIndex >= 1 ? "green" : cur.efficiencyIndex >= 0.3 ? "amber" : "red",
      description: "Issues closed / avg resolution days",
    },
    {
      label: "Focus Ratio",
      value: cur.focusRatio,
      unit: "%",
      color: cur.focusRatio >= 80 ? "green" : cur.focusRatio >= 50 ? "amber" : "red",
      description: "(Issues closed / issues assigned) × 100",
    },
    {
      label: "Stability Score",
      value: cur.stabilityScore,
      unit: "%",
      mom: momChange(cur.stabilityScore, prev.stabilityScore),
      color: cur.stabilityScore >= 90 ? "green" : cur.stabilityScore >= 70 ? "amber" : "red",
      description: "(1 − reopened / closed) × 100",
    },
    {
      label: "Throughput",
      value: cur.throughputConsistency,
      unit: "%",
      color: cur.throughputConsistency >= 80 ? "green" : cur.throughputConsistency >= 50 ? "amber" : "red",
      description: "Active working days / total working days × 100",
    },
    {
      label: "Low Activity Days",
      value: cur.lowActivityDays,
      unit: "d",
      color: cur.lowActivityDays === 0 ? "green" : cur.lowActivityDays <= 3 ? "amber" : "red",
      description: "Working days with zero Jira activity",
    },
    {
      label: "Backlog Health",
      value: cur.backlogHealth,
      unit: "%",
      color: cur.backlogHealth <= 20 ? "green" : cur.backlogHealth <= 50 ? "amber" : "red",
      description: "Open issues older than 14 days / total open",
    },
    {
      label: "Worked on Holidays",
      value: cur.workedOnHolidays,
      unit: cur.workedOnHolidays === 1 ? "day" : "days",
      color: cur.workedOnHolidays === 0 ? "green" : cur.workedOnHolidays <= 2 ? "amber" : "red",
      description: "Days with Jira activity that fall on org holidays or leave",
    },
  ];

  const trends = await buildTrends(ref, assigneeId, projectKey);
  const alerts = buildAlerts(cur, assigneeId);
  const calendar_summary = await buildCalendarSummary(curStart, curEnd, assigneeId);

  // Fetch peer metrics for bench-marking
  const { clause: peerPc, params: peerParams } = buildProjectClause(projectKey);
  const assigneeRows = await db.query(
    `SELECT DISTINCT assignee_id FROM jira_issues
       WHERE assignee_id != 'unassigned' AND assignee_name IS NOT NULL ${peerPc}`,
    [...peerParams]
  ) as Array<{
    assignee_id: string;
  }>;

  const peer_metrics = [];
  for (const { assignee_id } of assigneeRows) {
    const p = await calcPeriod(curStart, curEnd, assignee_id, projectKey);
    const prevP = await calcPeriod(prevStart, prevEnd, assignee_id, projectKey);

    peer_metrics.push({
      issues_closed: p.issuesClosed,
      avg_resolution_time_days: p.avgResolutionDays,
      output_velocity: p.outputVelocity,
      efficiency_index: p.efficiencyIndex,
      focus_ratio: p.focusRatio,
      stability_score: p.stabilityScore,
      throughput_consistency: p.throughputConsistency,
      low_activity_days: p.lowActivityDays,
      backlog_health: p.backlogHealth,
      worked_on_holidays: p.workedOnHolidays,
      mom_issues_closed: momChange(p.issuesClosed, prevP.issuesClosed),
      mom_resolution_time: momChange(p.avgResolutionDays, prevP.avgResolutionDays),
      mom_output_velocity: momChange(p.outputVelocity, prevP.outputVelocity),
      mom_efficiency_index: momChange(p.efficiencyIndex, prevP.efficiencyIndex),
      mom_stability_score: momChange(p.stabilityScore, prevP.stabilityScore),
    });
  }

  return {
    kpi_cards: kpiCards,
    jira_metrics: jiraMetrics,
    trends,
    alerts,
    baseline_date: baselineDate,
    last_etl_run: lastEtlRow?.run_at ?? null,
    calendar_summary,
    peer_metrics,
  };
}

// ─── Admin: per-user comparison ───────────────────────────────────────────────

export async function calculateAdminDashboard(
  projectKey: string | null = null,
  month: string | null = null
): Promise<AdminDashboardData> {
  const db = await getAsyncDb();
  const ref = month ? new Date(`${month}-01T00:00:00`) : new Date();
  const curStart = startOfMonth(ref);
  const curEnd = endOfMonth(ref);
  const monthStr = format(ref, "yyyy-MM");

  const monthPrefix = `${monthStr}%`;
  const { clause: pc, params: projectParams } = buildProjectClause(projectKey);
  const assigneeRows = await db.query(
    `SELECT DISTINCT assignee_id, assignee_name FROM jira_issues
       WHERE assignee_id != 'unassigned' 
       AND assignee_name IS NOT NULL 
       AND LOWER(assignee_name) != 'unassigned'
       AND (completed_date LIKE ? OR created_date LIKE ?)
       ${pc}
       ORDER BY assignee_name ASC`,
    [monthPrefix, monthPrefix, ...projectParams]
  ) as Array<{
    assignee_id: string;
    assignee_name: string;
  }>;

  const firstOrgRows = await db.query(`SELECT MIN(created_date) AS first FROM jira_issues`);
  const firstOrgRow = firstOrgRows[0];
  const orgBaseline = firstOrgRow?.first ?? null;

  const lastEtlRows = await db.query(`SELECT run_at FROM etl_run_log WHERE status = 'success' ORDER BY id DESC LIMIT 1`);
  const lastEtlRow = lastEtlRows[0];

  const employees: EmployeeSummary[] = [];
  for (const { assignee_id, assignee_name } of assigneeRows) {
    const firstRows = await db.query(`SELECT MIN(created_date) AS first FROM jira_issues WHERE assignee_id = ?`, [assignee_id]);
    const firstRow = firstRows[0];
    const userBaseline = firstRow?.first ?? null;

    const p = await calcPeriod(curStart, curEnd, assignee_id, projectKey);

    const score = calculateCompositeScore({
      issues_closed: p.issuesClosed,
      avg_resolution_time_days: p.avgResolutionDays,
      output_velocity: p.outputVelocity,
      efficiency_index: p.efficiencyIndex,
      focus_ratio: p.focusRatio,
      stability_score: p.stabilityScore,
      throughput_consistency: p.throughputConsistency,
      low_activity_days: p.lowActivityDays,
      backlog_health: p.backlogHealth,
      worked_on_holidays: p.workedOnHolidays,
      mom_issues_closed: { current: 0, previous: 0, change_pct: 0 }, // MoM not needed for composite score
      mom_resolution_time: { current: 0, previous: 0, change_pct: 0 },
      mom_output_velocity: { current: 0, previous: 0, change_pct: 0 },
      mom_efficiency_index: { current: 0, previous: 0, change_pct: 0 },
      mom_stability_score: { current: 0, previous: 0, change_pct: 0 },
    });

    employees.push({
      employee_id: assignee_id,
      display_name: assignee_name,
      issues_closed: p.issuesClosed,
      avg_resolution_days: p.avgResolutionDays,
      output_velocity: p.outputVelocity,
      efficiency_index: p.efficiencyIndex,
      focus_ratio: p.focusRatio,
      stability_score: p.stabilityScore,
      throughput_consistency: p.throughputConsistency,
      low_activity_days: p.lowActivityDays,
      backlog_health: p.backlogHealth,
      reopened_issues: p.reopenedIssues,
      score,
      baseline_date: userBaseline,
      project_id: projectKey || null,
    });
  }

  return {
    employees,
    month: monthStr,
    baseline_date: orgBaseline,
    last_etl_run: lastEtlRow?.run_at ?? null,
  };
}
