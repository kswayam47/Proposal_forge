"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  X, ChevronLeft, ChevronDown, ChevronUp,
  Download, Loader2, ArrowUpDown, Sun, Search
} from "lucide-react";
import type { DrillResponse, DrillIssueRow } from "@/app/reports/api/drill/[kpi]/route";
import { OrgCalendar } from "@/components/jira/dashboard/OrgCalendar";
import type { ActivityDay } from "@/components/jira/dashboard/OrgCalendar";
import { cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

const DATE_PALETTE = [
  { bar: "bg-emerald-500", row: "bg-emerald-50 hover:bg-emerald-100" },   // 01
  { bar: "bg-blue-500", row: "bg-blue-50 hover:bg-blue-100" },       // 02
  { bar: "bg-indigo-500", row: "bg-indigo-50 hover:bg-indigo-100" },    // 03
  { bar: "bg-violet-500", row: "bg-violet-50 hover:bg-violet-100" },    // 04
  { bar: "bg-amber-500", row: "bg-amber-50 hover:bg-amber-100" },      // 05
  { bar: "bg-rose-500", row: "bg-rose-50 hover:bg-rose-100" },        // 06
  { bar: "bg-cyan-500", row: "bg-cyan-50 hover:bg-cyan-100" },        // 07
  { bar: "bg-fuchsia-500", row: "bg-fuchsia-50 hover:bg-fuchsia-100" },  // 08
  { bar: "bg-orange-500", row: "bg-orange-50 hover:bg-orange-100" },    // 09
  { bar: "bg-lime-500", row: "bg-lime-50 hover:bg-lime-100" },        // 10
  { bar: "bg-sky-500", row: "bg-sky-50 hover:bg-sky-100" },          // 11
  { bar: "bg-teal-500", row: "bg-teal-50 hover:bg-teal-100" },        // 12
  { bar: "bg-pink-500", row: "bg-pink-50 hover:bg-pink-100" },        // 13
  { bar: "bg-purple-500", row: "bg-purple-50 hover:bg-purple-100" },    // 14
  { bar: "bg-red-500", row: "bg-red-50 hover:bg-red-100" },          // 15
  { bar: "bg-yellow-500", row: "bg-yellow-50 hover:bg-yellow-100" },    // 16
  { bar: "bg-emerald-600", row: "bg-emerald-100 hover:bg-emerald-200" }, // 17
  { bar: "bg-blue-600", row: "bg-blue-100 hover:bg-blue-200" },       // 18
  { bar: "bg-indigo-600", row: "bg-indigo-100 hover:bg-indigo-200" },    // 19
  { bar: "bg-violet-600", row: "bg-violet-100 hover:bg-violet-200" },    // 20
  { bar: "bg-rose-600", row: "bg-rose-100 hover:bg-rose-200" },        // 21
  { bar: "bg-cyan-600", row: "bg-cyan-100 hover:bg-cyan-200" },        // 22
  { bar: "bg-fuchsia-600", row: "bg-fuchsia-100 hover:bg-fuchsia-200" },  // 23
  { bar: "bg-orange-600", row: "bg-orange-100 hover:bg-orange-200" },    // 24
  { bar: "bg-lime-600", row: "bg-lime-100 hover:bg-lime-200" },        // 25
  { bar: "bg-sky-600", row: "bg-sky-100 hover:bg-sky-200" },          // 26
  { bar: "bg-teal-600", row: "bg-teal-100 hover:bg-teal-200" },        // 27
  { bar: "bg-pink-600", row: "bg-pink-100 hover:bg-pink-200" },        // 28
  { bar: "bg-purple-600", row: "bg-purple-100 hover:bg-purple-200" },    // 29
  { bar: "bg-red-600", row: "bg-red-100 hover:bg-red-200" },          // 30
  { bar: "bg-amber-600", row: "bg-amber-100 hover:bg-amber-200" },     // 31
];

function getDateColor(dateStr: string | null | undefined) {
  if (!dateStr) return { bar: "bg-slate-200", row: "hover:bg-gray-50" };
  // stable picking by day of month
  const dayMatch = dateStr.match(/(\d{2})$/);
  const day = dayMatch ? parseInt(dayMatch[1], 10) : 1;
  const index = (day - 1) % DATE_PALETTE.length;
  return DATE_PALETTE[index];
}

export interface DrillTarget {
  kpi: "issues_closed" | "resolution_time" | "output_velocity" | "stability" | "throughput" | "backlog" | "worked_on_holidays";
  label: string;
  month: string;
  assigneeId?: string | null;
  projectKey?: string | null;
}

interface Props {
  target: DrillTarget | null;
  onClose: () => void;
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function fetchDrill(
  kpi: string,
  level: number,
  month: string,
  assigneeId: string | null | undefined,
  projectKey: string | null | undefined,
  extra?: Record<string, string>
): Promise<DrillResponse> {
  const p = new URLSearchParams({ level: String(level), month });
  if (assigneeId) p.set("assignee_id", assigneeId);
  if (projectKey) p.set("project_key", projectKey);
  if (extra) Object.entries(extra).forEach(([k, v]) => p.set(k, v));
  const res = await fetch(`/reports/api/drill/${kpi}?${p.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(rows: DrillIssueRow[], filename: string) {
  const headers = ["Issue Key", "Summary", "Assignee", "Type", "Priority", "Project",
    "Created", "Completed", "Updated", "Resolution Days", "Status", "Reopened"];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.issue_key,
        `"${(r.summary ?? "").replace(/"/g, '""')}"`,
        r.assignee_name,
        r.issue_type ?? "",
        r.priority ?? "",
        r.project_key ?? "",
        r.created_date,
        r.completed_date ?? "",
        r.updated_date ?? "",
        r.resolution_time_days ?? "",
        r.status,
        r.reopened_flag ? "Yes" : "No",
      ].join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ─── Sortable Issue Table ─────────────────────────────────────────────────────

type SortKey = keyof DrillIssueRow;

export function IssueTable({
  rows,
  onRowClick,
  csvFilename,
  isReport = false,
  kpiId,
}: {
  rows: DrillIssueRow[];
  onRowClick?: (r: DrillIssueRow) => void;
  csvFilename?: string;
  isReport?: boolean;
  kpiId?: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("resolution_time_days");
  const [sortAsc, setSortAsc] = useState(false);
  const [filter, setFilter] = useState("");

  const toggle = (k: SortKey) => {
    if (isReport) return;
    if (sortKey === k) setSortAsc((a) => !a);
    else { setSortKey(k); setSortAsc(false); }
  };

  const filtered = rows.filter((r) => {
    const q = filter.toLowerCase();
    return !q || r.issue_key.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q) || (r.assignee_name ?? "").toLowerCase().includes(q);
  });

  const sorted = isReport ? rows.slice(0, 50) : [...filtered].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (av === null || av === undefined) return 1;
    if (bv === null || bv === undefined) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortAsc ? cmp : -cmp;
  });

  const dailyCounts = useMemo(() => {
    if (kpiId !== "output_velocity" && kpiId !== "issues_closed") return undefined;
    const counts: Record<string, number> = {};
    for (const r of rows) {
      if (r.completed_date) {
        counts[r.completed_date] = (counts[r.completed_date] || 0) + 1;
      }
    }
    return counts;
  }, [rows, kpiId]);

  const getRowColor = (row: DrillIssueRow) => {
    if (!kpiId) return "hover:bg-gray-50";

    if (kpiId === "backlog") {
      const created = new Date(row.created_date).getTime();
      const now = new Date().getTime();
      const age = Math.floor((now - created) / (1000 * 3600 * 24));
      if (age <= 7) return "bg-green-50 hover:bg-green-100";
      if (age <= 14) return "bg-yellow-50 hover:bg-yellow-100";
      if (age <= 30) return "bg-orange-50 hover:bg-orange-100";
      return "bg-red-50 hover:bg-red-100";
    }

    if (kpiId === "output_velocity" && row.completed_date) {
      return getDateColor(row.completed_date).row;
    }

    if (["resolution_time", "efficiency_index", "focus_ratio"].includes(kpiId)) {
      const res = row.resolution_time_days ?? 0;
      if (res <= 1) return "bg-green-50 hover:bg-green-100";
      if (res <= 3) return "bg-yellow-50 hover:bg-yellow-100";
      if (res <= 7) return "bg-orange-50 hover:bg-orange-100";
      return "bg-red-50 hover:bg-red-100";
    }

    if (kpiId === "stability") {
      if (row.reopened_flag) return "bg-amber-50 hover:bg-amber-100";
    }

    return "hover:bg-gray-50";
  };

  function Th({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <th
        className={`${isReport ? "px-2" : "px-4"} py-3 text-left text-[11px] font-black text-gray-600 uppercase tracking-wider select-none whitespace-nowrap ${isReport ? "" : "cursor-pointer hover:text-gray-700 transition-colors"}`}
        onClick={() => toggle(k)}
      >
        <div className="flex items-center gap-1">
          {label}
          {!isReport && (active ? (sortAsc ? <ChevronUp size={12} className="text-blue-500" /> : <ChevronDown size={12} className="text-blue-500" />) : <ArrowUpDown size={11} className="opacity-20" />)}
        </div>
      </th>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {!isReport && (
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by key, summary, assignee..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all"
            />
          </div>
          {csvFilename && (
            <button
              onClick={() => exportCSV(sorted, csvFilename!)}
              className="flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Download size={14} /> Export CSV
            </button>
          )}
          <span className="text-[13px] font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">{sorted.length} results</span>
        </div>
      )}

      <div className={`overflow-x-auto rounded-2xl border border-gray-200/60 shadow-sm ${isReport ? "max-h-none overflow-y-visible" : ""}`}>
        <table className="w-full border-collapse" style={{ fontSize: isReport ? "10px" : "13px", minWidth: isReport ? "100%" : "900px" }}>
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <Th label="Key" k="issue_key" />
              <Th label="Summary" k="summary" />
              {!isReport && <Th label="Assignee" k="assignee_name" />}
              <Th label="Type" k="issue_type" />
              {!isReport && <Th label="Priority" k="priority" />}
              <Th label="Created" k="created_date" />
              <Th label="Resolved" k="completed_date" />
              <Th label="Res. Days" k="resolution_time_days" />
              {(!isReport || kpiId === "stability") && <Th label="Reopened" k="reopened_flag" />}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.issue_key}
                onClick={() => onRowClick?.(r)}
                className={`transition-all duration-200 border-b border-gray-50 last:border-0 ${getRowColor(r)} ${onRowClick ? "cursor-pointer active:bg-blue-50/50" : ""}`}
              >
                <td className={`${isReport ? "px-2 py-1.5" : "px-4 py-4"} font-bold text-blue-600 whitespace-nowrap`}>
                  <div className="flex items-center gap-1.5 hover:underline">
                    {r.issue_key}
                  </div>
                </td>
                <td className={`${isReport ? "px-2 py-1.5 max-w-[220px]" : "px-4 py-4 max-w-[300px]"} text-gray-900 truncate leading-normal`}>{r.summary}</td>
                {!isReport && <td className="px-4 py-4 text-gray-600 whitespace-nowrap">{r.assignee_name}</td>}
                <td className={`${isReport ? "px-2 py-1.5" : "px-4 py-4"}`}>
                  <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider">{r.issue_type ?? "—"}</span>
                </td>
                {!isReport && (
                  <td className="px-4 py-4">
                    <PriorityBadge priority={r.priority} />
                  </td>
                )}
                <td className={`${isReport ? "px-2 py-1.5" : "px-4 py-4"} text-gray-500 whitespace-nowrap tabular-nums`}>{r.created_date}</td>
                <td className={`${isReport ? "px-2 py-1.5" : "px-4 py-4"} text-gray-500 whitespace-nowrap tabular-nums`}>{r.completed_date || "—"}</td>
                <td className={`${isReport ? "px-2 py-1.5" : "px-4 py-4"}`}>
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg font-black tabular-nums border",
                    (r.resolution_time_days ?? 0) <= 3 ? "bg-green-50 text-green-700 border-green-100" :
                      (r.resolution_time_days ?? 0) <= 7 ? "bg-amber-50 text-amber-700 border-amber-100" :
                        "bg-red-50 text-red-700 border-red-100"
                  )}>
                    {r.resolution_time_days ?? 0}
                  </span>
                </td>
                {(!isReport || kpiId === "stability") && (
                  <td className={`${isReport ? "px-2 py-1.5" : "px-4 py-4"}`}>
                    {r.reopened_flag ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-800 text-[11px] font-black uppercase tracking-tight">Reopened</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-16 text-center text-gray-400 font-medium">No issues found matching your filter</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <span className="text-gray-300">—</span>;
  const colors: Record<string, string> = {
    Highest: "bg-red-100 text-red-700 border-red-200",
    High: "bg-orange-100 text-orange-700 border-orange-200",
    Medium: "bg-amber-100 text-amber-700 border-amber-200",
    Low: "bg-blue-100 text-blue-700 border-blue-200",
    Lowest: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-tight ${colors[priority] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
      {priority}
    </span>
  );
}

// ─── Bar chart (minimal, no lib) ──────────────────────────────────────────────

export function MiniBar({ label, value, max, color = "bg-blue-500" }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-8 text-right tabular-nums">{value}</span>
    </div>
  );
}

// ─── Activity Calendar (uses real OrgCalendar) ───────────────────────────────

export function ActivityCalendarWrapper({
  data,
  month,
  employeeId,
  onDayClick,
}: {
  data: NonNullable<DrillResponse["activity_calendar"]>;
  month: string;           // "yyyy-MM"
  employeeId?: string | null;
  onDayClick: (date: string) => void;
}) {
  const [year, monthNum] = month.split("-").map(Number);
  const activityData: ActivityDay[] = data.map((d) => ({
    date: d.date,
    active: d.active,
    closed: d.closed,
    updated: d.updated,
    created: d.created,
  }));

  return (
    <OrgCalendar
      initialYear={year}
      initialMonth={monthNum}
      activityData={activityData}
      employeeId={employeeId}
      onDayClick={onDayClick}
      allowMarking={false}
    />
  );
}

// ─── Daily bar chart (velocity) ───────────────────────────────────────────────

export function DailyChart({
  data,
  onDayClick,
}: {
  data: NonNullable<DrillResponse["daily_closures"]>;
  onDayClick: (date: string) => void;
}) {
  const max = Math.max(...data.map((d) => d.closed), 1);
  return (
    <div className="space-y-1.5">
      {data.map((d) => {
        const barColor = d.closed > 0 ? getDateColor(d.date).bar : "bg-slate-200";
        return (
          <div
            key={d.date}
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onDayClick(d.date)}
          >
            <span className="text-[10px] text-gray-500 w-20 shrink-0 group-hover:text-gray-800 transition-colors">{d.date.slice(5)}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor} transition-colors`}
                style={{ width: `${(d.closed / max) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-gray-700 w-6 text-right tabular-nums">{d.closed}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export function DrillDrawer({ target, onClose }: Props) {
  const [level2, setLevel2] = useState<DrillResponse | null>(null);
  const [level3, setLevel3] = useState<DrillResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Context for L3 drill
  const [l3Context, setL3Context] = useState<{ bucket?: string; date?: string } | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!target) return;
    setLoading(true);
    setError(null);
    setLevel2(null);
    setLevel3(null);
    setL3Context(null);
    try {
      const d = await fetchDrill(target.kpi, 2, target.month, target.assigneeId, target.projectKey);
      setLevel2(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [target]);

  useEffect(() => { load(); }, [load]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function drillToLevel3(extra: { bucket?: string; date?: string }) {
    if (!target) return;
    setLoading(true);
    setLevel3(null);
    try {
      const d = await fetchDrill(
        target.kpi, 3, target.month, target.assigneeId, target.projectKey,
        Object.fromEntries(Object.entries(extra).filter(([, v]) => v != null)) as Record<string, string>
      );
      setLevel3(d);
      setL3Context(extra);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  if (!target) return null;

  const title = level3
    ? `${target.label} › ${l3Context?.bucket ?? l3Context?.date ?? "Detail"}`
    : target.label;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          {level3 && (
            <button
              onClick={() => { setLevel3(null); setL3Context(null); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={16} className="text-gray-500" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-black text-gray-900 truncate">{title}</h2>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {target.month}
              {target.assigneeId && " · filtered by user"}
              {target.projectKey && " · " + target.projectKey}
              {!level3 && " · Click a row or bar to drill deeper"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} className="animate-spin text-gray-400" />
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* ── Level 3 ───────────────────────────────────────────── */}
          {!loading && level3 && <Level3View data={level3} context={l3Context} />}

          {/* ── Level 2 ───────────────────────────────────────────── */}
          {!loading && !level3 && level2 && (
            <Level2View
              data={level2}
              target={target}
              onDrillBucket={(b) => drillToLevel3({ bucket: b })}
              onDrillDate={(d) => drillToLevel3({ date: d })}
              onDrillIssues={() => drillToLevel3({})}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ─── Level 2 View ─────────────────────────────────────────────────────────────

export function Level2View({
  data,
  target,
  onDrillBucket,
  onDrillDate,
  onDrillIssues,
  isReport = false,
}: {
  data: DrillResponse;
  target: DrillTarget;
  onDrillBucket?: (bucket: string) => void;
  onDrillDate?: (date: string) => void;
  onDrillIssues?: () => void;
  isReport?: boolean;
}) {
  const maxT = Math.max(...(data.breakdown_by_type ?? []).map((r) => r.count), 1);
  const maxP = Math.max(...(data.breakdown_by_priority ?? []).map((r) => r.count), 1);

  const sharedDistributions = isReport ? null : (
    <div className="grid grid-cols-2 gap-8">
      {(data.breakdown_by_type?.length ?? 0) > 0 && (
        <Segment title="Distribution by Type">
          <div className="space-y-2">
            {data.breakdown_by_type!.map((r) => (
              <MiniBar key={r.name} label={r.name} value={r.count} max={maxT} color="bg-slate-400" />
            ))}
          </div>
        </Segment>
      )}
      {(data.breakdown_by_priority?.length ?? 0) > 0 && (
        <Segment title="Distribution by Priority">
          <div className="space-y-2">
            {data.breakdown_by_priority!.map((r) => {
              const priorityColors: Record<string, string> = {
                "Highest": "bg-red-500",
                "Critical": "bg-red-500",
                "High": "bg-orange-400",
                "Medium": "bg-yellow-400",
                "Low": "bg-green-400",
                "Lowest": "bg-green-400",
              };
              return (
                <MiniBar key={r.name} label={r.name} value={r.count} max={maxP} color={priorityColors[r.name] ?? "bg-slate-400"} />
              );
            })}
          </div>
        </Segment>
      )}
    </div>
  );

  // Issues Closed
  if (data.kpi === "issues_closed") {
    const maxA = Math.max(...(data.breakdown_by_assignee ?? []).map((r) => r.count), 1);
    const maxPr = Math.max(...(data.breakdown_by_project ?? []).map((r) => r.count), 1);
    const total = (data.breakdown_by_assignee ?? []).reduce((s, r) => s + r.count, 0);

    return (
      <div className="space-y-6">
        <SectionHead
          title={`${total} Issues Closed`}
          action={onDrillIssues ? <ActionBtn onClick={onDrillIssues} label="View all issues →" /> : undefined}
        />
        {(data.breakdown_by_assignee?.length ?? 0) > 0 && (
          <Segment title="By Assignee">
            <div className="space-y-2">
              {data.breakdown_by_assignee!.map((r) => (
                <MiniBar key={r.name} label={r.name} value={r.count} max={maxA} color="bg-slate-400" />
              ))}
            </div>
          </Segment>
        )}
        {(data.breakdown_by_project?.length ?? 0) > 1 && (
          <Segment title="By Project">
            <div className="space-y-2">
              {data.breakdown_by_project!.map((r) => (
                <MiniBar key={r.name} label={r.name} value={r.count} max={maxPr} color="bg-slate-400" />
              ))}
            </div>
          </Segment>
        )}
        {sharedDistributions}
      </div>
    );
  }

  // Resolution Time
  if (data.kpi === "resolution_time") {
    const maxB = Math.max(...(data.resolution_buckets ?? []).map((r) => r.count), 1);
    return (
      <div className="space-y-6">
        <SectionHead title="Resolution Time Distribution" action={onDrillIssues ? <ActionBtn onClick={onDrillIssues} label="View slowest 10 →" /> : undefined} />
        <Segment title="Aging Buckets">
          <div className="space-y-2">
            {data.resolution_buckets?.map((r) => {
              const bucketColors: Record<string, string> = {
                "0–1 day": "bg-green-400",
                "1–3 days": "bg-yellow-400",
                "3–7 days": "bg-orange-400",
                "7+ days": "bg-red-500",
              };
              return (
                <div key={r.bucket} className={onDrillBucket ? "cursor-pointer group" : ""} onClick={() => onDrillBucket?.(r.bucket)}>
                  <MiniBar label={r.bucket} value={r.count} max={maxB} color={bucketColors[r.bucket] ?? "bg-gray-400"} />
                </div>
              );
            })}
          </div>
        </Segment>
        {sharedDistributions}
      </div>
    );
  }

  // Output Velocity
  if (data.kpi === "output_velocity") {
    return (
      <div className="space-y-6">
        <SectionHead title="Daily Issue Closures" />
        <Segment title="Daily Breakdown">
          {(data.daily_closures?.length ?? 0) > 0 ? (
            <DailyChart data={data.daily_closures!} onDayClick={onDrillDate ?? (() => { })} />
          ) : (
            <p className="text-xs text-gray-400">No closures recorded this month.</p>
          )}
        </Segment>
        {sharedDistributions}
      </div>
    );
  }

  // Stability
  if (data.kpi === "stability") {
    const rows = data.reopened_issues ?? [];
    return (
      <div className="space-y-6">
        <SectionHead
          title={`${rows.length} Reopened Issue${rows.length !== 1 ? "s" : ""}`}
          action={rows.length > 0 ? <ActionBtn onClick={onDrillIssues ?? (() => { })} label="View reopen cycles →" /> : undefined}
        />
        {rows.length > 0 ? (
          <IssueTable
            rows={rows}
            csvFilename={`stability-reopened-${target.month}.csv`}
            isReport={isReport}
          />
        ) : (
          <EmptyState message="No issues were reopened this month." />
        )}
        {sharedDistributions}
      </div>
    );
  }

  // Throughput
  if (data.kpi === "throughput") {
    const cal = data.activity_calendar ?? [];
    const active = cal.filter((d) => d.active).length;
    const total = cal.filter((d) => {
      const dow = new Date(d.date + "T00:00:00").getDay();
      return dow !== 0 && dow !== 6;
    }).length;
    return (
      <div className="space-y-6">
        <SectionHead title={`Activity Calendar · ${active} / ${total} active`} />
        <Segment title="Activity Heatmap">
          <ActivityCalendarWrapper data={cal} month={target.month} employeeId={target.assigneeId} onDayClick={onDrillDate ?? (() => { })} />
        </Segment>
        {sharedDistributions}
      </div>
    );
  }

  // Backlog
  if (data.kpi === "backlog") {
    const buckets = data.backlog_buckets ?? [];
    const max = Math.max(...buckets.map((b) => b.count), 1);
    const colors = ["bg-green-400", "bg-yellow-400", "bg-orange-400", "bg-red-500"];
    return (
      <div className="space-y-6">
        <SectionHead title="Open Issues by Age" />
        <Segment title="Aging Buckets">
          <div className="space-y-2">
            {buckets.map((b, i) => (
              <div key={b.bucket} className="cursor-pointer" onClick={() => onDrillBucket?.(b.bucket)}>
                <MiniBar label={b.bucket} value={b.count} max={max} color={colors[i] ?? "bg-gray-400"} />
              </div>
            ))}
          </div>
        </Segment>
        {sharedDistributions}
      </div>
    );
  }

  // Worked on Holidays
  if (data.kpi === "worked_on_holidays") {
    const days = data.holiday_days ?? [];
    return (
      <div className="space-y-6">
        <SectionHead title={`Activity on ${days.length} holiday/leave day${days.length !== 1 ? "s" : ""}`} />
        <Segment title="Days Active">
          {days.length === 0 ? (
            <EmptyState message="No Jira activity recorded on holiday/leave days." />
          ) : (
            <div className="space-y-2">
              {days.map((d) => (
                <div
                  key={d.date}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onDrillDate?.(d.date)}
                >
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.day_type === "holiday" ? "bg-red-400" : "bg-amber-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-gray-800">{d.date}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-bold text-gray-700">{d.count} issues</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Segment>
        {sharedDistributions}
      </div>
    );
  }

  return null;
}

// ─── Level 3 View ─────────────────────────────────────────────────────────────

export function Level3View({
  data,
  context,
  isReport = false,
}: {
  data: DrillResponse;
  context: { bucket?: string; date?: string } | null;
  isReport?: boolean;
}) {
  // Issues Closed — full issue table
  if (data.kpi === "issues_closed" && data.issues) {
    return (
      <IssueTable
        rows={data.issues}
        csvFilename={`issues-closed-${data.kpi}.csv`}
        isReport={isReport}
        kpiId={data.kpi}
      />
    );
  }

  // Resolution Time — slowest issues
  if (data.kpi === "resolution_time" && data.slowest_issues) {
    const rows = data.slowest_issues.map(({ transitions: _t, ...r }) => r) as DrillIssueRow[];
    return (
      <div className="space-y-4">
        {!isReport && (
          <p className="text-xs text-gray-400">
            {context?.bucket ? `Issues in "${context.bucket}" range` : "Slowest 10 issues by resolution time"}
          </p>
        )}
        <IssueTable rows={rows} csvFilename={`slowest-issues.csv`} isReport={isReport} kpiId={data.kpi} />
      </div>
    );
  }

  // Velocity — day detail (interactive) OR all closed issues (report)
  if (data.kpi === "output_velocity") {
    if (data.day_detail) {
      const { date, closed, updated } = data.day_detail;
      return (
        <div className="space-y-5">
          <p className="text-xs font-semibold text-gray-700">{date}</p>
          {closed.length > 0 && (
            <Segment title={`Closed (${closed.length})`}>
              <IssueTable rows={closed} csvFilename={`closed-${date}.csv`} isReport={isReport} kpiId={data.kpi} />
            </Segment>
          )}
          {updated.length > 0 && (
            <Segment title={`Updated (${updated.length})`}>
              <IssueTable rows={updated} csvFilename={`updated-${date}.csv`} isReport={isReport} kpiId={data.kpi} />
            </Segment>
          )}
          {closed.length === 0 && updated.length === 0 && (
            <EmptyState message="No issue activity recorded on this day." />
          )}
        </div>
      );
    }
    if (data.issues) {
      return (
        <IssueTable
          rows={data.issues}
          csvFilename="output-velocity-issues.csv"
          isReport={isReport}
          kpiId={data.kpi}
        />
      );
    }
    return <EmptyState message="No issue data available." />;
  }

  // Stability — reopen cycles
  if (data.kpi === "stability" && data.reopen_cycles) {
    const rows = data.reopen_cycles.map(({ first_closed: _fc, reopen_date: _rd, cycles: _c, ...r }) => r) as DrillIssueRow[];
    return (
      <div className="space-y-4">
        <div className={`overflow-x-auto rounded-xl border border-gray-100 ${isReport ? "max-h-none" : ""}`}>
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Key</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Summary</th>
                {!isReport && <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">First Closed</th>}
                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Updated</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Res. Days</th>
              </tr>
            </thead>
            <tbody>
              {data.reopen_cycles.slice(0, isReport ? 20 : 100).map((r) => (
                <tr key={r.issue_key} className="border-t border-gray-50 bg-amber-50 hover:bg-amber-100">
                  <td className={`px-3 ${isReport ? "py-1" : "py-2"} font-mono font-semibold text-blue-600`}>{r.issue_key}</td>
                  <td className={`px-3 ${isReport ? "py-1" : "py-2"} text-gray-800 max-w-[200px] truncate`}>{r.summary}</td>
                  {!isReport && <td className="px-3 py-2 text-gray-500">{r.first_closed ?? "—"}</td>}
                  <td className={`px-3 ${isReport ? "py-1" : "py-2"} text-gray-500`}>{r.reopen_date ?? "—"}</td>
                  <td className={`px-3 ${isReport ? "py-1" : "py-2"} font-semibold text-gray-700 text-right`}>{r.resolution_time_days?.toFixed(1) ?? "—"}</td>
                </tr>
              ))}
              {data.reopen_cycles.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-gray-400">No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {!isReport && (
          <button
            onClick={() => exportCSV(rows, "reopen-cycles.csv")}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            <Download size={11} /> Export CSV
          </button>
        )}
      </div>
    );
  }

  // Throughput — day detail (same layout as output_velocity)
  if (data.kpi === "throughput" && data.day_detail) {
    const { date, closed, updated } = data.day_detail;
    const hasData = closed.length > 0 || updated.length > 0;
    if (!hasData) {
      return (
        <div className="rounded-xl border border-gray-100 px-5 py-6 space-y-3 text-center">
          <p className="text-sm font-semibold text-gray-700">{date}</p>
          <p className="text-[11px] text-gray-400">No issue activity recorded on this day.</p>
        </div>
      );
    }
    return (
      <div className="space-y-5">
        <p className="text-xs font-semibold text-gray-700">{date}</p>
        {closed.length > 0 && (
          <Segment title={`Closed (${closed.length})`}>
            <IssueTable rows={closed} csvFilename={`throughput-closed-${date}.csv`} isReport={isReport} kpiId={data.kpi} />
          </Segment>
        )}
        {updated.length > 0 && (
          <Segment title={`Created / Updated (${updated.length})`}>
            <IssueTable rows={updated} csvFilename={`throughput-updated-${date}.csv`} isReport={isReport} kpiId={data.kpi} />
          </Segment>
        )}
      </div>
    );
  }

  // Backlog — bucket issues (interactive) or all open issues (report)
  if (data.kpi === "backlog" && data.bucket_issues) {
    return (
      <div className="space-y-4">
        {!isReport && context?.bucket && (
          <p className="text-xs text-gray-400">
            Open issues aged {context.bucket}
          </p>
        )}
        <IssueTable
          rows={data.bucket_issues}
          csvFilename={`backlog-${context?.bucket ?? "all"}.csv`}
          isReport={isReport}
          kpiId={data.kpi}
        />
      </div>
    );
  }

  // Worked on Holidays — day detail
  if (data.kpi === "worked_on_holidays" && data.day_detail) {
    const { date, closed, updated } = data.day_detail;
    const hasData = closed.length > 0 || updated.length > 0;
    if (!hasData) {
      return <EmptyState message={`No issue activity recorded on ${date}.`} />;
    }
    return (
      <div className="space-y-5">
        <p className="text-xs font-semibold text-gray-700">{date} — holiday/leave activity</p>
        {closed.length > 0 && (
          <Segment title={`Closed (${closed.length})`}>
            <IssueTable rows={closed} csvFilename={`holiday-closed-${date}.csv`} isReport={isReport} />
          </Segment>
        )}
        {updated.length > 0 && (
          <Segment title={`Created / Updated (${updated.length})`}>
            <IssueTable rows={updated} csvFilename={`holiday-updated-${date}.csv`} isReport={isReport} />
          </Segment>
        )}
      </div>
    );
  }

  return <EmptyState message="No detail available." />;
}

// ─── Micro components ─────────────────────────────────────────────────────────

export function Segment({ title, children, isReport = false }: { title: string; children: React.ReactNode; isReport?: boolean }) {
  return (
    <div className={isReport ? "space-y-1.5" : "space-y-3"}>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
      {children}
    </div>
  );
}

export function SectionHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      {action}
    </div>
  );
}

export function ActionBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-semibold text-blue-600 hover:underline"
    >
      {label}
    </button>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-xs text-gray-400">{message}</div>
  );
}
