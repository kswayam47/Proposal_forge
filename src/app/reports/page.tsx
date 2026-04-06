"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { KPIStrip } from "@/components/jira/dashboard/KPIStrip";
import { AlertStrip } from "@/components/jira/dashboard/AlertStrip";
import { TimeEntryModal } from "@/components/jira/dashboard/TimeEntryModal";
import {
  OutputTrendChart,
  ResolutionTrendChart,
  StabilityTrendChart,
  BacklogAgingChart,
} from "@/components/jira/dashboard/TrendCharts";
import { DrillDrawer, Level2View, type DrillTarget } from "@/components/jira/dashboard/DrillDrawer";
import { ProcessDialog } from "@/components/jira/dashboard/ProcessDialog";
import html2canvas from "html2canvas";
import type { DashboardData, JiraUser } from "@/types";
import type { JiraProject } from "@/app/reports/api/jira/projects/route";
import {
  RefreshCw, Plus, Database, Clock, AlertCircle,
  FileDown, Users, ChevronDown, ChevronLeft, ChevronRight, Loader2, Search, Briefcase,
} from "lucide-react";

function SectionLabel({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("bg-white rounded-3xl border border-gray-100/80 p-6 shadow-sm", className)}>{children}</div>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-9 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 h-28 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 h-64 animate-pulse" />
        <div className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 h-36 animate-pulse" />
    </div>
  );
}

// ─── User Selector Dropdown ───────────────────────────────────────────────────

function UserSelector({
  value,
  options,
  onChange,
  loading,
}: {
  value: JiraUser | null;
  options: JiraUser[];
  onChange: (v: JiraUser | null) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.trim()
    ? options.filter((u) =>
      u.displayName.toLowerCase().includes(query.toLowerCase()) ||
      (u.emailAddress ?? "").toLowerCase().includes(query.toLowerCase())
    )
    : options;

  return (
    <div className="relative" ref={ref}>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">User</p>
      <button
        onClick={() => { setOpen((o) => !o); setQuery(""); }}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 min-w-[200px] max-w-[280px]"
      >
        {loading ? (
          <Loader2 size={12} className="animate-spin text-gray-400 shrink-0" />
        ) : (
          <Users size={12} className="text-gray-400 shrink-0" />
        )}
        <span className="flex-1 text-left truncate">
          {value ? value.displayName : loading ? "Loading users…" : "Select user…"}
        </span>
        <ChevronDown size={12} className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[260px] max-w-[320px]">
          {/* Search */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
              <Search size={11} className="text-gray-400 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search users…"
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>
          {/* All users option */}
          <div className="max-h-56 overflow-y-auto">
            <button
              className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50"
              onClick={() => { onChange(null); setOpen(false); setQuery(""); }}
            >
              All users
            </button>
            {filtered.map((u) => (
              <button
                key={u.accountId}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors ${value?.accountId === u.accountId ? "bg-gray-50" : ""
                  }`}
                onClick={() => { onChange(u); setOpen(false); setQuery(""); }}
              >
                <div className="flex items-center gap-2.5">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" className="w-6 h-6 rounded-full shrink-0 object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-gray-500">
                        {u.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className={`text-sm truncate ${value?.accountId === u.accountId ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                      {u.displayName}
                    </p>
                    {u.emailAddress && (
                      <p className="text-[10px] text-gray-400 truncate">{u.emailAddress}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && !loading && (
              <p className="px-3 py-3 text-xs text-gray-400 text-center">No users found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Project Selector Dropdown ────────────────────────────────────────────────

function ProjectSelector({
  value,
  options,
  onChange,
  loading,
}: {
  value: JiraProject | null;
  options: JiraProject[];
  onChange: (v: JiraProject | null) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Project</p>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 min-w-[160px] max-w-[220px]"
      >
        {loading ? (
          <Loader2 size={12} className="animate-spin text-gray-400 shrink-0" />
        ) : (
          <Briefcase size={12} className="text-gray-400 shrink-0" />
        )}
        <span className="flex-1 text-left truncate">
          {value ? `${value.key} – ${value.name}` : loading ? "Loading…" : "All projects"}
        </span>
        <ChevronDown size={12} className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[200px]">
          <div className="max-h-56 overflow-y-auto">
            <button
              className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50"
              onClick={() => { onChange(null); setOpen(false); }}
            >
              All projects
            </button>
            {options.map((p) => (
              <button
                key={p.key}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors ${value?.key === p.key ? "bg-gray-50" : ""}`}
                onClick={() => { onChange(p); setOpen(false); }}
              >
                <div className="flex items-center gap-2">
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="w-5 h-5 rounded shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-gray-500">{p.key.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className={`text-sm truncate ${value?.key === p.key ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                      {p.key}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">{p.name}</p>
                  </div>
                </div>
              </button>
            ))}
            {options.length === 0 && !loading && (
              <p className="px-3 py-3 text-xs text-gray-400 text-center">No projects found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Month Picker ─────────────────────────────────────────────────────────────

function MonthPicker({
  value,
  onChange,
}: {
  value: string; // "yyyy-MM"
  onChange: (v: string) => void;
}) {
  const [year, mon] = value.split("-").map(Number);
  const label = format(new Date(year, mon - 1, 1), "MMMM yyyy");

  function shift(delta: number) {
    const d = new Date(year, mon - 1 + delta, 1);
    onChange(format(d, "yyyy-MM"));
  }

  const isCurrentMonth = value === format(new Date(), "yyyy-MM");

  return (
    <div className="flex flex-col">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Month</p>
      <div className="flex items-center gap-1 h-9">
        <button
          onClick={() => shift(-1)}
          className="w-7 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-500"
        >
          <ChevronLeft size={13} />
        </button>
        <span className="px-3 h-9 flex items-center text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg min-w-[140px] justify-center">
          {label}
        </span>
        <button
          onClick={() => shift(1)}
          disabled={isCurrentMonth}
          className="w-7 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [users, setUsers] = useState<JiraUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<JiraUser | null>(null);
  const [usersLoading, setUsersLoading] = useState(true);

  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<JiraProject | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [etlRunning, setEtlRunning] = useState(false);
  const [etlMessage, setEtlMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "word" | "capturing" | null>(null);
  const [exportMessage, setExportMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [syncStatus, setSyncStatus] = useState<"processing" | "success" | "error">("processing");
  const [syncMessage, setSyncMessage] = useState<string | undefined>();
  const [isInitialSync, setIsInitialSync] = useState(true);
  const [captureKPI, setCaptureKPI] = useState<{ kpi: any; data: any } | null>(null);
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);

  const currentMonth = format(new Date(`${selectedMonth}-01T00:00:00`), "MMMM yyyy");

  const activeEmployeeId = selectedUser?.accountId ?? process.env.NEXT_PUBLIC_EMPLOYEE_ID ?? "EMP001";

  // Build a drill opener that injects current month/user/project context
  const openDrill = useCallback(
    (partial: { kpi: DrillTarget["kpi"]; label: string; month?: string }) => {
      setDrillTarget({
        ...partial,
        month: partial.month || selectedMonth,
        assigneeId: selectedUser?.accountId ?? null,
        projectKey: selectedProject?.key ?? null,
      } as DrillTarget);
    },
    [selectedMonth, selectedUser, selectedProject]
  );

  // ── Fetch all org users on mount ─────────────────────────────────────────────
  useEffect(() => {
    setUsersLoading(true);
    fetch("/reports/api/jira/users")
      .then((r) => r.json())
      .then((json) => setUsers(json.users ?? []))
      .catch(() => { })
      .finally(() => setUsersLoading(false));
  }, []);

  // ── Fetch all projects on mount ───────────────────────────────────────────────
  useEffect(() => {
    setProjectsLoading(true);
    fetch("/reports/api/jira/projects")
      .then((r) => r.json())
      .then((json) => setProjects(json.projects ?? []))
      .catch(() => { })
      .finally(() => setProjectsLoading(false));
  }, []);

  // ── Auto Sync Trigger ───────────────────────────────────────────────────────
  useEffect(() => {
    // Only run on the very first mount
    runETL(true);
  }, []);

  // ── Fetch dashboard when user changes ────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("employee_id", activeEmployeeId);
      if (selectedUser) {
        params.set("assignee_id", selectedUser.accountId);
        params.set("assignee_name", selectedUser.displayName);
      }
      if (selectedProject) params.set("project_key", selectedProject.key);
      params.set("month", selectedMonth);

      const res = await fetch(`/reports/api/metrics?${params.toString()}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [selectedUser, selectedProject, selectedMonth, activeEmployeeId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── ETL ──────────────────────────────────────────────────────────────────────
  async function runETL(isInitial = false) {
    setIsInitialSync(isInitial);
    setSyncStatus("processing");
    setSyncMessage(undefined);
    setEtlRunning(true);
    setEtlMessage(null);
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
        await fetchDashboard();
        return;
      }

      if (json.status === "success") {
        setSyncStatus("success");
        setSyncMessage(`Synced ${json.issues_fetched} issues successfully.`);
        if (!isInitial) {
          setEtlMessage({
            text: `Synced ${json.issues_fetched} issues across ${json.projects_synced?.length ?? 0} project(s).`,
            ok: true,
          });
        }
        await fetchDashboard();
        if (isInitial) {
          setTimeout(() => setIsInitialSync(false), 1500);
        }
      } else {
        setSyncStatus("error");
        setSyncMessage(json.error_message || "Sync failed");
        setEtlMessage({ text: `Sync failed: ${json.error_message}`, ok: false });
      }
    } catch {
      setSyncStatus("error");
      setSyncMessage("Network error during sync.");
      setEtlMessage({ text: "Sync request failed.", ok: false });
    } finally {
      setEtlRunning(false);
      if (!isInitial) {
        setTimeout(() => {
          setEtlMessage(null);
          setSyncMessage(undefined);
        }, 8000);
      }
    }
  }

  async function captureElement(id: string): Promise<string | null> {
    const el = document.getElementById(id);
    if (!el) return null;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      return canvas.toDataURL("image/png");
    } catch (e) {
      console.error(`Failed to capture ${id}`, e);
      return null;
    }
  }

  async function handleExportPDF() {
    if (!data) return;
    setExporting("pdf");
    setSyncStatus("processing");
    setSyncMessage("Generating high-fidelity PDF...");
    setExportMessage({ text: "Generating high-fidelity PDF...", ok: true });

    try {
      const params = new URLSearchParams({
        employee_id: selectedUser?.accountId ?? activeEmployeeId,
        month: selectedMonth,
        project_key: selectedProject?.key ?? "",
        display_name: selectedUser?.displayName ?? activeEmployeeId,
      });

      const res = await fetch(`/reports/api/export-pdf?${params.toString()}`);

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setSyncStatus("error");
        setSyncMessage(json.error ?? "Generation failed");
        throw new Error(json.error ?? "Generation failed on server");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Jira_Report_${selectedUser?.displayName || activeEmployeeId}_${selectedMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setSyncStatus("success");
      setSyncMessage("PDF downloaded successfully!");
      setExportMessage({ text: "PDF downloaded successfully!", ok: true });
    } catch (err) {
      setSyncStatus("error");
      setSyncMessage(err instanceof Error ? err.message : "Export failed");
      setExportMessage({ text: err instanceof Error ? err.message : "Export failed", ok: false });
    } finally {
      setTimeout(() => {
        setExporting(null);
        setExportMessage(null);
        setSyncMessage(undefined);
      }, 3000);
    }
  }

  function handleExportWord() {
    if (!data) return;
    setExporting("word");
    import("@/lib/jira/export")
      .then(({ exportToWord }) =>
        exportToWord(
          data,
          activeEmployeeId,
          currentMonth,
          selectedUser?.displayName,
          selectedProject?.key
        )
      )
      .catch((e) => console.error("Word export failed", e))
      .finally(() => setExporting(null));
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      {/* ── Top Toolbar ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-10 py-5 flex items-end gap-10 flex-wrap">
          <div className="flex items-end gap-6">
            <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
            <ProjectSelector
              value={selectedProject}
              options={projects}
              onChange={setSelectedProject}
              loading={projectsLoading}
            />
            <UserSelector
              value={selectedUser}
              options={users}
              onChange={setSelectedUser}
              loading={usersLoading}
            />
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            {data?.last_etl_run && !etlRunning && (
              <div className="flex flex-col items-end mr-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Sync</span>
                <span className="text-[11px] font-semibold text-gray-600">
                  {format(new Date(data.last_etl_run), "d MMM, HH:mm")}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {data && (
                <button
                  onClick={handleExportPDF}
                  disabled={!!exporting}
                  className="h-10 flex items-center gap-2 px-5 rounded-xl bg-gray-50 border border-gray-200 text-[13px] font-bold text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  <FileDown size={16} />
                  {exporting === "pdf" ? "Exporting…" : "PDF Report"}
                </button>
              )}
              <button
                onClick={() => runETL()}
                disabled={etlRunning}
                className="h-10 flex items-center gap-2 px-5 rounded-xl bg-gray-900 border border-gray-800 text-[13px] font-bold text-white hover:bg-gray-800 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <Database size={16} className={etlRunning ? "animate-pulse" : ""} />
                {etlRunning ? "Syncing…" : "Sync Jira"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {users.length === 0 && !usersLoading && (
        <p className="text-xs text-gray-400 pb-0.5 self-end">
          No users found — run{" "}
          <button
            onClick={() => runETL()}
            disabled={etlRunning}
            className="underline hover:text-gray-700 transition-colors"
          >
            Sync Jira
          </button>{" "}
          to fetch your organisation&apos;s users.
        </p>
      )}

      {/* ── Main ────────────── */}
      <main className={cn("max-w-[1600px] mx-auto px-10 py-12 space-y-16 transition-all duration-700", isInitialSync ? "opacity-0 translate-y-4 pointer-events-none" : "opacity-100 translate-y-0")}>
        <div className="flex items-end justify-between border-b border-gray-100 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider rounded-md border border-blue-100">
                System Reports
              </span>
              {selectedProject && (
                <span className="px-3 py-1 bg-gray-50 text-gray-600 text-[10px] font-black uppercase tracking-wider rounded-md border border-gray-200">
                  Project: {selectedProject.key}
                </span>
              )}
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">{currentMonth}</h1>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              {selectedUser ? (
                <>Visualizing performance metrics for <span className="text-blue-600 font-bold">{selectedUser.displayName}</span></>
              ) : (
                "Comprehensive overview of organisation-wide Jira activity and developer velocity."
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchDashboard}
              disabled={loading}
              className="flex items-center gap-2 h-11 px-5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm active:scale-95 disabled:opacity-40"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              <span className="text-[13px] font-bold">Refresh Data</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span><strong>Error:</strong> {error}</span>
          </div>
        )}

        {loading && !data && <LoadingSkeleton />}

        {
          data && (
            <>
              <section id="pdf-kpi-strip">
                <SectionLabel
                  title="Performance Summary"
                  subtitle="Current month · with month-over-month comparison"
                />
                <KPIStrip cards={data.kpi_cards} onDrill={openDrill} />
              </section>

              {data.alerts.length > 0 && (
                <section id="pdf-alerts">
                  <SectionLabel title="Behavioral Signals" />
                  <AlertStrip alerts={data.alerts} />
                </section>
              )}

              <section id="pdf-trends">
                <SectionLabel title="Historical Trends" subtitle="Performance over the last 6 months" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Panel className="transition-all hover:border-gray-200">
                    <div id="pdf-trend-output">
                      <SectionLabel title="Monthly Output" subtitle="Issues closed per month" />
                      <OutputTrendChart data={data.trends.output_trend} onDrill={openDrill} />
                    </div>
                  </Panel>
                  <Panel>
                    <div id="pdf-trend-resolution">
                      <SectionLabel title="Resolution Speed" subtitle="Avg days to close an issue" />
                      <ResolutionTrendChart data={data.trends.resolution_trend} onDrill={openDrill} />
                    </div>
                  </Panel>
                  <Panel>
                    <div id="pdf-trend-stability">
                      <SectionLabel title="Stability Score" subtitle="(1 − reopened/closed) × 100" />
                      <StabilityTrendChart data={data.trends.stability_trend} onDrill={openDrill} />
                    </div>
                  </Panel>
                  <Panel>
                    <div id="pdf-trend-backlog">
                      <SectionLabel title="Backlog Aging" subtitle="Open issues by age bucket" />
                      <BacklogAgingChart data={data.trends.backlog_aging} onDrill={openDrill} />
                    </div>
                  </Panel>
                </div>
              </section>


            </>
          )
        }
      </main>

      <TimeEntryModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSaved={fetchDashboard}
        employeeId={activeEmployeeId}
      />

      <DrillDrawer
        target={drillTarget}
        onClose={() => setDrillTarget(null)}
      />

      {/* Sync / PDF Process Dialog */}
      <ProcessDialog
        isOpen={isInitialSync || etlRunning || !!exporting}
        type={exporting === "pdf" ? "pdf" : "sync"}
        status={syncStatus}
        message={syncMessage}
        onClose={syncStatus !== "processing" ? () => {
          setIsInitialSync(false);
          setEtlRunning(false);
          setExporting(null);
          setSyncMessage(undefined);
        } : undefined}
      />

      {/* Hidden Capture Target for PDF Generation */}
      {
        captureKPI && (
          <div
            style={{ position: "fixed", top: "-9999px", left: "-9999px", width: "800px", background: "white" }}
            id="pdf-capture-drill"
            className="p-8"
          >
            <div className="mb-4">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                Drill-down: {captureKPI.kpi.replace(/_/g, " ")}
              </h2>
            </div>
            <Level2View
              data={captureKPI.data}
              target={{ kpi: captureKPI.kpi, label: captureKPI.kpi, month: selectedMonth }}
            />
          </div>
        )
      }

      {/* Export Loading Overlay */}
      {
        exporting === "capturing" && (
          <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center">
              <div className="relative">
                <Loader2 size={40} className="animate-spin text-blue-600" />
                <FileDown size={20} className="absolute inset-0 m-auto text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Preparing Report</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Capturing high-fidelity dashboard visuals...<br />
                  This may take a moment.
                </p>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}
