"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import type { MonthlyTrendPoint, BacklogAgingBucket } from "@/types";
import type { DrillTarget } from "@/components/jira/dashboard/DrillDrawer";

// ─── Shared tooltip style ─────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    background: "rgba(255, 255, 255, 0.95)",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    fontSize: "12px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    padding: "12px",
    backdropFilter: "blur(8px)",
  },
  labelStyle: { fontWeight: 800, color: "#111827", marginBottom: 6, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" },
};

type OnDrill = (target: Omit<DrillTarget, "month" | "assigneeId" | "projectKey"> & { month?: string }) => void;

// ─── 1. Monthly Output Trend ─────────────────────────────────────────────────

export function OutputTrendChart({
  data,
  onDrill,
  animate = true,
}: {
  data: MonthlyTrendPoint[];
  onDrill?: OnDrill;
  animate?: boolean;
}) {
  return (
    <div
      className={onDrill ? "cursor-pointer group" : ""}
      title={onDrill ? "Click to drill down into Issues Closed" : undefined}
    >
      {onDrill && (
        <p className="text-[10px] text-blue-400 font-medium mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Click chart to drill down ›
        </p>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
          onClick={onDrill ? (e: any) => {
            const month = e?.activePayload?.[0]?.payload?.month_key || e?.activeLabel;
            onDrill({
              kpi: "issues_closed",
              label: "Issues Closed · Monthly Output",
              ...(month ? { month } : {})
            });
          } : undefined}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            {...tooltipStyle}
            formatter={(v: number) => [<span className="font-black text-gray-900">{v}</span>, "Issues Closed"]}
          />
          <Line
            isAnimationActive={animate}
            type="monotone"
            dataKey="value"
            stroke="#0f172a"
            strokeWidth={3}
            dot={{ r: 4, fill: "#0f172a", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 2. Resolution Speed Trend ───────────────────────────────────────────────

export function ResolutionTrendChart({
  data,
  onDrill,
  animate = true,
}: {
  data: MonthlyTrendPoint[];
  onDrill?: OnDrill;
  animate?: boolean;
}) {
  return (
    <div
      className={onDrill ? "cursor-pointer group" : ""}
      title={onDrill ? "Click to drill down into Resolution Time" : undefined}
    >
      {onDrill && (
        <p className="text-[10px] text-blue-400 font-medium mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Click chart to drill down ›
        </p>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
          onClick={onDrill ? (e: any) => {
            const month = e?.activePayload?.[0]?.payload?.month_key || e?.activeLabel;
            onDrill({
              kpi: "resolution_time",
              label: "Avg Resolution Time · Speed Trend",
              ...(month ? { month } : {})
            });
          } : undefined}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
          <Tooltip
            {...tooltipStyle}
            formatter={(v: number) => [<span className="font-black text-gray-900">{v.toFixed(1)} days</span>, "Avg Resolution"]}
          />
          <Line
            isAnimationActive={animate}
            type="monotone"
            dataKey="value"
            stroke="#f59e0b"
            strokeWidth={3}
            dot={{ r: 4, fill: "#f59e0b", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 3. Stability Score Trend ────────────────────────────────────────────────

export function StabilityTrendChart({
  data,
  onDrill,
  animate = true,
}: {
  data: MonthlyTrendPoint[];
  onDrill?: OnDrill;
  animate?: boolean;
}) {
  return (
    <div
      className={onDrill ? "cursor-pointer group" : ""}
      title={onDrill ? "Click to drill down into Stability Score" : undefined}
    >
      {onDrill && (
        <p className="text-[10px] text-blue-400 font-medium mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Click chart to drill down ›
        </p>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
          onClick={onDrill ? (e: any) => {
            const month = e?.activePayload?.[0]?.payload?.month_key || e?.activeLabel;
            onDrill({
              kpi: "stability",
              label: "Stability Score · Quality Trend",
              ...(month ? { month } : {})
            });
          } : undefined}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} domain={[0, 100]} />
          <Tooltip
            {...tooltipStyle}
            formatter={(v: number) => [<span className="font-black text-gray-900">{v.toFixed(1)}%</span>, "Stability Score"]}
          />
          <Line
            isAnimationActive={animate}
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 4. Backlog Aging Distribution ───────────────────────────────────────────

const AGING_COLORS: Record<string, string> = {
  "0-7": "#4ade80", // Green 400
  "8-14": "#facc15", // Yellow 400
  "15-30": "#fb923c", // Orange 400
  "30+": "#ef4444", // Red 500
};

export function BacklogAgingChart({
  data,
  onDrill,
  animate = true,
}: {
  data: BacklogAgingBucket[];
  onDrill?: OnDrill;
  animate?: boolean;
}) {
  return (
    <div
      className={onDrill ? "cursor-pointer group" : ""}
      title={onDrill ? "Click to drill down into Backlog Aging" : undefined}
    >
      {onDrill && (
        <p className="text-[10px] text-blue-400 font-medium mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Click chart to drill down ›
        </p>
      )}
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
          onClick={onDrill ? (e: any) => {
            const month = e?.activePayload?.[0]?.payload?.month_key || e?.activeLabel;
            onDrill({
              kpi: "backlog",
              label: "Backlog Health · Aging Distribution",
              ...(month ? { month } : {})
            });
          } : undefined}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            {...tooltipStyle}
            formatter={(v: number, name: string) => [v, `${name} days`]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, paddingTop: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}
          />
          <Bar isAnimationActive={animate} dataKey="0-7" stackId="a" fill={AGING_COLORS["0-7"]} stroke="#fff" strokeWidth={2} name="0–7" />
          <Bar isAnimationActive={animate} dataKey="8-14" stackId="a" fill={AGING_COLORS["8-14"]} stroke="#fff" strokeWidth={2} name="8–14" />
          <Bar isAnimationActive={animate} dataKey="15-30" stackId="a" fill={AGING_COLORS["15-30"]} stroke="#fff" strokeWidth={2} name="15–30" />
          <Bar isAnimationActive={animate} dataKey="30+" stackId="a" fill={AGING_COLORS["30+"]} stroke="#fff" strokeWidth={2} name="30+" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
