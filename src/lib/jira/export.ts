"use client";

import type { DashboardData, KPICard, BacklogAgingBucket } from "@/types";
import { format } from "date-fns";
import { calculateEnterpriseScore, getBand } from "./scoring";
import type { DrillResponse, DrillIssueRow } from "@/app/reports/api/drill/[kpi]/route";
import { generateKPIInsight, type KPIInsightInput } from "./ai-engine";

// ─── PDF Export ────────────────────────────────────────────────────────────────

const DATE_PALETTE_RGB: { bar: [number, number, number], row: [number, number, number] }[] = [
  { bar: [16, 185, 129], row: [209, 250, 229] }, // 01
  { bar: [59, 130, 246], row: [219, 234, 254] }, // 02
  { bar: [79, 70, 229], row: [224, 231, 255] }, // 03
  { bar: [139, 92, 246], row: [237, 233, 254] }, // 04
  { bar: [245, 158, 11], row: [254, 243, 199] }, // 05
  { bar: [244, 63, 94], row: [255, 241, 242] }, // 06
  { bar: [6, 182, 212], row: [207, 250, 254] }, // 07
  { bar: [217, 70, 239], row: [250, 232, 255] }, // 08
  { bar: [249, 115, 22], row: [255, 237, 213] }, // 09
  { bar: [132, 204, 22], row: [247, 254, 231] }, // 10
  { bar: [14, 165, 233], row: [224, 242, 254] }, // 11
  { bar: [20, 184, 166], row: [204, 251, 241] }, // 12
  { bar: [236, 72, 153], row: [253, 226, 243] }, // 13
  { bar: [168, 85, 247], row: [245, 208, 254] }, // 14
  { bar: [239, 68, 68], row: [254, 226, 226] }, // 15
  { bar: [234, 179, 8], row: [254, 252, 232] }, // 16
  { bar: [5, 150, 105], row: [167, 243, 208] }, // 17
  { bar: [37, 99, 235], row: [191, 219, 254] }, // 18
  { bar: [75, 74, 192], row: [199, 210, 254] }, // 19
  { bar: [124, 58, 237], row: [221, 214, 254] }, // 20
  { bar: [225, 29, 72], row: [255, 228, 230] }, // 21
  { bar: [8, 145, 178], row: [165, 243, 252] }, // 22
  { bar: [192, 38, 211], row: [245, 208, 254] }, // 23
  { bar: [234, 88, 12], row: [255, 237, 213] }, // 24
  { bar: [101, 163, 13], row: [217, 249, 157] }, // 25
  { bar: [2, 132, 199], row: [186, 230, 253] }, // 26
  { bar: [13, 148, 136], row: [153, 246, 228] }, // 27
  { bar: [219, 39, 119], row: [251, 207, 232] }, // 28
  { bar: [147, 51, 234], row: [233, 213, 255] }, // 29
  { bar: [220, 38, 38], row: [254, 202, 202] }, // 30
  { bar: [217, 119, 6], row: [254, 215, 170] }, // 31
];

function getDateColorRGB(dateStr: string | null | undefined) {
  if (!dateStr) return { bar: [241, 245, 249] as [number, number, number], row: null };
  const dayMatch = dateStr.match(/(\d{2})$/);
  const day = dayMatch ? parseInt(dayMatch[1], 10) : 1;
  const index = (day - 1) % DATE_PALETTE_RGB.length;
  return DATE_PALETTE_RGB[index];
}

export async function exportToPDF(
  data: DashboardData,
  employeeId: string,
  monthLabel: string,
  displayName?: string,
  projectKey?: string,
  captures: Record<string, string> = {}
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;

  // ── Colors
  const GRAY = [100, 116, 139] as [number, number, number];
  const LIGHT_GRAY = [203, 213, 225] as [number, number, number];
  const BLACK = [15, 23, 42] as [number, number, number];
  const BLUE = [37, 99, 235] as [number, number, number];

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA FETCHING & SCORING
  // ─────────────────────────────────────────────────────────────────────────────

  async function fetchDrill(kpi: string, level: number = 2) {
    const params = new URLSearchParams({
      month: format(new Date(`${monthLabel}-01`), "yyyy-MM"),
      assignee_id: employeeId,
      project_key: projectKey ?? "",
      level: String(level),
    });
    const res = await fetch(`/reports/api/drill/${kpi}?${params.toString()}`);
    return (await res.json()) as DrillResponse;
  }

  // Pre-fetch all necessary drill data for the insights engine
  const [
    closedDrill, resDrill, velocityDrill, stabilityDrill,
    throughputDrill, backlogDrill, holidayDrill
  ] = await Promise.all([
    fetchDrill("issues_closed", 3),
    fetchDrill("resolution_time", 3),
    fetchDrill("output_velocity", 3),
    fetchDrill("stability", 3),
    fetchDrill("throughput", 2),
    fetchDrill("backlog", 3),
    fetchDrill("worked_on_holidays", 2)
  ]);

  const score = calculateEnterpriseScore(data, { closedDrill, resDrill, backlogDrill });
  const band = getBand(score.final_score);

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  function drawArc(x: number, y: number, r: number, startAngle: number, endAngle: number, color: [number, number, number], width: number = 5) {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    const segments = 40;
    const step = (endAngle - startAngle) / segments;
    for (let i = 0; i < segments; i++) {
      const a1 = startAngle + i * step;
      const a2 = startAngle + (i + 1) * step;
      doc.line(
        x + r * Math.cos(a1), y + r * Math.sin(a1),
        x + r * Math.cos(a2), y + r * Math.sin(a2)
      );
    }
  }

  function addHeader(title: string = "Employee Productivity Assessment") {
    doc.setFillColor(...BLACK);
    doc.rect(0, 0, pageW, 25, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("ProposalForge", marginL, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(title, marginL, 18);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("CONFIDENTIAL", pageW - marginR, 15, { align: "right" });
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.5);
    doc.line(marginL, 21, pageW - marginR, 21);
  }

  function addFooter() {
    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      const footerY = pageH - 12;
      doc.text(`Page ${i} of ${pageCount}`, marginL, footerY);
      doc.text("ProposalForge Productivity System", pageW / 2, footerY, { align: "center" });
      doc.text("Confidential Performance Data", pageW - marginR, footerY, { align: "right" });
    }
  }

  function sectionHeader(title: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLACK);
    doc.text(title.toUpperCase(), marginL, y);
    y += 2;
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.8);
    doc.line(marginL, y, marginL + 15, y);
    y += 8;
  }

  const fmtMoM = (mom: { change_pct: number | null } | undefined) => {
    if (!mom || mom.change_pct === null) return "—";
    const up = mom.change_pct > 0;
    const abs = Math.abs(mom.change_pct);
    return `${up ? "↑ +" : "↓ -"}${abs}%`;
  };

  const fmtNum = (v: any, unit: string = "") => {
    if (v === null || v === undefined) return "0" + (unit ? " " + unit : "");
    if (typeof v === "string") return v + unit;
    const num = Number(v);
    if (isNaN(num)) return "0" + (unit ? " " + unit : "");
    const str = Number.isInteger(num) ? num.toLocaleString() : num.toFixed(1);
    return str + (unit ? " " + unit : "");
  };

  let y = 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 1: COVER & EXECUTIVE SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────
  addHeader();
  y = 45;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text("EMPLOYEE ASSESSMENT COVER", marginL, y);
  y += 8;

  const details = [
    ["Employee Name:", displayName ?? employeeId],
    ["Role / ID:", employeeId],
    ["Project Context:", projectKey ?? "All Projects"],
    ["Assessment Period:", monthLabel],
    ["Generated Date:", format(new Date(), "d MMMM yyyy")],
  ];

  details.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BLACK);
    doc.text(label, marginL, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, marginL + 40, y);
    y += 7;
  });

  // Gauge Position
  const gaugeX = pageW - marginR - 35;
  const gaugeY = 65;
  const radius = 25;
  drawArc(gaugeX, gaugeY, radius, Math.PI, 2 * Math.PI, [241, 245, 249]);
  const scoreColor = (band as any).color;
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b] as [number, number, number];
  };
  const rgbColor = hexToRgb(scoreColor);
  const angle = (score.final_score / 100) * Math.PI;
  drawArc(gaugeX, gaugeY, radius, Math.PI, Math.PI + angle, rgbColor);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...BLACK);
  doc.text(String(score.final_score), gaugeX, gaugeY - 5, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text("OVERALL PERFORMANCE", gaugeX, gaugeY + 5, { align: "center" });
  doc.setFontSize(12);
  doc.setTextColor(...rgbColor);
  doc.text(score.band.toUpperCase(), gaugeX, gaugeY + 12, { align: "center" });
  // 1. Performance Bands Reference (Middle)
  y = 105;
  sectionHeader("PERFORMANCE BANDS REFERENCE");
  const bandTable = [
    ["90–100", "Excellent", "Top-tier performance, optimized workflow."],
    ["75–89", "Strong", "High-impact delivery with consistent quality."],
    ["60–74", "Average", "Meeting standard productivity benchmarks."],
    ["40–59", "Developing", "Opportunity for process optimization."],
    ["Below 40", "At Risk", "Urgent operational support required."],
  ];
  autoTable(doc, {
    startY: y,
    head: [["Score Range", "Label", "Description"]],
    body: bandTable,
    margin: { left: marginL, right: marginR },
    theme: "grid",
    headStyles: { fillColor: BLACK, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
  });

  // 2. Executive Summary and Calendar — Pushed to Bottom of Page 1 (Dynamic Height)
  const summaryTextSnippet = `Overall Performance Standing: ${displayName ?? employeeId} is currently performing at a ${score.band} level with a normalized score of ${score.final_score}/100. ` +
    `Key Strength: ${score.factor_scores.output > 70 ? "Consistently high delivery volume and output velocity." : "Strong focus on quality and stable issue resolution."} ` +
    `Key Risk: ${score.risks.burnout === "Elevated" ? "High workload intensity may lead to burnout." : score.risks.process === "Elevated" ? "Process bottlenecks in resolution speed detected." : "Maintaining consistent daily activity patterns."} ` +
    `Operational Recommendation: ${score.recommendations[0] || "Continue current workflow patterns with focus on high-impact backlog items."}`;

  const summaryLines = doc.splitTextToSize(summaryTextSnippet, contentW);
  const summaryHeight = (summaryLines.length * 5) + 12; // lines + header + spacing
  const calendarHeight = data.calendar_summary ? 38 : 0;
  const totalBottomHeight = summaryHeight + calendarHeight + 15;

  // Anchor to bottom (pageH is ~297, footer is at ~285)
  y = pageH - totalBottomHeight - 15;

  // Guard against overlapping with Bands Reference (which usually ends around 160-170)
  const lastTableY = (doc as any).lastAutoTable.finalY || 160;
  if (y < lastTableY + 10) {
    y = lastTableY + 10; // Fallback if summary is HUGE
  }

  sectionHeader("EXECUTIVE SUMMARY");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(summaryLines, marginL, y);
  y += (summaryLines.length * 5) + 6;

  // Monthly Calendar Summary
  if (data.calendar_summary) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(`MONTHLY CALENDAR — ${monthLabel.toUpperCase()}`, marginL, y);
    y += 4;

    const cal = data.calendar_summary;
    const calTable = [
      ["Total Calendar Days", String(cal.total_days_in_month)],
      ["Weekends", String(cal.weekends)],
      ["Public Holidays", String(cal.public_holidays)],
      ["Leave Days", String(cal.leave_days)],
      ["Working Days", String(cal.working_days)],
    ];

    autoTable(doc, {
      startY: y,
      body: calTable,
      margin: { left: marginL, right: marginR },
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 40, textColor: GRAY },
        1: { cellWidth: 20, fontStyle: "bold", halign: "center" }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 2-4: DASHBOARD EXPORT
  // ─────────────────────────────────────────────────────────────────────────────
  doc.addPage();
  addHeader("Dashboard Fidelity Export");
  y = 35;
  sectionHeader("DASHBOARD STATE");

  if (captures["pdf-kpi-strip"]) {
    const imgProps = doc.getImageProperties(captures["pdf-kpi-strip"]);
    const imgH = (imgProps.height * contentW) / imgProps.width;
    doc.addImage(captures["pdf-kpi-strip"], "PNG", marginL, y, contentW, imgH);
    y += imgH + 10;
  }

  if (captures["pdf-alerts"]) {
    const imgProps = doc.getImageProperties(captures["pdf-alerts"]);
    const imgH = (imgProps.height * contentW) / imgProps.width;
    if (y + imgH > 270) { doc.addPage(); addHeader(); y = 35; }
    doc.addImage(captures["pdf-alerts"], "PNG", marginL, y, contentW, imgH);
    y += imgH + 10;
  }

  doc.addPage();
  addHeader("Dashboard Fidelity Export · Trends");
  y = 35;

  const trendBlocks = [
    { id: "pdf-trend-output", label: "MONTHLY OUTPUT" },
    { id: "pdf-trend-resolution", label: "RESOLUTION SPEED" },
    { id: "pdf-trend-stability", label: "STABILITY SCORE" },
    { id: "pdf-trend-backlog", label: "BACKLOG AGING" }
  ];

  for (const block of trendBlocks) {
    if (captures[block.id]) {
      const imgProps = doc.getImageProperties(captures[block.id]);
      const imgW = contentW / 2 - 5;
      const imgH = (imgProps.height * imgW) / imgProps.width;

      const col = trendBlocks.indexOf(block) % 2;
      const row = Math.floor(trendBlocks.indexOf(block) / 2);

      const px = marginL + col * (imgW + 10);
      const py = 35 + row * (imgH + 15);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(block.label, px, py - 2);
      doc.addImage(captures[block.id], "PNG", px, py, imgW, imgH);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INSIGHTS SECTION (ONE PAGE PER KPI)
  // ─────────────────────────────────────────────────────────────────────────────
  const kpiList = [
    { name: "Issues Closed", id: "issues_closed", drill: closedDrill },
    { name: "Avg Resolution Time", id: "resolution_time", drill: resDrill },
    { name: "Output Velocity", id: "output_velocity", drill: velocityDrill },
    { name: "Efficiency Index", id: "efficiency_index", drill: resDrill },
    { name: "Focus Ratio", id: "focus_ratio", drill: closedDrill },
    { name: "Stability Score", id: "stability", drill: stabilityDrill },
    { name: "Throughput Consistency", id: "throughput", drill: throughputDrill },
    { name: "Low Activity Days", id: "low_activity_days", drill: throughputDrill },
    { name: "Backlog Health", id: "backlog", drill: backlogDrill },
    { name: "Worked on Holidays", id: "worked_on_holidays", drill: holidayDrill }
  ];

  for (const kpi of kpiList) {
    doc.addPage();
    addHeader(`KPI Analysis: ${kpi.name}`);
    y = 35;
    sectionHeader(`KPI ANALYSIS: ${kpi.name}`);

    // Embed Drilldown Capture
    const drillKey = `drill-${kpi.id === "efficiency_index" ? "resolution_time" :
      kpi.id === "focus_ratio" ? "issues_closed" :
        kpi.id === "low_activity_days" ? "throughput" : kpi.id}`;

    if (captures[drillKey]) {
      const imgProps = doc.getImageProperties(captures[drillKey]);
      const imgH = (imgProps.height * contentW) / imgProps.width;
      doc.addImage(captures[drillKey], "PNG", marginL, y, contentW, imgH);
      y += imgH + 10;
    }

    const m = data.jira_metrics;
    let valKey = kpi.id;
    if (kpi.id === "resolution_time") valKey = "avg_resolution_time_days";
    if (kpi.id === "stability") valKey = "stability_score";
    if (kpi.id === "throughput") valKey = "throughput_consistency";
    if (kpi.id === "backlog") valKey = "backlog_health";
    const val = m[valKey as keyof typeof m] as any;
    const mom = m[`mom_${kpi.id === "stability" ? "stability_score" : kpi.id === "resolution_time" ? "resolution_time" : kpi.id}` as keyof typeof m] as any;
    const pct = score.kpi_percentiles[valKey] || 50;

    // AI Generation Input
    const aiInput: KPIInsightInput = {
      kpi_name: kpi.name,
      current_value: fmtNum(val),
      mom_change: fmtMoM(mom),
      percentile: pct,
      trend: pct > 50 ? "Healthy" : "Volatile",
      drilldown: {
        issue_type_distribution: Object.fromEntries(kpi.drill.breakdown_by_type?.map(d => [d.name, d.count]) || []),
        priority_distribution: Object.fromEntries(kpi.drill.breakdown_by_priority?.map(d => [d.name, d.count]) || []),
        aging_buckets: Object.fromEntries(kpi.drill.backlog_buckets?.map(d => [d.bucket, d.count]) || kpi.drill.resolution_buckets?.map(d => [d.bucket, d.count]) || []),
        top_aging_issues: kpi.drill.issues?.slice(0, 5) || [],
        slowest_issues: kpi.drill.slowest_issues?.slice(0, 5) || [],
        reopened_issues: kpi.drill.reopened_issues || [],
        inactive_dates: kpi.drill.activity_calendar?.filter(d => !d.active).map(d => d.date) || [],
        daily_output_distribution: kpi.drill.daily_closures || []
      }
    };

    const insight = await generateKPIInsight(aiInput);

    if (y > 220) { doc.addPage(); addHeader(); y = 35; }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("INTERPRETATION", marginL, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const intLines = doc.splitTextToSize(insight.interpretation, contentW);
    doc.text(intLines, marginL, y);
    y += (intLines.length * 5) + 10;

    if (y > 240) { doc.addPage(); addHeader(); y = 35; }

    doc.setFont("helvetica", "bold");
    doc.text("STRATEGIC SUGGESTION", marginL, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const sugLines = doc.splitTextToSize(insight.suggestion, contentW);
    doc.text(sugLines, marginL, y);
    y += (sugLines.length * 5) + 10;

    // Evidence List (Optional Detail)
    const evidenceIssues = kpi.drill.issues || kpi.drill.slowest_issues || kpi.drill.reopened_issues || kpi.drill.bucket_issues || [];
    if (evidenceIssues.length > 0) {
      if (y > 230) { doc.addPage(); addHeader(); y = 35; }
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GRAY);
      doc.text("EVIDENCE DATASET (SAMPLING)", marginL, y);
      y += 4;

      const dailyCounts: Record<string, number> = {};
      if (kpi.id === "output_velocity" || kpi.id === "issues_closed") {
        for (const r of evidenceIssues) {
          if (r.completed_date) {
            dailyCounts[r.completed_date] = (dailyCounts[r.completed_date] || 0) + 1;
          }
        }
      }

      const getIssueColor = (issue: any, kpiId: string): [number, number, number] | null => {
        if (kpiId === "backlog") {
          const age = issue.age_days ?? (issue.created_date ? Math.floor((new Date().getTime() - new Date(issue.created_date).getTime()) / (1000 * 3600 * 24)) : 0);
          if (age <= 7) return [220, 252, 231]; // Green 100
          if (age <= 14) return [254, 249, 195]; // Yellow 100
          if (age <= 30) return [255, 237, 213]; // Orange 100
          return [254, 226, 226]; // Red 100
        }

        if (kpiId === "output_velocity" && issue.completed_date) {
          return getDateColorRGB(issue.completed_date).row;
        }

        if (["resolution_time", "efficiency_index", "focus_ratio"].includes(kpiId)) {
          const res = issue.resolution_time_days ?? 0;
          if (res <= 1) return [220, 252, 231]; // Green 100
          if (res <= 3) return [254, 249, 195]; // Yellow 100
          if (res <= 7) return [255, 237, 213]; // Orange 100
          return [254, 226, 226]; // Red 100
        }
        if (kpiId === "stability") {
          if (issue.reopened_flag) return [254, 243, 199]; // Amber 100
        }
        return null;
      };

      const tableData = evidenceIssues.slice(0, 15).map((i: any) => {
        const isBacklog = kpi.id === "backlog";
        const val = isBacklog
          ? (i.age_days ?? Math.floor((new Date().getTime() - new Date(i.created_date).getTime()) / (1000 * 3600 * 24)))
          : (i.resolution_time_days ?? 0);

        return {
          key: i.issue_key,
          summary: i.summary.substring(0, 50),
          type: i.issue_type,
          metric: val.toFixed(0) + "d",
          status: i.status,
          raw: i
        };
      });

      autoTable(doc, {
        startY: y,
        head: [["Issue Key", "Summary", "Type", kpi.id === "backlog" ? "Age" : "Res. Days", "Status"]],
        body: tableData.map(d => [d.key, d.summary, d.type, d.metric, d.status]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: BLACK },
        columnStyles: {
          0: { cellWidth: 32 }, // Issue Key
          1: { cellWidth: "auto" }, // Summary
          2: { cellWidth: 25 }, // Type
          3: { cellWidth: 28 }, // Res. Days
          4: { cellWidth: 30 }, // Status
        },
        margin: { left: marginL, right: marginR },
        didParseCell: (data) => {
          if (data.section === "body") {
            const rowIndex = data.row.index;
            const issue = tableData[rowIndex].raw;
            const bgColor = getIssueColor(issue, kpi.id);
            if (bgColor) {
              data.cell.styles.fillColor = bgColor;
            }
          }
        }
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  doc.addPage();
  addHeader("Educational Reference · Guide to Metrics");
  y = 35;
  sectionHeader("GUIDE TO PERFORMANCE METRICS");

  const metricGuide = [
    {
      name: "Issues Closed",
      formula: "Count of Done issues",
      def: "The total volume of Jira issues successfully resolved within the assessment period.",
      context: "Measures overall throughput and delivery capacity."
    },
    {
      name: "Avg Resolution Time",
      formula: "Σ Res Time / Issues Closed",
      def: "The average number of working days taken to resolve an issue from the moment of creation.",
      context: "Indicates delivery speed and responsiveness to new tasks."
    },
    {
      name: "Output Velocity",
      formula: "Issues Closed / Working Days",
      def: "A measurement of daily throughput intensity (Issues per Working Day).",
      context: "Highest performing tiers typically maintain >0.6 issues/day."
    },
    {
      name: "Stability Score",
      formula: "(1 - Reopened / Closed) × 100",
      def: "Measures the reliability of the delivery process by tracking bug reopen rates.",
      context: "High stability (>85%) indicates strong quality control and few regressions."
    },
    {
      name: "Throughput Consistency",
      formula: "Active Days / Total Days × 100",
      def: "Analyzes the predictability of daily activity patterns over the month.",
      context: "High consistency ensures steady delivery without disruptive bottlenecks."
    },
    {
      name: "Backlog Health",
      formula: "(Open >14d / Total Open) × 100",
      def: "A composite metric evaluating the age and distribution of pending/unresolved work.",
      context: "Focuses on preventing technical debt and stale tasks."
    },
    {
      name: "Efficiency Index",
      formula: "Issues Closed / Avg Res Time",
      def: "A balanced multiplier comparing resolution speed relative to total volume.",
      context: "Optimizes for high-quality, high-speed delivery."
    },
    {
      name: "Focus Ratio",
      formula: "(Closed / Assigned) × 100",
      def: "Measures concentration on core development vs supporting/operational tasks.",
      context: "Helps identify hidden context switching or process overhead."
    },
  ];

  autoTable(doc, {
    startY: y,
    head: [["Metric Name", "Formula", "Definition", "Performance Context"]],
    body: metricGuide.map(m => [m.name, m.formula, m.def, m.context]),
    margin: { left: marginL, right: marginR },
    theme: "grid",
    headStyles: { fillColor: BLACK, fontSize: 8 },
    bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: "bold" },
      1: { cellWidth: 40, fontStyle: "italic", textColor: [100, 100, 100] },
      2: { cellWidth: "auto" },
      3: { cellWidth: 40 }
    }
  });

  addFooter();
  const slug = (displayName ?? employeeId).replace(/\s+/g, "-").toLowerCase();
  doc.save(`Performance-Assessment-${slug}-${format(new Date(), "yyyy-MM")}.pdf`);
}

export function exportToWord(data: DashboardData, employeeId: string, monthLabel: string, displayName?: string, projectKey?: string): void {
  // Keeping simple export as fallback
}
