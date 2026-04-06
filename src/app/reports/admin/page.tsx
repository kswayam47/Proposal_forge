"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import type { AdminDashboardData, EmployeeSummary } from "@/types";
import type { JiraProject } from "@/app/reports/api/jira/projects/route";
import {
  RefreshCw, TrendingUp, AlertTriangle,
  CheckCircle, FileDown, Info, Briefcase, ChevronDown, ChevronLeft, ChevronRight, Loader2, Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProcessDialog } from "@/components/jira/dashboard/ProcessDialog";

// ─── KPI column definitions ───────────────────────────────────────────────────

const METRICS: {
  key: keyof EmployeeSummary;
  label: string;
  unit: string;
  description: string;
  thresholds: [number, number];
  lowerIsBetter?: boolean;
}[] = [
    {
      key: "issues_closed",
      label: "Issues Closed",
      unit: "",
      description: "Issues moved to Done within selected month",
      thresholds: [5, 2],
    },
    {
      key: "avg_resolution_days",
      label: "Avg Resolution",
      unit: "d",
      description: "Average days from created to resolved — lower is better",
      thresholds: [3, 7],
      lowerIsBetter: true,
    },
    {
      key: "output_velocity",
      label: "Velocity",
      unit: "iss/d",
      description: "Issues closed per working day",
      thresholds: [0.5, 0.2],
    },
    {
      key: "efficiency_index",
      label: "Efficiency",
      unit: "",
      description: "Issues closed ÷ avg resolution days",
      thresholds: [1, 0.3],
    },
    {
      key: "focus_ratio",
      label: "Focus Ratio",
      unit: "%",
      description: "(Issues closed / issues assigned) × 100",
      thresholds: [80, 50],
    },
    {
      key: "stability_score",
      label: "Stability",
      unit: "%",
      description: "(1 − reopened / closed) × 100",
      thresholds: [90, 70],
    },
    {
      key: "throughput_consistency",
      label: "Throughput",
      unit: "%",
      description: "Active working days / total working days × 100",
      thresholds: [80, 50],
    },
    {
      key: "low_activity_days",
      label: "Low Activity",
      unit: "d",
      description: "Working days with zero Jira activity — lower is better",
      thresholds: [1, 3],
      lowerIsBetter: true,
    },
    {
      key: "backlog_health",
      label: "Backlog Age",
      unit: "%",
      description: "Open issues older than 14 days / total open — lower is better",
      thresholds: [20, 50],
      lowerIsBetter: true,
    },
    {
      key: "reopened_issues",
      label: "Reopened",
      unit: "",
      description: "Issues reopened after closure — lower is better",
      thresholds: [1, 3],
      lowerIsBetter: true,
    },
  ];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function colorForMetric(
  value: number,
  thresholds: [number, number],
  lowerIsBetter?: boolean
): "green" | "amber" | "red" {
  if (lowerIsBetter) {
    if (value <= thresholds[0]) return "green";
    if (value <= thresholds[1]) return "amber";
    return "red";
  }
  if (value >= thresholds[0]) return "green";
  if (value >= thresholds[1]) return "amber";
  return "red";
}

const COLOR_MAP = {
  green: { text: "text-green-700", bg: "bg-green-50 border-green-200", bar: "bg-green-500" },
  amber: { text: "text-amber-600", bg: "bg-amber-50 border-amber-200", bar: "bg-amber-400" },
  red: { text: "text-red-600", bg: "bg-red-50 border-red-200", bar: "bg-red-500" },
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

// ─── Status Categorization ────────────────────────────────────────────────────

export type RiskLevel = "Exceptional" | "Steady Status" | "Stable" | "Moderate Risk" | "High Risk" | "Level 3 Risk";

interface StatusInfo {
  label: RiskLevel;
  color: string;
  dot: string;
}

function getEmployeeStatus(emp: EmployeeSummary): StatusInfo {
  const score = emp.score;
  const markers = [
    emp.stability_score < 75,
    emp.low_activity_days >= 6,
    emp.throughput_consistency < 40
  ].filter(Boolean).length;

  if (score < 40 || markers >= 3 || emp.stability_score < 50) {
    return { label: "Level 3 Risk", color: "text-red-500", dot: "bg-red-500" };
  }
  if (score < 55 || markers >= 2) {
    return { label: "High Risk", color: "text-orange-500", dot: "bg-orange-500" };
  }
  if (score < 75 || markers >= 1) {
    return { label: "Moderate Risk", color: "text-amber-500", dot: "bg-amber-500" };
  }
  if (score >= 93 && markers === 0) {
    return { label: "Exceptional", color: "text-emerald-500", dot: "bg-emerald-500" };
  }
  if (score >= 82 && markers === 0) {
    return { label: "Steady Status", color: "text-emerald-400", dot: "bg-emerald-400" };
  }
  return { label: "Stable", color: "text-blue-400", dot: "bg-blue-400" };
}

// ─── Metric Header with tooltip ───────────────────────────────────────────────

function MetricHeader({ label, description }: { label: string; description: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center justify-center gap-1.5 relative group">
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap group-hover:text-gray-600 transition-colors">
        {label}
      </span>
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-gray-300 hover:text-blue-500 transition-colors"
      >
        <Info size={12} />
      </button>
      {show && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50 bg-gray-900 border border-gray-800 text-white text-[11px] font-medium rounded-xl px-4 py-3 w-60 shadow-2xl leading-relaxed pointer-events-none animate-in fade-in slide-in-from-top-2">
          <div className="font-bold text-blue-400 mb-1 uppercase tracking-tight">{label}</div>
          {description}
        </div>
      )}
    </div>
  );
}

// ─── Comparison Table ─────────────────────────────────────────────────────────

function ComparisonTable({
  employees,
  sortKey,
  onSort,
}: {
  employees: EmployeeSummary[];
  sortKey: keyof EmployeeSummary;
  onSort: (k: keyof EmployeeSummary) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-[24px] border border-gray-100 bg-white shadow-xl shadow-gray-200/50 max-w-full">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100">
            <th rowSpan={2} className="sticky left-0 bg-gray-50/80 backdrop-blur-md text-left px-4 py-4 min-w-[170px] z-20">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Team Contributor</span>
            </th>
            <th rowSpan={2} className="px-3 py-4 text-center border-l border-gray-100 bg-blue-50/30">
              <span className="text-[9px] font-black text-blue-800 uppercase tracking-widest">Aggregate Score</span>
            </th>
            <th colSpan={3} className="px-2 py-1.5 text-center text-[8.5px] font-black text-gray-400 uppercase tracking-widest border-l border-gray-100 bg-gray-50/30">
              Output & Velocity
            </th>
            <th colSpan={3} className="px-2 py-1.5 text-center text-[8.5px] font-black text-gray-400 uppercase tracking-widest border-l border-gray-100 bg-gray-50/30">
              Efficiency & Focus
            </th>
            <th colSpan={4} className="px-2 py-1.5 text-center text-[8.5px] font-black text-gray-400 uppercase tracking-widest border-l border-gray-100 bg-gray-50/30">
              Stability & Health
            </th>
          </tr>
          <tr className="bg-gray-50/30 border-b border-gray-100">
            {/* Output */}
            <th className="px-2 py-2 text-center border-l border-gray-50 min-w-[70px]" onClick={() => onSort("issues_closed")}>
              <MetricHeader label="Issues" description="Total issues completed" />
            </th>
            <th className="px-2 py-2 text-center border-l border-gray-50 min-w-[70px]" onClick={() => onSort("avg_resolution_days")}>
              <MetricHeader label="Res. Time" description="Avg days to resolve" />
            </th>
            <th className="px-2 py-2 text-center border-l border-gray-50 min-w-[70px]" onClick={() => onSort("output_velocity")}>
              <MetricHeader label="Velocity" description="Issues per day" />
            </th>
            {/* Efficiency */}
            <th className="px-2 py-2 text-center border-l border-gray-100 min-w-[70px]" onClick={() => onSort("efficiency_index")}>
              <MetricHeader label="Efficiency" description="Velocity/Resolution" />
            </th>
            <th className="px-2 py-2 text-center border-l border-gray-50 min-w-[70px]" onClick={() => onSort("focus_ratio")}>
              <MetricHeader label="Focus" description="Assigned vs Closed" />
            </th>
            <th className="px-2 py-2 text-center border-l border-gray-50 min-w-[70px]" onClick={() => onSort("throughput_consistency")}>
              <MetricHeader label="Throughput" description="Consensus on output" />
            </th>
            {/* Stability */}
            <th className="px-2 py-2 text-center border-l border-gray-100 min-w-[70px]" onClick={() => onSort("stability_score")}>
              <MetricHeader label="Stability" description="Success vs Reopen" />
            </th>
            <th className="px-2 py-2 text-center border-l border-gray-50 min-w-[70px]" onClick={() => onSort("low_activity_days")}>
              <MetricHeader label="Low Act." description="Zero activity days" />
            </th>
            <th className="px-2 py-2 text-center border-l border-gray-50 min-w-[70px]" onClick={() => onSort("backlog_health")}>
              <MetricHeader label="Backlog" description="Age of open issues" />
            </th>
            <th className="px-2 py-2 text-center border-l border-gray-50 min-w-[70px]" onClick={() => onSort("reopened_issues")}>
              <MetricHeader label="Reopened" description="Total reopens" />
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp, i) => {
            const score = emp.score;
            const status = getEmployeeStatus(emp);
            return (
              <tr
                key={emp.employee_id}
                className={cn(
                  "border-b border-gray-50 transition-all group hover:bg-blue-50/20",
                  i % 2 === 0 ? "bg-white" : "bg-gray-50/20"
                )}
              >
                <td className="sticky left-0 bg-inherit px-4 py-4 z-10 border-r border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center text-[11px] font-black shrink-0 shadow-lg shadow-gray-200">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-gray-900 text-[13px] tracking-tight truncate max-w-[120px]">
                        {emp.display_name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", status.dot)} />
                        <p className={cn("text-[10px] font-bold tracking-wider uppercase", status.color)}>
                          {status.label}
                        </p>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Composite score */}
                <td className="px-3 py-4 text-center bg-blue-50/10">
                  <span className={cn(
                    "text-lg font-black tabular-nums tracking-tighter",
                    score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600"
                  )}>
                    {score}
                  </span>
                </td>

                {/* Metrics */}
                {[
                  "issues_closed", "avg_resolution_days", "output_velocity",
                  "efficiency_index", "focus_ratio", "throughput_consistency",
                  "stability_score", "low_activity_days", "backlog_health", "reopened_issues"
                ].map((key) => {
                  const m = METRICS.find(m => m.key === key)!;
                  const val = emp[key as keyof EmployeeSummary] as number;
                  const c = colorForMetric(val, m.thresholds, m.lowerIsBetter);
                  const colors = COLOR_MAP[c];
                  const display = Number.isInteger(val) ? val : val.toFixed(m.unit === "iss/d" || m.unit === "" ? 2 : 1);
                  return (
                    <td key={key} className="px-2 py-4 text-center border-l border-gray-50/50">
                      <div className="flex flex-col items-center">
                        <span className={cn("text-[14px] font-black tabular-nums", colors.text)}>
                          {display}
                        </span>
                        {m.unit && <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter">{m.unit}</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Metric Bar Chart ─────────────────────────────────────────────────────────

function MetricBars({
  employees, metricKey, label, unit, thresholds, lowerIsBetter,
}: {
  employees: EmployeeSummary[];
  metricKey: keyof EmployeeSummary;
  label: string;
  unit: string;
  thresholds: [number, number];
  lowerIsBetter?: boolean;
}) {
  const values = employees.map((e) => (e[metricKey] as number) || 0);
  const max = unit === "%" ? 100 : Math.max(...values, lowerIsBetter ? thresholds[1] * 1.5 : thresholds[0] * 1.5, 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">{label}</h3>
      <div className="space-y-2.5">
        {[...employees]
          .sort((a, b) => {
            const va = (a[metricKey] as number) || 0;
            const vb = (b[metricKey] as number) || 0;
            return lowerIsBetter ? va - vb : vb - va;
          })
          .map((emp) => {
            const val = (emp[metricKey] as number) || 0;
            const c = colorForMetric(val, thresholds, lowerIsBetter);
            const colors = COLOR_MAP[c];
            const pct = Math.min((val / max) * 100, 100);
            return (
              <div key={emp.employee_id} className="flex items-center gap-3">
                <span className="w-32 text-xs font-semibold text-gray-700 truncate shrink-0">
                  {emp.display_name}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${colors.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`w-16 text-right text-xs font-bold shrink-0 ${colors.text}`}>
                  {Number.isInteger(val) ? val : val.toFixed(1)}{unit}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportCSV(data: AdminDashboardData) {
  const headers = [
    "User", "Composite Score",
    "Issues Closed", "Avg Resolution (d)", "Output Velocity (iss/d)",
    "Efficiency Index", "Focus Ratio (%)", "Stability Score (%)",
    "Throughput (%)", "Low Activity Days", "Backlog Age (%)", "Reopened Issues",
  ];
  const rows = data.employees.map((e: EmployeeSummary) => [
    e.display_name, e.score,
    e.issues_closed, e.avg_resolution_days, e.output_velocity,
    e.efficiency_index, e.focus_ratio, e.stability_score,
    e.throughput_consistency, e.low_activity_days, e.backlog_health, e.reopened_issues,
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v: string | number) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `team-performance-${data.month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Month Picker ─────────────────────────────────────────────────────────────

function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [year, mon] = value.split("-").map(Number);
  const label = format(new Date(year, mon - 1, 1), "MMMM yyyy");
  function shift(delta: number) {
    const d = new Date(year, mon - 1 + delta, 1);
    onChange(format(d, "yyyy-MM"));
  }
  const isCurrentMonth = value === format(new Date(), "yyyy-MM");
  return (
    <div className="flex items-center gap-1 h-9">
      <button onClick={() => shift(-1)} className="w-7 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-500">
        <ChevronLeft size={13} />
      </button>
      <span className="px-3 h-9 flex items-center text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg min-w-[140px] justify-center">
        {label}
      </span>
      <button onClick={() => shift(1)} disabled={isCurrentMonth} className="w-7 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

// ─── Project Selector ─────────────────────────────────────────────────────────

function ProjectSelector({
  value, options, onChange, loading,
}: {
  value: JiraProject | null;
  options: JiraProject[];
  onChange: (v: JiraProject | null) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 min-w-[160px]"
      >
        {loading ? <Loader2 size={12} className="animate-spin text-gray-400 shrink-0" /> : <Briefcase size={12} className="text-gray-400 shrink-0" />}
        <span className="flex-1 text-left truncate">
          {value ? `${value.key} – ${value.name}` : loading ? "Loading…" : "All projects"}
        </span>
        <ChevronDown size={12} className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[180px]">
          <button className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50" onClick={() => { onChange(null); setOpen(false); }}>All projects</button>
          {options.map((p) => (
            <button key={p.key} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${value?.key === p.key ? "font-semibold text-gray-900 bg-gray-50" : "text-gray-700"}`}
              onClick={() => { onChange(p); setOpen(false); }}>
              {p.key} – {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof EmployeeSummary>("issues_closed");

  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<JiraProject | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [syncStatus, setSyncStatus] = useState<"processing" | "success" | "error">("processing");
  const [syncMessage, setSyncMessage] = useState<string | undefined>();
  const [isInitialSync, setIsInitialSync] = useState(true);
  const [etlRunning, setEtlRunning] = useState(false);



  useEffect(() => {
    fetch("/reports/api/jira/projects")
      .then((r) => r.json())
      .then((json) => setProjects(json.projects ?? []))
      .catch(() => { })
      .finally(() => setProjectsLoading(false));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedProject) params.set("project_key", selectedProject.key);
      params.set("month", selectedMonth);
      const res = await fetch(`/reports/api/admin/metrics?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [selectedProject, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Auto Sync Trigger ───────────────────────────────────────────────────────
  const runETL = useCallback(async (isInitial = false) => {
    setIsInitialSync(isInitial);
    setSyncStatus("processing");
    setSyncMessage(undefined);
    setEtlRunning(true);
    try {
      const url = isInitial ? "/reports/api/etl?mode=auto" : "/reports/api/etl";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();

      if (json.status === "already_synced") {
        setIsInitialSync(false);
        setEtlRunning(false);
        await fetchData();
        return;
      }

      if (json.status === "success") {
        setSyncStatus("success");
        setSyncMessage(`Synced ${json.issues_fetched} issues successfully.`);
        await fetchData();
        if (isInitial) {
          setTimeout(() => setIsInitialSync(false), 1500);
        }
      } else {
        setSyncStatus("error");
        setSyncMessage(json.error_message || "Sync failed");
      }
    } catch {
      setSyncStatus("error");
      setSyncMessage("Network error during sync.");
    } finally {
      setEtlRunning(false);
      if (!isInitial) {
        setTimeout(() => setSyncMessage(undefined), 8000);
      }
    }
  }, [fetchData]);

  useEffect(() => {
    runETL(true);
  }, []);

  const currentMonth = format(new Date(`${selectedMonth}-01T00:00:00`), "MMMM yyyy");

  const sorted = data
    ? [...data.employees].sort((a, b) => {
      const va = (a[sortKey] as number) || 0;
      const vb = (b[sortKey] as number) || 0;
      const m = METRICS.find((m) => m.key === sortKey);
      return m?.lowerIsBetter ? va - vb : vb - va;
    })
    : [];

  const teamAvg = (key: keyof EmployeeSummary) =>
    sorted.length
      ? round1(sorted.reduce((s, e) => s + ((e[key] as number) || 0), 0) / sorted.length)
      : 0;

  const topPerformer = sorted.length
    ? [...sorted].sort((a, b) => b.score - a.score)[0]
    : null;
  const atRisk = sorted.filter(
    (e) => e.stability_score < 70 || e.low_activity_days >= 5 || e.throughput_consistency < 40
  );


  return (
    <div className="min-h-screen bg-[#f8f9fb] overflow-x-hidden w-full relative">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-10 py-5 flex items-center gap-10 flex-wrap">
          <div className="flex items-center gap-6">
            <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
            <ProjectSelector
              value={selectedProject}
              options={projects}
              onChange={setSelectedProject}
              loading={projectsLoading}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Active Window</span>
            <span className="text-[13px] font-extrabold text-gray-900">{currentMonth}</span>
          </div>
          {data?.last_etl_run && (
            <span className="text-[10px] text-gray-400">
              · Last sync:{" "}
              <span className="font-medium text-gray-600">
                {format(new Date(data.last_etl_run), "d MMM, HH:mm")} IST
              </span>
            </span>
          )}
          {data && (
            <span className="text-[10px] text-gray-400">
              · {sorted.length} contributor{sorted.length !== 1 ? "s" : ""}
            </span>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {data?.last_etl_run && (
              <div className="flex flex-col items-end mr-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Last Pipeline Sync</span>
                <span className="text-[11px] font-bold text-gray-600">
                  {format(new Date(data.last_etl_run), "d MMM, HH:mm")}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              {data && sorted.length > 0 && (
                <button
                  onClick={() => exportCSV(data)}
                  className="h-10 flex items-center gap-2 px-5 rounded-xl border border-gray-200 bg-white text-[13px] font-black text-gray-700 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                >
                  <FileDown size={16} />
                  Export CSV
                </button>
              )}
              <button
                onClick={() => runETL()}
                disabled={etlRunning || loading}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-all shadow-md active:scale-90 disabled:opacity-40"
              >
                <Database size={18} className={etlRunning ? "animate-pulse" : ""} />
              </button>
              <button
                onClick={fetchData}
                disabled={loading || etlRunning}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md active:scale-90 disabled:opacity-40"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className={cn("max-w-[1600px] mx-auto px-4 py-12 space-y-16 w-full transition-all duration-700", isInitialSync ? "opacity-0 translate-y-4 pointer-events-none" : "opacity-100 translate-y-0")}>
        <div className="flex items-end justify-between border-b border-gray-100 pb-8">
          <div>
            <div className="px-3 py-1 inline-block bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-md border border-blue-100 mb-3">
              Admin Control Center
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Team Performance Index</h1>
            <p className="text-sm text-gray-500 font-medium mt-2">Analytical breakdown of contributor velocity, efficiency, and stability across active projects.</p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ">Dataset Scale</span>
            <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl">
              <span className="text-sm font-black text-gray-900">{sorted.length} Contributors</span>
            </div>
          </div>
        </div>


        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-36 animate-pulse" />
            ))}
          </div>
        )}

        {data && !loading && (
          <>
            {sorted.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 px-6 py-16 text-center">
                <TrendingUp size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-semibold text-gray-500">No contributors found yet.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Run a Jira sync from the main dashboard to populate data.
                </p>
                <button
                  onClick={() => window.location.href = '/reports'}
                  className="inline-flex items-center gap-2 mt-4 text-xs font-bold px-4 py-2 rounded-lg bg-gradient-to-r from-[#0a2e3d] to-[#0d3a4a] text-white hover:from-[#0d3a4a] hover:to-[#0f4555] transition-all shadow-sm"
                >
                  <ChevronLeft size={12} />
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <>
                {/* Team summary strip */}
                <section>
                  <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">
                    Team Overview
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      {
                        label: "Contributors",
                        value: sorted.length,
                        unit: "",
                        color: "text-gray-900",
                      },
                      {
                        label: "Total Issues",
                        value: sorted.reduce((s, e) => s + e.issues_closed, 0),
                        unit: "",
                        color: "text-gray-900",
                      },
                      {
                        label: "Avg Velocity",
                        value: teamAvg("output_velocity"),
                        unit: " iss/d",
                        color:
                          teamAvg("output_velocity") >= 0.5
                            ? "text-green-700"
                            : teamAvg("output_velocity") >= 0.2
                              ? "text-amber-600"
                              : "text-red-600",
                      },
                      {
                        label: "Avg Stability",
                        value: teamAvg("stability_score"),
                        unit: "%",
                        color:
                          teamAvg("stability_score") >= 90
                            ? "text-green-700"
                            : teamAvg("stability_score") >= 70
                              ? "text-amber-600"
                              : "text-red-600",
                      },
                      {
                        label: "Top Performer",
                        value: topPerformer?.display_name ?? "—",
                        unit: "",
                        color: "text-green-700",
                      },
                      {
                        label: "At Risk",
                        value: atRisk.length,
                        unit: "",
                        color: atRisk.length === 0 ? "text-green-700" : "text-red-600",
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center"
                      >
                        <div className={`text-xl font-black tabular-nums truncate ${s.color}`}>
                          {typeof s.value === "number" && !Number.isInteger(s.value)
                            ? s.value.toFixed(2)
                            : s.value}
                          {s.unit && (
                            <span className="text-xs font-medium text-gray-400 ml-0.5">
                              {s.unit}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1">
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Full comparison table */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                      Full Comparison
                    </h2>
                    <p className="text-xs text-gray-400">Click column headers to sort</p>
                  </div>
                  <ComparisonTable
                    employees={sorted}
                    sortKey={sortKey}
                    onSort={setSortKey}
                  />
                </section>

                {/* Visual bar charts */}
                <section>
                  <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">
                    Visual Breakdown
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    <MetricBars employees={sorted} metricKey="issues_closed" label="Issues Closed" unit="" thresholds={[5, 2]} />
                    <MetricBars employees={sorted} metricKey="output_velocity" label="Output Velocity (iss/d)" unit="" thresholds={[0.5, 0.2]} />
                    <MetricBars employees={sorted} metricKey="stability_score" label="Stability Score" unit="%" thresholds={[90, 70]} />
                    <MetricBars employees={sorted} metricKey="focus_ratio" label="Focus Ratio" unit="%" thresholds={[80, 50]} />
                    <MetricBars employees={sorted} metricKey="throughput_consistency" label="Throughput" unit="%" thresholds={[80, 50]} />
                    <MetricBars employees={sorted} metricKey="avg_resolution_days" label="Avg Resolution (days)" unit="d" thresholds={[3, 7]} lowerIsBetter />
                  </div>
                </section>

                {/* At-risk callout */}
                {atRisk.length > 0 && (
                  <section className="bg-red-50 border border-red-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={15} className="text-red-600" />
                      <h2 className="text-xs font-bold text-red-700 uppercase tracking-widest">
                        At-Risk Contributors ({atRisk.length})
                      </h2>
                    </div>
                    <div className="space-y-2">
                      {atRisk.map((emp) => {
                        const reasons: string[] = [];
                        if (emp.stability_score < 70) reasons.push(`${emp.stability_score}% stability`);
                        if (emp.low_activity_days >= 5) reasons.push(`${emp.low_activity_days} low-activity days`);
                        if (emp.throughput_consistency < 40) reasons.push(`${emp.throughput_consistency}% throughput`);
                        return (
                          <div key={emp.employee_id} className="flex items-start gap-2 text-sm">
                            <span className="font-semibold text-red-800 min-w-[140px]">
                              {emp.display_name}
                            </span>
                            <span className="text-red-600 text-xs">{reasons.join(" · ")}</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>

      <ProcessDialog
        isOpen={isInitialSync || etlRunning}
        type="sync"
        status={syncStatus}
        message={syncMessage}
        onClose={syncStatus !== "processing" ? () => {
          setIsInitialSync(false);
          setEtlRunning(false);
          setSyncMessage(undefined);
        } : undefined}
      />
    </div>
  );
}

