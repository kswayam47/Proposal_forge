"use client";

import type { JiraMetrics, MoMValue } from "@/types";
import type { DrillTarget } from "@/components/jira/dashboard/DrillDrawer";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function MoMBadge({ mom, invertGood = false }: { mom: MoMValue; invertGood?: boolean }) {
  if (mom.change_pct === null) return null;
  const up = mom.change_pct > 0;
  const good = invertGood ? !up : up;
  const flat = mom.change_pct === 0;
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  const color = flat ? "text-gray-400" : good ? "text-green-600" : "text-red-500";
  const sign = up ? "+" : "";
  return (
    <div className={`flex items-center gap-1 text-xs mt-1 ${color}`}>
      <Icon size={11} strokeWidth={2.5} />
      <span className="font-bold">{sign}{mom.change_pct}%</span>
      <span className="text-gray-400 font-normal">vs prev</span>
    </div>
  );
}

function Cell({
  label, value, unit, mom, invertGood, description, onClick,
}: {
  label: string;
  value: number;
  unit?: string;
  mom?: MoMValue;
  invertGood?: boolean;
  description?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      title={description}
      className={`bg-white rounded-xl border border-gray-100 px-4 py-3 flex flex-col gap-0.5 transition-colors
        ${onClick ? "cursor-pointer hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]" : ""}`}
    >
      <p className="text-[11px] font-semibold text-gray-400 tracking-widest uppercase">{label}</p>
      <div className="flex items-baseline gap-1 mt-1.5">
        <span className="text-2xl font-black text-gray-900 tabular-nums leading-tight">
          {Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)}
        </span>
        {unit && <span className="text-xs text-gray-400 font-medium">{unit}</span>}
      </div>
      {mom && <MoMBadge mom={mom} invertGood={invertGood} />}
      {mom && (
        <p className="text-[11px] text-gray-400 mt-0.5">
          Prev:{" "}
          <span className="font-semibold">
            {Number.isInteger(mom.previous) ? mom.previous.toLocaleString() : mom.previous.toFixed(1)}
            {unit ? ` ${unit}` : ""}
          </span>
        </p>
      )}
      {onClick && (
        <p className="text-[10px] text-blue-400 mt-1 font-medium">Click to drill down ›</p>
      )}
    </div>
  );
}

export function JiraMetricsGrid({
  metrics,
  onDrill,
}: {
  metrics: JiraMetrics;
  onDrill?: (target: Omit<DrillTarget, "month" | "assigneeId" | "projectKey">) => void;
}) {
  const drill = (kpi: DrillTarget["kpi"], label: string) =>
    onDrill ? () => onDrill({ kpi, label }) : undefined;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <Cell
        label="Issues Closed"
        value={metrics.issues_closed}
        mom={metrics.mom_issues_closed}
        description="Count of issues moved to Done within selected period"
        onClick={drill("issues_closed", "Issues Closed")}
      />
      <Cell
        label="Avg Resolution"
        value={metrics.avg_resolution_time_days}
        unit="days"
        mom={metrics.mom_resolution_time}
        invertGood
        description="Σ(resolution − created) / issues closed"
        onClick={drill("resolution_time", "Avg Resolution Time")}
      />
      <Cell
        label="Output Velocity"
        value={metrics.output_velocity}
        unit="iss/day"
        mom={metrics.mom_output_velocity}
        description="Issues closed ÷ working days"
        onClick={drill("output_velocity", "Output Velocity")}
      />
      <Cell
        label="Efficiency Index"
        value={metrics.efficiency_index}
        unit="iss/day"
        mom={metrics.mom_efficiency_index}
        description="Issues closed ÷ avg resolution days"
        onClick={drill("issues_closed", "Issues Closed · Efficiency Detail")}
      />
      <Cell
        label="Stability Score"
        value={metrics.stability_score}
        unit="%"
        mom={metrics.mom_stability_score}
        description="(1 − reopened ÷ closed) × 100"
        onClick={drill("stability", "Stability Score")}
      />
    </div>
  );
}
