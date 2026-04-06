"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import {
    Plus, Play, Power, Trash2, ChevronLeft, Mail, Settings, Clock,
    CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw, History,
    Eye, ChevronDown, FileText
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pipeline {
    id: number;
    name: string;
    gemini_keys: string;
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_pass: string;
    admin_email: string;
    selections: string;
    trigger_time: string;
    trigger_day: number;
    is_active: number;
    last_run: string | null;
    created_at: string;
    report_month: string;
}

interface RunLog {
    id: number;
    pipeline_id: number;
    pipeline_name: string;
    run_at: string;
    status: string;
    total_reports: number;
    sent_count: number;
    failed_count: number;
    details: string;
    gemini_keys: string | null;
    error_message: string | null;
}

interface Employee {
    employee_id: string;
    display_name: string;
    project_ids?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toIST(utcStr: string): string {
    try {
        // If the timestamp has a timezone indicator (Z or +), it's UTC — convert to IST
        if (utcStr.includes("Z") || utcStr.includes("+")) {
            const d = new Date(utcStr);
            const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
            return format(ist, "d MMM yyyy, HH:mm") + " IST";
        }
        // Otherwise it's already stored as IST (from getISTTimestamp) — just format it
        const d = new Date(utcStr.replace(" ", "T"));
        return format(d, "d MMM yyyy, HH:mm") + " IST";
    } catch {
        return utcStr || "—";
    }
}

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
        completed: { bg: "bg-emerald-50", text: "text-emerald-700", icon: CheckCircle },
        running: { bg: "bg-blue-50", text: "text-blue-700", icon: Loader2 },
        failed: { bg: "bg-red-50", text: "text-red-700", icon: XCircle },
        partial: { bg: "bg-amber-50", text: "text-amber-700", icon: AlertTriangle },
    };
    const c = config[status] || config.failed;
    const Icon = c.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${c.bg} ${c.text}`}>
            <Icon size={10} className={status === "running" ? "animate-spin" : ""} />
            {status}
        </span>
    );
}

function getNextTrigger(triggerDay: number, triggerTime: string): string {
    const now = new Date();
    // Convert to IST
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
    const currentDay = istNow.getDate();
    const currentMonth = istNow.getMonth();
    const currentYear = istNow.getFullYear();
    const [h, m] = triggerTime.split(":").map(Number);

    let nextDate: Date;
    if (currentDay < triggerDay) {
        nextDate = new Date(currentYear, currentMonth, triggerDay, h, m);
    } else if (currentDay === triggerDay) {
        const triggerMinutes = h * 60 + m;
        const nowMinutes = istNow.getHours() * 60 + istNow.getMinutes();
        if (nowMinutes < triggerMinutes) {
            nextDate = new Date(currentYear, currentMonth, triggerDay, h, m);
        } else {
            nextDate = new Date(currentYear, currentMonth + 1, triggerDay, h, m);
        }
    } else {
        nextDate = new Date(currentYear, currentMonth + 1, triggerDay, h, m);
    }
    return format(nextDate, "d MMM yyyy, HH:mm") + " IST";
}

function useISTClock() {
    const [time, setTime] = useState("");
    useEffect(() => {
        const update = () => {
            const now = new Date();
            const istOffset = 5.5 * 60 * 60 * 1000;
            const ist = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
            setTime(format(ist, "d MMM yyyy, HH:mm:ss") + " IST");
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, []);
    return time;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelinesPage() {
    const [view, setView] = useState<"list" | "create" | "logs">("list");
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [logs, setLogs] = useState<RunLog[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedLogPipeline, setSelectedLogPipeline] = useState<number | null>(null);
    const [expandedLogIds, setExpandedLogIds] = useState<Set<number>>(new Set());

    // Progress dialog state
    const [runningPipelineId, setRunningPipelineId] = useState<number | null>(null);
    const [progress, setProgress] = useState<any>(null);
    const [showProgressDialog, setShowProgressDialog] = useState(false);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Pipeline creation state
    const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
    const istClock = useISTClock();
    const [newPipeline, setNewPipeline] = useState({
        name: "",
        gemini_keys: "",
        smtp_host: "smtp.gmail.com",
        smtp_port: 587,
        smtp_user: "",
        smtp_pass: "",
        admin_email: "",
        trigger_time: "09:00",
        trigger_day: 1,
        report_month: "previous",
    });

    const fetchPipelines = useCallback(async () => {
        try {
            const res = await fetch("/reports/api/admin/pipelines");
            setPipelines(await res.json());
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchLogs = useCallback(async (pipelineId?: number) => {
        try {
            const url = pipelineId
                ? `/reports/api/admin/pipelines/logs?pipeline_id=${pipelineId}&limit=50`
                : "/reports/api/admin/pipelines/logs?limit=50";
            const res = await fetch(url);
            setLogs(await res.json());
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchEmployees = useCallback(async () => {
        try {
            const res = await fetch("/reports/api/admin/employees");
            const json = await res.json();
            setEmployees(json.employees || []);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        fetchPipelines();
    }, [fetchPipelines]);

    useEffect(() => {
        if (view === "create") fetchEmployees();
        if (view === "logs") fetchLogs(selectedLogPipeline || undefined);
    }, [view, fetchEmployees, fetchLogs, selectedLogPipeline]);

    const toggleEmployee = (empId: string) => {
        setSelectedEmployees((prev) => {
            const next = new Set(prev);
            if (next.has(empId)) next.delete(empId); else next.add(empId);
            return next;
        });
    };

    // Build selections from selected employees — one entry per employee, no project
    const buildSelections = () => {
        const selections: { employeeId: string; employeeName: string; projectIds: string }[] = [];
        selectedEmployees.forEach((empId) => {
            const emp = employees.find((e) => e.employee_id === empId);
            selections.push({ employeeId: empId, employeeName: emp?.display_name || empId, projectIds: emp?.project_ids || "" });
        });
        return selections;
    };

    const createPipeline = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            const selections = buildSelections();
            await fetch("/reports/api/admin/pipelines", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...newPipeline, selections }),
            });
            setView("list");
            setSelectedEmployees(new Set());
            setNewPipeline({
                name: "", gemini_keys: "", smtp_host: "smtp.gmail.com", smtp_port: 587,
                smtp_user: "", smtp_pass: "", admin_email: "", trigger_time: "09:00", trigger_day: 1, report_month: "previous",
            });
            fetchPipelines();
        } finally {
            setActionLoading(false);
        }
    };

    const handleAction = async (id: number, action: string) => {
        setActionLoading(true);
        try {
            await fetch(`/reports/api/admin/pipelines/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            fetchPipelines();
        } finally {
            setActionLoading(false);
        }
    };

    // ─── Pipeline trigger with progress dialog ──────────────────────────────

    const triggerPipeline = async (id: number) => {
        // Start the pipeline (async on backend)
        await fetch(`/reports/api/admin/pipelines/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "trigger" }),
        });

        // Open progress dialog and start polling
        setRunningPipelineId(id);
        setShowProgressDialog(true);
        setProgress(null);

        // Start polling progress
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/reports/api/admin/pipelines/progress?pipeline_id=${id}`);
                const data = await res.json();
                setProgress(data);

                // Stop polling if done
                if (data.status === "completed" || data.status === "failed" || data.status === "stopped") {
                    if (progressIntervalRef.current) {
                        clearInterval(progressIntervalRef.current);
                        progressIntervalRef.current = null;
                    }
                    fetchPipelines();
                }
            } catch (e) {
                console.error("Progress poll error", e);
            }
        }, 1500);
    };

    const stopPipeline = async () => {
        if (!runningPipelineId) return;
        await fetch("/reports/api/admin/pipelines/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pipeline_id: runningPipelineId, action: "stop" }),
        });
    };

    const closeProgressDialog = () => {
        setShowProgressDialog(false);
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
        setRunningPipelineId(null);
        setProgress(null);
        fetchPipelines();
    };

    const ordinalSuffix = (n: number) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // ─── Inline progress dialog renderer ─────────────────────────────────────
    const renderProgressDialog = () => {
        if (!showProgressDialog) return null;
        const isRunning = progress?.status === "running";
        const isDone = progress?.status === "completed" || progress?.status === "failed" || progress?.status === "stopped";
        const pct = progress?.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="px-6 pt-5 pb-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                                    Pipeline {isDone ? (progress?.status === "stopped" ? "Stopped" : progress?.status === "completed" ? "Complete" : "Failed") : "Running"}
                                </h2>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                    {progress?.pipelineName || "Starting..."}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {isRunning && (
                                    <button
                                        onClick={stopPipeline}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                                    >
                                        <XCircle size={12} />
                                        Stop Pipeline
                                    </button>
                                )}
                                {isDone && (
                                    <button
                                        onClick={closeProgressDialog}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Close
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3">
                            <div className="flex items-center justify-between text-[10px] mb-1">
                                <span className="text-gray-500 font-semibold">
                                    {isRunning ? `Processing: ${progress?.currentEmployee || "..."} (${progress?.currentStep || ""})` : isDone ? "Finished" : "Starting..."}
                                </span>
                                <span className="text-gray-400 font-bold tabular-nums">
                                    {progress?.processed || 0} / {progress?.total || 0}
                                </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${progress?.status === "failed" ? "bg-red-500" : progress?.status === "stopped" ? "bg-amber-500" : "bg-[#0a2e3d]"}`}
                                    style={{ width: `${isDone ? 100 : pct}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Results list */}
                    <div className="flex-1 overflow-y-auto px-6 py-3">
                        {(!progress || !progress.results || progress.results.length === 0) && (
                            <div className="text-center py-8">
                                <Loader2 size={20} className="animate-spin mx-auto text-gray-300 mb-2" />
                                <p className="text-xs text-gray-400">Waiting for pipeline to start...</p>
                            </div>
                        )}
                        {progress?.results?.map((r: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                                {r.status === "success" ? (
                                    <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                                ) : r.status === "failed" ? (
                                    <XCircle size={12} className="text-red-500 shrink-0" />
                                ) : (
                                    <AlertTriangle size={12} className="text-gray-300 shrink-0" />
                                )}
                                <span className={`text-xs font-semibold ${r.status === "success" ? "text-gray-800" : r.status === "failed" ? "text-red-700" : "text-gray-400"}`}>
                                    {r.name}
                                </span>
                                {r.status === "skipped" && <span className="text-[9px] text-gray-300 ml-auto">skipped</span>}
                                {r.error && <span className="text-[9px] text-red-400 ml-auto truncate max-w-[200px]">{r.error}</span>}
                                {r.hasPdf && (
                                    <a
                                        href={`/reports/api/admin/pipelines/report-pdf?pipeline_id=${r.pipelineId}&employee_id=${r.employeeId}&month=${r.month}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-auto flex items-center gap-1 text-[9px] font-bold text-[#0a2e3d] hover:text-[#0d3a4a] bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded transition-colors"
                                    >
                                        <FileText size={9} />
                                        View PDF
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    {isDone && (
                        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="text-gray-500">
                                    {progress?.results?.filter((r: any) => r.status === "success").length || 0} sent
                                    {" · "}
                                    {progress?.results?.filter((r: any) => r.status === "failed").length || 0} failed
                                    {progress?.status === "stopped" && ` · ${progress?.results?.filter((r: any) => r.status === "skipped").length || 0} skipped`}
                                </span>
                                <span className={`font-bold uppercase tracking-wider ${progress?.status === "completed" ? "text-emerald-600" : progress?.status === "stopped" ? "text-amber-600" : "text-red-600"
                                    }`}>
                                    {progress?.status}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ─── List View ──────────────────────────────────────────────────────────────
    if (view === "list") {
        return (
            <>
                {renderProgressDialog()}
                <div className="min-h-screen bg-[#f8f9fb]">
                    <div className="bg-white border-b border-gray-200/60 sticky top-0 z-30">
                        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
                            <div>
                                <h1 className="text-lg font-black text-gray-900">Pipeline Management</h1>
                                <p className="text-[10px] text-gray-400 mt-0.5">Configure and monitor automated report delivery</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setView("create")}
                                    className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-2 rounded-lg bg-gradient-to-r from-[#0a2e3d] to-[#0d3a4a] text-white hover:from-[#0d3a4a] hover:to-[#0f4555] transition-all shadow-sm"
                                >
                                    <Plus size={12} />
                                    Create Pipeline
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-4">
                        {pipelines.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-100 px-6 py-16 text-center">
                                <Settings size={32} className="mx-auto text-gray-300 mb-3" />
                                <p className="text-sm font-semibold text-gray-500">No pipelines configured yet.</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Create your first pipeline to automate monthly report delivery.
                                </p>
                                <button
                                    onClick={() => setView("create")}
                                    className="inline-flex items-center gap-2 mt-4 text-xs font-bold px-4 py-2 rounded-lg bg-gradient-to-r from-[#0a2e3d] to-[#0d3a4a] text-white hover:from-[#0d3a4a] hover:to-[#0f4555] transition-all shadow-sm"
                                >
                                    <Plus size={12} />
                                    Create Pipeline
                                </button>
                            </div>
                        ) : (
                            pipelines.map((p) => {
                                const selections = (() => { try { return JSON.parse(p.selections); } catch { return []; } })();
                                return (
                                    <div
                                        key={p.id}
                                        className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-black text-gray-900 truncate">{p.name}</h3>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"
                                                        }`}>
                                                        {p.is_active ? "Active" : "Inactive"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400 flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {ordinalSuffix(p.trigger_day || 1)} of every month at {p.trigger_time} IST
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Mail size={10} />
                                                        {selections.length} recipient{selections.length !== 1 ? "s" : ""}
                                                    </span>
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold">
                                                        📅 {p.report_month === "current" ? "Current Month" : "Previous Month"}
                                                    </span>
                                                    {p.last_run && (
                                                        <span>
                                                            Last run: {toIST(p.last_run)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-1.5 text-[10px] font-semibold text-[#0a2e3d]">
                                                    ⏭ Next trigger: {getNextTrigger(p.trigger_day || 1, p.trigger_time)}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => triggerPipeline(p.id)}
                                                    disabled={actionLoading || runningPipelineId === p.id}
                                                    className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title={runningPipelineId === p.id ? "Pipeline is running..." : "Manual trigger"}
                                                >
                                                    {runningPipelineId === p.id ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                                                    {runningPipelineId === p.id ? "Running..." : "Run Now"}
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedLogPipeline(p.id); setView("logs"); }}
                                                    className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
                                                    title="View Logs"
                                                >
                                                    <History size={10} />
                                                    Logs
                                                </button>
                                                <button
                                                    onClick={() => handleAction(p.id, p.is_active ? "deactivate" : "activate")}
                                                    disabled={actionLoading}
                                                    className={`p-1.5 rounded-lg border transition-colors disabled:opacity-50 ${p.is_active ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" : "border-gray-200 text-gray-400 hover:bg-gray-50"
                                                        }`}
                                                    title={p.is_active ? "Deactivate" : "Activate"}
                                                >
                                                    <Power size={12} />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(p.id, "delete")}
                                                    disabled={actionLoading}
                                                    className="p-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </>
        );
    }

    // ─── Logs View ──────────────────────────────────────────────────────────────
    if (view === "logs") {
        return (
            <>
                {renderProgressDialog()}
                <div className="min-h-screen bg-[#f8f9fb]">
                    <div className="bg-white border-b border-gray-200/60 sticky top-0 z-30">
                        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button onClick={() => { setView("list"); setSelectedLogPipeline(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                                    <ChevronLeft size={16} />
                                </button>
                                <div>
                                    <h1 className="text-lg font-black text-gray-900">Pipeline Run History</h1>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        {selectedLogPipeline ? `Logs for pipeline #${selectedLogPipeline}` : "All pipeline runs"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedLogPipeline && (
                                    <button
                                        onClick={() => { setSelectedLogPipeline(null); fetchLogs(); }}
                                        className="text-[10px] text-gray-400 hover:text-gray-700 underline transition-colors"
                                    >
                                        Show all
                                    </button>
                                )}
                                <button
                                    onClick={() => fetchLogs(selectedLogPipeline || undefined)}
                                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-400"
                                >
                                    <RefreshCw size={12} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-screen-2xl mx-auto px-6 py-6">
                        {logs.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-100 px-6 py-16 text-center">
                                <History size={32} className="mx-auto text-gray-300 mb-3" />
                                <p className="text-sm font-semibold text-gray-500">No pipeline runs recorded yet.</p>
                                <p className="text-xs text-gray-400 mt-1">Runs will appear here after a pipeline is triggered.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/50">
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pipeline</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Run At (IST)</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reports</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sent</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Failed</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log) => {
                                            let details: any[] = [];
                                            try { details = JSON.parse(log.details as string || "[]"); } catch { }
                                            const isExpanded = expandedLogIds.has(log.id as number);
                                            const toggleExpand = () => {
                                                setExpandedLogIds((prev) => {
                                                    const next = new Set(prev);
                                                    if (next.has(log.id as number)) next.delete(log.id as number); else next.add(log.id as number);
                                                    return next;
                                                });
                                            };
                                            // Check if details are structured (objects) or legacy (strings)
                                            const isStructured = details.length > 0 && typeof details[0] === "object";
                                            return (
                                                <>
                                                    <tr key={log.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer ${isExpanded ? "bg-gray-50/80" : ""}`} onClick={toggleExpand}>
                                                        <td className="px-4 py-3 font-bold text-gray-800">
                                                            <div className="flex items-center gap-1.5">
                                                                <ChevronDown size={12} className={`text-gray-400 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                                                                {log.pipeline_name}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-500">{toIST(log.run_at)}</td>
                                                        <td className="px-4 py-3 text-center"><StatusBadge status={log.status} /></td>
                                                        <td className="px-4 py-3 text-center font-mono text-gray-600">{log.total_reports}</td>
                                                        <td className="px-4 py-3 text-center font-mono text-emerald-600 font-bold">{log.sent_count}</td>
                                                        <td className="px-4 py-3 text-center font-mono text-red-500 font-bold">{log.failed_count}</td>
                                                        <td className="px-4 py-3 text-gray-400">
                                                            {log.error_message ? (
                                                                <span className="text-red-500 text-[10px]">{log.error_message}</span>
                                                            ) : details.length > 0 ? (
                                                                <span className="text-[10px] text-gray-400">Click to view {details.length} entries</span>
                                                            ) : (
                                                                "—"
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (details.length > 0 || log.gemini_keys) && (
                                                        <tr key={`${log.id}-details`}>
                                                            <td colSpan={7} className="px-0 py-0">
                                                                <div className="bg-gray-50/80 border-t border-b border-gray-100 px-6 py-3">
                                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Sending Log Details</div>
                                                                    <div className="space-y-1">
                                                                        {details.map((d: any, idx: number) => {
                                                                            // Support both structured and legacy string format
                                                                            if (typeof d === "string") {
                                                                                return (
                                                                                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 py-1 px-2 rounded bg-white border border-gray-100">
                                                                                        <span>{d}</span>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            return (
                                                                                <div key={idx} className="flex items-center gap-2 text-xs py-1.5 px-3 rounded bg-white border border-gray-100">
                                                                                    {d.status === "success" ? (
                                                                                        <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                                                                                    ) : d.status === "failed" ? (
                                                                                        <XCircle size={12} className="text-red-500 shrink-0" />
                                                                                    ) : (
                                                                                        <AlertTriangle size={12} className="text-gray-300 shrink-0" />
                                                                                    )}
                                                                                    <span className={`font-semibold ${d.status === "success" ? "text-gray-800" : d.status === "failed" ? "text-red-700" : "text-gray-400"}`}>
                                                                                        {d.name}
                                                                                    </span>
                                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${d.status === "success" ? "bg-emerald-50 text-emerald-600" : d.status === "failed" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-400"
                                                                                        }`}>
                                                                                        {d.status}
                                                                                    </span>
                                                                                    {d.error && <span className="text-[10px] text-red-400 ml-1 truncate max-w-[250px]">{d.error}</span>}
                                                                                    {d.status === "success" && (d.hasPdf || d.employeeId) && (
                                                                                        <a
                                                                                            href={`/reports/api/admin/pipelines/report-pdf?pipeline_id=${d.pipelineId || log.pipeline_id}&employee_id=${d.employeeId}&month=${d.month}`}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                            className="ml-auto flex items-center gap-1 text-[10px] font-bold text-[#0a2e3d] hover:text-white bg-gray-100 hover:bg-[#0a2e3d] px-2 py-1 rounded-lg transition-all"
                                                                                        >
                                                                                            <FileText size={10} />
                                                                                            View Report PDF
                                                                                        </a>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    }

    // ─── Create View ────────────────────────────────────────────────────────────
    return (
        <>
            {renderProgressDialog()}
            <div className="min-h-screen bg-[#f8f9fb]">
                <div className="bg-white border-b border-gray-200/60 sticky top-0 z-30">
                    <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setView("list")} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                                <ChevronLeft size={16} />
                            </button>
                            <div>
                                <h1 className="text-lg font-black text-gray-900">Create New Pipeline</h1>
                                <p className="text-[10px] text-gray-400 mt-0.5">Configure automated report delivery</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-[#0a2e3d]/5 rounded-xl px-4 py-2">
                            <Clock size={12} className="text-[#0a2e3d]" />
                            <span className="text-xs font-bold text-[#0a2e3d] tabular-nums">{istClock}</span>
                        </div>
                    </div>
                </div>

                <div className="max-w-screen-2xl mx-auto px-6 py-6">
                    <form onSubmit={createPipeline} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column: Config */}
                        <div className="space-y-6 bg-white rounded-2xl border border-gray-100 p-6">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Pipeline Configuration</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Pipeline Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newPipeline.name}
                                        onChange={(e) => setNewPipeline({ ...newPipeline, name: e.target.value })}
                                        className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
                                        placeholder="e.g. February Monthly Reports"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                                        Gemini API Keys <span className="text-gray-300">(comma-separated)</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={newPipeline.gemini_keys}
                                        onChange={(e) => setNewPipeline({ ...newPipeline, gemini_keys: e.target.value })}
                                        className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all font-mono text-[10px]"
                                        placeholder="key1, key2, key3"
                                    />
                                </div>

                                <div className="pt-2 border-t border-gray-100">
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <Mail size={10} /> SMTP Configuration
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-gray-400 block mb-0.5">Host</label>
                                            <input
                                                value={newPipeline.smtp_host}
                                                onChange={(e) => setNewPipeline({ ...newPipeline, smtp_host: e.target.value })}
                                                className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-400 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-400 block mb-0.5">Port</label>
                                            <input
                                                type="number"
                                                value={newPipeline.smtp_port}
                                                onChange={(e) => setNewPipeline({ ...newPipeline, smtp_port: parseInt(e.target.value) || 587 })}
                                                className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-400 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-400 block mb-0.5">Gmail Address</label>
                                            <input
                                                type="email"
                                                value={newPipeline.smtp_user}
                                                onChange={(e) => setNewPipeline({ ...newPipeline, smtp_user: e.target.value })}
                                                className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-400 transition-all"
                                                placeholder="you@gmail.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-400 block mb-0.5">App Password</label>
                                            <input
                                                type="password"
                                                value={newPipeline.smtp_pass}
                                                onChange={(e) => setNewPipeline({ ...newPipeline, smtp_pass: e.target.value })}
                                                className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-400 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Admin Email (for notifications)</label>
                                    <input
                                        type="email"
                                        value={newPipeline.admin_email}
                                        onChange={(e) => setNewPipeline({ ...newPipeline, admin_email: e.target.value })}
                                        className="w-full p-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
                                        placeholder="admin@gmail.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Schedule & Selection */}
                        <div className="space-y-6 flex flex-col">
                            <div className="bg-white rounded-2xl border border-gray-100 p-6 flex-1">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Schedule & Recipients</h3>

                                <div className="space-y-4">
                                    {/* Schedule */}
                                    <div className="flex gap-4 flex-wrap">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Report Month</label>
                                            <select
                                                value={newPipeline.report_month}
                                                onChange={(e) => setNewPipeline({ ...newPipeline, report_month: e.target.value })}
                                                className="text-sm font-bold p-2.5 border border-gray-200 bg-white rounded-xl outline-none focus:border-blue-400 transition-all min-w-[160px]"
                                            >
                                                <option value="previous">Previous Month</option>
                                                <option value="current">Current Month</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Day of Month</label>
                                            <select
                                                value={newPipeline.trigger_day}
                                                onChange={(e) => setNewPipeline({ ...newPipeline, trigger_day: parseInt(e.target.value) })}
                                                className="text-sm font-bold p-2.5 border border-gray-200 bg-white rounded-xl outline-none focus:border-blue-400 transition-all min-w-[120px]"
                                            >
                                                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                                                    <option key={d} value={d}>{ordinalSuffix(d)}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Time (IST)</label>
                                            <input
                                                type="time"
                                                value={newPipeline.trigger_time}
                                                onChange={(e) => setNewPipeline({ ...newPipeline, trigger_time: e.target.value })}
                                                className="text-sm font-bold p-2.5 border border-gray-200 rounded-xl outline-none focus:border-blue-400 transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Employee Selection */}
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">
                                            Select Recipients ({selectedEmployees.size})
                                        </label>
                                        <div className="bg-white border border-gray-200 rounded-xl max-h-72 overflow-y-auto">
                                            <table className="w-full text-[10px]">
                                                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                                                    <tr>
                                                        <th className="p-2 w-6 text-center"></th>
                                                        <th className="p-2 text-left font-bold text-gray-500">Employee</th>
                                                        <th className="p-2 text-left font-bold text-gray-500">Email</th>
                                                        <th className="p-2 text-left font-bold text-gray-500">Projects</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {employees.length === 0 && (
                                                        <tr>
                                                            <td colSpan={4} className="p-4 text-center text-gray-400">
                                                                <Loader2 size={14} className="animate-spin mx-auto mb-1" />
                                                                Loading employees...
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {employees.map((emp) => {
                                                        const empId = emp.employee_id;
                                                        const isSelected = selectedEmployees.has(empId);
                                                        const firstName = emp.display_name.split(/\s+/)[0]?.toLowerCase() || "";
                                                        const email = `${firstName}@gmail.com`;
                                                        return (
                                                            <tr
                                                                key={empId}
                                                                className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${isSelected ? "bg-teal-50/30" : ""}`}
                                                            >
                                                                <td className="p-2 text-center cursor-pointer" onClick={() => toggleEmployee(empId)}>
                                                                    <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? "bg-[#0a2e3d] border-[#0a2e3d]" : "border-gray-300"}`}>
                                                                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                                                                    </div>
                                                                </td>
                                                                <td className="p-2 cursor-pointer" onClick={() => toggleEmployee(empId)}>
                                                                    <span className="font-bold text-gray-800">{emp.display_name}</span>
                                                                </td>
                                                                <td className="p-2 text-gray-400 cursor-pointer" onClick={() => toggleEmployee(empId)}>{email}</td>
                                                                <td className="p-2">
                                                                    <span className="text-[10px] font-bold text-gray-500 px-2 py-1 rounded-lg bg-gray-50 border border-gray-100">
                                                                        {emp.project_ids || "—"}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={actionLoading || !newPipeline.name || selectedEmployees.size === 0}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#0a2e3d] to-[#0d3a4a] text-white font-bold text-sm hover:from-[#0d3a4a] hover:to-[#0f4555] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                Save Pipeline ({selectedEmployees.size} employee{selectedEmployees.size !== 1 ? "s" : ""})
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
