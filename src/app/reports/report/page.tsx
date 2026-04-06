"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { DashboardData, GeminiKPIOutput, CalendarSummary } from "@/types";
import type { DrillResponse } from "@/app/reports/api/drill/[kpi]/route";
import type { GeminiOverallSummary } from "@/lib/jira/gemini";
import { calculateEnterpriseScore, getBand } from "@/lib/jira/scoring";
import type { InsightResponse } from "@/app/reports/api/ai/insight/route";
import {
  OutputTrendChart,
  ResolutionTrendChart,
  StabilityTrendChart,
  BacklogAgingChart,
} from "@/components/jira/dashboard/TrendCharts";
import { Level2View, Level3View } from "@/components/jira/dashboard/DrillDrawer";
import { KPIStrip, KPICard } from "@/components/jira/dashboard/KPIStrip";
import { Loader2, AlertTriangle, Key, RefreshCcw } from "lucide-react";
import type { GeminiKPIInput } from "@/lib/jira/gemini";

interface KPIReportData {
  id: string;
  name: string;
  drill: DrillResponse;
  drillL3: DrillResponse;
  insight: GeminiKPIOutput;
  hasData: boolean;
}

// ── Design tokens ──────────────────────────────────────────────────────────────
const NAVY = "#1e3a5f";
const TEAL = "#0ea5e9";
const SLATE = "#64748b";
const A4_W = "210mm";

// ── Watermark — real Woodfrog logo SVG ────────────────────────────────────────
function Watermark() {
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
      zIndex: 0,
    }}>
      <svg
        width="320"
        height="280"
        viewBox="0 0 50 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.06 }}
        aria-hidden="true"
      >
        <path
          d="M20.7647 1L1 41H11.3529L24.5294 12.8182L37.7059 41H49L28.2941 1H20.7647Z"
          fill="#0ea5e9"
          stroke="#0ea5e9"
        />
      </svg>
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────
function Header() {
  return (
    <div style={{
      height: 42,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 36px",
      background: `linear-gradient(135deg, ${NAVY} 0%, #164e8e 60%, #0ea5e9 100%)`,
      flexShrink: 0,
      width: "100%",
      position: "relative",
      zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <svg width="26" height="22" viewBox="0 0 50 42" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M20.7647 1L1 41H11.3529L24.5294 12.8182L37.7059 41H49L28.2941 1H20.7647Z" fill="#fff" stroke="#fff" strokeWidth="0.5" />
        </svg>
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: 1.4 }}>
          PROPOSALFORGE
        </span>
      </div>
    </div>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────
const FOOTER_H = 28;

function Footer({ pageNum }: { pageNum: number }) {
  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: FOOTER_H,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 36px",
      borderTop: "1px solid #e2e8f0",
      backgroundColor: "#f8fafc",
      width: "100%",
      zIndex: 10,
    }}>
      <span style={{ color: SLATE, fontSize: 8.5 }}>ProposalForge · Internal Use Only · Confidential</span>
      <span style={{ color: NAVY, fontSize: 9, fontWeight: 700 }}>Page {pageNum}</span>
    </div>
  );
}

// ── Page Shell ─────────────────────────────────────────────────────────────────
// position:relative so Footer (absolute bottom:0) always anchors to page bottom.
// fixed pages: exact 297mm height, overflow hidden.
// flow pages: minHeight 297mm, content grows naturally; footer stays pinned at
//             the bottom of whatever height the page grows to.
function PageShell({
  pageNum,
  fixed = false,
  breakBefore = true,
  children,
}: {
  pageNum: number;
  fixed?: boolean;
  breakBefore?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      width: A4_W,
      height: fixed ? "297mm" : undefined,
      minHeight: "297mm",
      backgroundColor: "#ffffff",
      position: "relative",
      pageBreakBefore: breakBefore ? "always" : undefined,
      breakBefore: breakBefore ? "page" : undefined,
      overflow: fixed ? "hidden" : undefined,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
    }}>
      <Watermark />
      <Header />
      {/* Content area: use padding for inner content, but header/footer remain full width */}
      <div style={{
        flex: 1,
        padding: "16px 36px",
        paddingBottom: FOOTER_H + 8,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        zIndex: 1,
        minHeight: 0,
      }}>
        {children}
      </div>
      <Footer pageNum={pageNum} />
    </div>
  );
}

// ── Calendar Summary Table ─────────────────────────────────────────────────────
function CalTable({ cal }: { cal: CalendarSummary }) {
  const rows = [
    { label: "Total Calendar Days", value: cal.total_days_in_month, color: NAVY, bold: false },
    { label: "Weekends", value: cal.weekends, color: SLATE, bold: false },
    { label: "Public Holidays", value: cal.public_holidays, color: "#92400e", bold: false },
    { label: "Leave Days", value: cal.leave_days, color: "#92400e", bold: false },
    { label: "Working Days", value: cal.working_days, color: "#15803d", bold: true },
  ];
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
      <thead>
        <tr style={{ background: `linear-gradient(90deg, ${NAVY} 0%, #164e8e 100%)` }}>
          {["Category", "Days"].map((h) => (
            <th key={h} style={{
              padding: "5px 12px", color: "#fff", fontWeight: 700, fontSize: 9,
              textAlign: "left", letterSpacing: 0.7, textTransform: "uppercase",
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.label} style={{ backgroundColor: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
            <td style={{ padding: "5px 12px", color: SLATE, fontWeight: r.bold ? 700 : 400, fontSize: 10.5 }}>
              {r.label}
            </td>
            <td style={{ padding: "5px 12px", color: r.color, fontWeight: r.bold ? 800 : 600, fontSize: r.bold ? 12 : 10.5 }}>
              {r.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Score Badge ────────────────────────────────────────────────────────────────
function ScoreBadge({ score, band, color }: { score: number; band: string; color: string }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 1,
    }}>
      <div style={{
        display: "flex",
        alignItems: "baseline",
        gap: 2,
      }}>
        <span style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: SLATE }}>/100</span>
      </div>
      <span style={{
        fontSize: 8, fontWeight: 700, color: "#fff",
        backgroundColor: color,
        padding: "2px 7px", borderRadius: 10,
        textTransform: "uppercase", letterSpacing: 0.8,
      }}>{band}</span>
    </div>
  );
}

// ── Overall Summary Block ──────────────────────────────────────────────────────
function OverallSummaryBlock({ summary }: { summary: GeminiOverallSummary }) {
  if (!summary.summary) return null;
  return (
    <div style={{
      border: `1px solid #bfdbfe`,
      borderLeft: `4px solid ${TEAL}`,
      borderRadius: 6,
      padding: "12px 16px",
      backgroundColor: "#eff6ff",
    }}>
      <p style={{
        fontSize: 8.5, fontWeight: 800, color: TEAL,
        textTransform: "uppercase", letterSpacing: 1, marginBottom: 6,
      }}>Overall Summary</p>
      <p style={{ fontSize: 10.5, color: NAVY, lineHeight: 1.5, marginBottom: 10 }}>
        {summary.summary}
      </p>

      {(summary.strengths.length > 0 || summary.concerns.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {summary.strengths.length > 0 && (
            <div>
              <p style={{ fontSize: 8, fontWeight: 800, color: "#15803d", textTransform: "uppercase", marginBottom: 4 }}>Strengths</p>
              <ul style={{ margin: 0, paddingLeft: 14, fontSize: 10, color: SLATE }}>
                {summary.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {summary.concerns.length > 0 && (
            <div>
              <p style={{ fontSize: 8, fontWeight: 800, color: "#b91c1c", textTransform: "uppercase", marginBottom: 4 }}>Areas of Concern</p>
              <ul style={{ margin: 0, paddingLeft: 14, fontSize: 10, color: SLATE }}>
                {summary.concerns.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{
      fontSize: 10.5, fontWeight: 800, color: SLATE,
      textTransform: "uppercase", letterSpacing: 1.5,
      marginBottom: 10, flexShrink: 0,
    }}>{text}</p>
  );
}

function drillHasData(drill: DrillResponse): boolean {
  if (drill.reopened_issues?.length) return true;
  if (drill.reopen_cycles?.length) return true;
  if (drill.holiday_days?.length) return true;
  if (drill.daily_closures?.length) return true;
  if (drill.resolution_buckets?.some((b) => b.count > 0)) return true;
  if (drill.backlog_buckets?.some((b) => b.count > 0)) return true;
  if (drill.issues?.length) return true;
  if (drill.slowest_issues?.length) return true;
  if (drill.breakdown_by_assignee?.length) return true;
  if (drill.activity_calendar?.some((d) => d.active)) return true;
  return false;
}

// ── Main Report ────────────────────────────────────────────────────────────────
function ReportContent() {
  const searchParams = useSearchParams();
  const employeeId = searchParams.get("employee_id") || "EMP001";
  const month = searchParams.get("month") || format(new Date(), "yyyy-MM");
  const projectKey = searchParams.get("project_key") || "";
  const projectsLabel = searchParams.get("projects_label") || "";
  const displayName = searchParams.get("display_name") || employeeId;

  const [data, setData] = useState<DashboardData | null>(null);
  const [kpiReports, setKpiReports] = useState<KPIReportData[]>([]);
  const [overallSummary, setOverallSummary] = useState<GeminiOverallSummary | null>(null);
  const [scoreDetails, setScoreDetails] = useState<{ score: number; band: string; color: string; factor_scores: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState("");

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      setShowKeyModal(false);

      const dashRes = await fetch(
        `/reports/api/metrics?month=${month}&assignee_id=${employeeId}&project_key=${projectKey}`
      );
      if (!dashRes.ok) throw new Error(`Dashboard fetch failed: ${dashRes.status}`);
      const dashData: DashboardData = await dashRes.json();
      setData(dashData);

      const kpis = [
        { id: "issues_closed", name: "Issues Closed" },
        { id: "resolution_time", name: "Avg Resolution Time" },
        { id: "output_velocity", name: "Output Velocity" },
        { id: "stability", name: "Stability Score" },
        { id: "throughput", name: "Throughput Consistency" },
        { id: "backlog", name: "Backlog Health" },
        { id: "worked_on_holidays", name: "Worked on Holidays" },
      ];

      const drillResults = await Promise.all(
        kpis.map(async (kpi) => {
          const [res2, res3] = await Promise.all([
            fetch(`/reports/api/drill/${kpi.id}?level=2&month=${month}&assignee_id=${employeeId}&project_key=${projectKey}`),
            fetch(`/reports/api/drill/${kpi.id}?level=3&month=${month}&assignee_id=${employeeId}&project_key=${projectKey}`),
          ]);
          const drillL2: DrillResponse = res2.ok ? await res2.json() : { kpi: kpi.id, level: 2 };
          const drillL3: DrillResponse = res3.ok ? await res3.json() : { kpi: kpi.id, level: 3 };
          return { ...kpi, drill: drillL2, drillL3 };
        })
      );

      const scoreResult = calculateEnterpriseScore(dashData);
      const band = getBand(scoreResult.final_score);
      setScoreDetails({
        score: scoreResult.final_score,
        band: scoreResult.band,
        color: band.color,
        factor_scores: scoreResult.factor_scores,
      });

      const valKeyMap: Record<string, string> = {
        issues_closed: "issues_closed",
        resolution_time: "avg_resolution_time_days",
        output_velocity: "output_velocity",
        stability: "stability_score",
        throughput: "throughput_consistency",
        backlog: "backlog_health",
      };

      const m = dashData.jira_metrics;

      const geminiInputs: GeminiKPIInput[] = drillResults
        .filter((k) => drillHasData(k.drill) && k.id !== "worked_on_holidays")
        .map((k) => {
          const valKey = valKeyMap[k.id] ?? k.id;
          const val = m[valKey as keyof typeof m];
          const momKey = `mom_${valKey}` as keyof typeof m;
          const momVal = m[momKey] as { change_pct?: number } | undefined;
          return {
            kpi_id: k.id,
            kpi_name: k.name,
            employee_name: displayName,
            current_value: val as string | number,
            mom_change: momVal?.change_pct != null
              ? `${momVal.change_pct > 0 ? "+" : ""}${momVal.change_pct}%`
              : "0%",
            percentile: scoreResult.kpi_percentiles[valKey] ?? 50,
            trend: (scoreResult.kpi_percentiles[valKey] ?? 50) > 50 ? "Healthy" : "Needs attention",
            drilldown_data: {
              issue_type_distribution: Object.fromEntries(
                (k.drill.breakdown_by_type ?? []).map((d: { name: string; count: number }) => [d.name, d.count])
              ),
              priority_distribution: Object.fromEntries(
                (k.drill.breakdown_by_priority ?? []).map((d: { name: string; count: number }) => [d.name, d.count])
              ),
              aging_buckets: Object.fromEntries(
                (k.drill.backlog_buckets ?? k.drill.resolution_buckets ?? []).map(
                  (d: { bucket: string; count: number }) => [d.bucket, d.count]
                )
              ),
              top_aging_issue_keys: (k.drill.issues ?? []).slice(0, 5).map((i: { issue_key: string }) => i.issue_key),
              slowest_issue_keys: (k.drill.slowest_issues ?? []).slice(0, 5).map((i: { issue_key: string }) => i.issue_key),
              reopened_issue_keys: (k.drill.reopened_issues ?? []).slice(0, 5).map((i: { issue_key: string }) => i.issue_key),
              inactive_dates: (k.drill.activity_calendar ?? []).filter((d: { active: boolean }) => !d.active).map((d: { date: string }) => d.date),
              daily_distribution: (k.drill.daily_closures ?? []).map((d: { date: string; closed: number }) => ({ date: d.date, value: d.closed })),
            },
          };
        });

      let insightsBatch: InsightResponse = { kpi_insights: {}, overall_summary: { summary: "", strengths: [], concerns: [] } };
      if (geminiInputs.length > 0) {
        const aiRes = await fetch("/reports/api/ai/insight", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-gemini-key": localStorage.getItem("custom_gemini_key") || ""
          },
          body: JSON.stringify({
            kpis: geminiInputs,
            summary_meta: {
              employee_name: displayName,
              score: scoreResult.final_score,
              band: scoreResult.band,
              factor_scores: scoreResult.factor_scores,
            },
          }),
        });

        if (aiRes.ok) {
          insightsBatch = await aiRes.json();
        } else {
          const errData = await aiRes.json().catch(() => ({}));
          throw new Error(errData.error || "AI Insight generation failed");
        }
      }

      setOverallSummary(insightsBatch.overall_summary);

      const reports: KPIReportData[] = drillResults.map((k) => ({
        ...k,
        hasData: drillHasData(k.drill),
        insight: insightsBatch.kpi_insights[k.id] ?? { interpretation: "Detail unavailable", suggestion: "N/A" },
      }));

      setKpiReports(reports);
      setLoading(false);

      setTimeout(() => {
        if (typeof document !== "undefined") document.body.setAttribute("data-ready", "true");
      }, 4000);

    } catch (e) {
      console.error("Report generation failed", e);
      setError(e instanceof Error ? e.message : "Failed to load report data.");
      setLoading(false);
      // DO NOT set data-ready to true here. 
      // This stops PDF generation as it will timeout waiting for the signal.
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, month, projectKey, displayName]);

  const handleUpdateKey = () => {
    if (!tempKey.trim()) return;
    localStorage.setItem("custom_gemini_key", tempKey.trim());
    setTempKey("");
    fetchAll();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <Loader2 className="animate-spin text-gray-400" size={28} />
        <p className="text-xs text-gray-400 uppercase tracking-widest">Generating Report…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-sm px-6">
          <AlertTriangle className="text-red-500 mx-auto mb-4" size={32} />
          <h2 className="text-lg font-bold text-gray-900 mb-2">PDF Generation Failed</h2>
          <p className="text-sm text-gray-600 mb-6">{error ?? "Critical Error"}</p>

          {showKeyModal ? (
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 shadow-sm animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-2 mb-3 text-blue-600">
                <Key size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Replace API Key</span>
              </div>
              <input
                type="text"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="Paste new Gemini API Key here..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-3"
              />
              <button
                onClick={handleUpdateKey}
                disabled={!tempKey.trim()}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                <RefreshCcw size={14} /> Update & Retry
              </button>
            </div>
          ) : (
            <button
              onClick={() => fetchAll()}
              className="flex items-center justify-center gap-2 mx-auto bg-gray-900 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-black transition-all"
            >
              <RefreshCcw size={16} /> Retry Discovery
            </button>
          )}
        </div>
      </div>
    );
  }

  const visibleKpiReports = kpiReports.filter((r) => r.hasData);
  const cal = data.calendar_summary;
  const monthLabel = format(new Date(`${month}-01`), "MMMM yyyy");
  let pageCounter = 3;

  return (
    <div
      className="bg-gray-100 font-sans text-gray-900 antialiased relative"
      style={{ width: A4_W, margin: "0 auto" }}
    >
      {/* Manual Key Setting — Floating (Hidden in Print) */}
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2 print:hidden">
        <button
          onClick={() => {
            setShowKeyModal(!showKeyModal);
            if (!showKeyModal) setTempKey(localStorage.getItem("custom_gemini_key") || "");
          }}
          className="bg-white/90 backdrop-blur-sm border border-gray-200 p-2 rounded-full shadow-lg hover:bg-white transition-all text-gray-500 hover:text-blue-600"
          title="Gemini API Settings"
        >
          <Key size={18} />
        </button>
        {showKeyModal && !error && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xl w-64 animate-in slide-in-from-right-4 duration-300">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-wider">Custom Gemini API Key</p>
            <input
              type="text"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="Paste custom key..."
              className="w-full text-xs px-3 py-2 border border-blue-50 bg-blue-50/10 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <div className="flex gap-2">
              <button
                onClick={handleUpdateKey}
                disabled={!tempKey.trim()}
                className="flex-1 bg-blue-600 text-white text-[10px] font-bold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                SAVE & RELOAD
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("custom_gemini_key");
                  setShowKeyModal(false);
                  setTempKey("");
                  fetchAll();
                }}
                className="px-3 bg-gray-50 text-gray-400 text-[10px] font-bold py-2 rounded-lg hover:bg-red-50 hover:text-red-500 transition-all"
                title="Clear key and use default"
              >
                RESET
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @page { margin: 0; size: A4 portrait; }
        @media print {
          html, body { margin: 0; padding: 0; background: white; }
          .bg-gray-100 { background: white !important; }
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════════
          PAGE 1 — Cover: Meta · Score · KPIs · Calendar · AI Summary
      ══════════════════════════════════════════════════════════════════════ */}
      <PageShell pageNum={1} fixed breakBefore={false}>

        {/* ── Meta + Score row ── */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          padding: "10px 14px",
          backgroundColor: "#f1f5f9",
          borderRadius: 6,
          borderLeft: `4px solid ${NAVY}`,
          marginBottom: 10,
          flexShrink: 0,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 20px", flex: 1 }}>
            {[
              { label: "Employee", value: displayName },
              { label: "Project", value: projectsLabel || projectKey || "All Projects" },
              { label: "Period", value: monthLabel },
              { label: "Generated", value: format(new Date(), "dd MMM yyyy") },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 7.5, color: SLATE, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>
                  {label}
                </div>
                <div style={{ fontSize: 12, color: NAVY, fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>
          {scoreDetails && (
            <ScoreBadge
              score={scoreDetails.score}
              band={scoreDetails.band}
              color={scoreDetails.color}
            />
          )}
        </div>

        {/* ── KPI Strip — fills available vertical space ── */}
        <div style={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          marginBottom: 6,
        }}>
          <SectionLabel text="Key Performance Indicators" />
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div className="grid grid-cols-3 gap-4 h-full" style={{
              transform: "scale(0.88)",
              transformOrigin: "top center",
            }}>
              {data.kpi_cards
                .filter(card => card.label !== "Worked on Holidays")
                .map((card) => (
                  <KPICard key={card.label} card={card} />
                ))}
            </div>
          </div>
        </div>

        {/* ── Summary & Calendar Section — Anchored to bottom ── */}
        <div style={{ flexShrink: 0, marginTop: "auto" }}>
          {/* ── AI Overall Summary ── */}
          {overallSummary && (
            <div style={{ marginBottom: 8 }}>
              <OverallSummaryBlock summary={overallSummary} />
            </div>
          )}

          {/* ── Calendar Table ── */}
          <div>
            <SectionLabel text={`Monthly Calendar — ${monthLabel}`} />
            <CalTable cal={cal} />
          </div>
        </div>

      </PageShell>

      {/* ══════════════════════════════════════════════════════════════════════
          PAGE 2 — Trend Charts 2×2
      ══════════════════════════════════════════════════════════════════════ */}
      <PageShell pageNum={2} fixed>
        <SectionLabel text="Performance Trends — Last 6 Months" />
        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 12,
          minHeight: 0,
        }}>
          {[
            { title: "Monthly Output Velocity", chart: <OutputTrendChart data={data.trends.output_trend} animate={false} /> },
            { title: "Resolution Speed (Days)", chart: <ResolutionTrendChart data={data.trends.resolution_trend} animate={false} /> },
            { title: "Stability Trend (%)", chart: <StabilityTrendChart data={data.trends.stability_trend} animate={false} /> },
            { title: "Backlog Aging Distribution", chart: <BacklogAgingChart data={data.trends.backlog_aging} animate={false} /> },
          ].map(({ title, chart }) => (
            <div key={title} style={{
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              minHeight: 0,
            }}>
              <p style={{
                fontSize: 8, fontWeight: 700, color: SLATE,
                textTransform: "uppercase", letterSpacing: 1,
                marginBottom: 6, flexShrink: 0,
              }}>{title}</p>
              <div style={{ flex: 1, minHeight: 0 }}>{chart}</div>
            </div>
          ))}
        </div>
      </PageShell>

      {/* ══════════════════════════════════════════════════════════════════════
          PAGES 3+ — KPI Detail pages (natural flow, content pushes new pages)
      ══════════════════════════════════════════════════════════════════════ */}
      {visibleKpiReports.map((report) => {
        const pg = pageCounter++;
        return (
          <PageShell key={report.id} pageNum={pg}>

            {/* KPI heading */}
            <div style={{
              borderBottom: `2px solid ${NAVY}`,
              paddingBottom: 8,
              marginBottom: 14,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <h2 style={{
                fontSize: 11, fontWeight: 800, color: NAVY,
                textTransform: "uppercase", letterSpacing: 1.6, margin: 0,
              }}>
                KPI: {report.name}
              </h2>
            </div>

            {/* L2 drilldown */}
            <div style={{ marginBottom: 14 }}>
              <Level2View
                data={report.drill}
                target={{ kpi: report.id as never, label: report.name, month, assigneeId: employeeId }}
                isReport={true}
              />
            </div>

            {/* L3 issue detail */}
            {report.id !== "throughput" && report.id !== "worked_on_holidays" && (
              <div style={{ marginBottom: 14, paddingTop: 10, borderTop: "1px solid #e2e8f0" }}>
                <SectionLabel text="Issue-Level Detail" />
                <Level3View data={report.drillL3} context={null} isReport={true} />
              </div>
            )}

            {/* Interpretation */}
            {report.id !== "worked_on_holidays" && report.insight.interpretation && (
              <div style={{ paddingTop: 10, borderTop: "1px solid #e2e8f0", marginBottom: 10 }}>
                <SectionLabel text="Interpretation" />
                <div style={{ fontSize: 10.5, lineHeight: 1.7, color: "#374151" }}>
                  {report.insight.interpretation.split("\n").filter(Boolean).map((line: string, i: number) => (
                    <p key={i} style={{ margin: "3px 0", paddingLeft: line.startsWith("•") ? 6 : 0 }}>{line}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation */}
            {report.id !== "worked_on_holidays" && report.insight.suggestion && (
              <div style={{ paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                <SectionLabel text="Recommendation" />
                <div style={{ fontSize: 10.5, lineHeight: 1.7, color: "#374151" }}>
                  {report.insight.suggestion.split("\n").filter(Boolean).map((line: string, i: number) => (
                    <p key={i} style={{ margin: "3px 0", paddingLeft: line.startsWith("•") ? 6 : 0 }}>{line}</p>
                  ))}
                </div>
              </div>
            )}

          </PageShell>
        );
      })}

      {/* ══════════════════════════════════════════════════════════════════════
          FINAL PAGE — Guide to Metrics
      ══════════════════════════════════════════════════════════════════════ */}
      <PageShell pageNum={pageCounter++} fixed>
        <div style={{
          borderBottom: `2px solid ${NAVY}`,
          paddingBottom: 8,
          marginBottom: 14,
          flexShrink: 0,
        }}>
          <h2 style={{
            fontSize: 11, fontWeight: 800, color: NAVY,
            textTransform: "uppercase", letterSpacing: 1.6, margin: 0,
          }}>
            Educational Reference: Guide to Metrics
          </h2>
        </div>

        <div style={{ flex: 1, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
            <thead>
              <tr style={{ backgroundColor: NAVY }}>
                <th style={{ padding: "8px 12px", color: "#fff", textAlign: "left", width: "120px" }}>Metric</th>
                <th style={{ padding: "8px 12px", color: "#fff", textAlign: "left" }}>Definition</th>
                <th style={{ padding: "8px 12px", color: "#fff", textAlign: "left", width: "160px" }}>Performance Context</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Issues Closed", def: "The total volume of Jira issues successfully resolved within the assessment period.", context: "Measures overall throughput and delivery capacity." },
                { name: "Avg Res. Time", def: "The average number of working days taken to resolve an issue from creation.", context: "Indicates delivery speed and responsiveness." },
                { name: "Output Velocity", def: "A measurement of daily throughput intensity (Issues per Working Day).", context: "Peak performance tiers maintain >0.6 issues/day." },
                { name: "Stability Score", def: "Measures process reliability by tracking bug reopen rates.", context: "High stability (>85%) indicates strong internal quality control." },
                { name: "Consistency", def: "Analyzes the predictability of daily activity patterns.", context: "Ensures steady delivery without disruptive bottlenecks." },
                { name: "Backlog Health", def: "Evaluates the age and distribution of unresolved work.", context: "Focuses on preventing technical debt and stale tasks." },
                { name: "Efficiency Index", def: "A balanced multiplier comparing speed relative to volume.", context: "Optimizes for high-quality, high-speed delivery." },
                { name: "Focus Ratio", def: "Concentration on core development vs supporting tasks.", context: "Helps identify hidden context switching or process overhead." },
              ].map((m, i) => (
                <tr key={m.name} style={{ backgroundColor: i % 2 === 0 ? "#f8fafc" : "#fff", borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: NAVY }}>{m.name}</td>
                  <td style={{ padding: "8px 12px", color: "#334155", lineHeight: 1.4 }}>{m.def}</td>
                  <td style={{ padding: "8px 12px", color: SLATE, fontSize: 8.5 }}>{m.context}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageShell>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="p-20 text-center text-xs text-gray-400 uppercase tracking-widest">
        Loading Report Engine…
      </div>
    }>
      <ReportContent />
    </Suspense>
  );
}
