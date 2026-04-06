"use client";

import { cn } from "@/lib/utils";
import type { KPICard as KPICardType } from "@/types";
import type { DrillTarget } from "@/components/jira/dashboard/DrillDrawer";
import { TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";

// ── Drill mapping ─────────────────────────────────────────────────────────────
// Maps KPI card labels (from metrics.ts buildKPICards) to DrillTarget kpi keys
const LABEL_TO_DRILL: Record<string, DrillTarget["kpi"]> = {
  "Issues Closed": "issues_closed",
  "Issues Resolved": "issues_closed",
  "Avg Resolution": "resolution_time",
  "Avg Resolution Time": "resolution_time",
  "Resolution Time": "resolution_time",
  "Output Velocity": "output_velocity",
  "Velocity": "output_velocity",
  "Stability Score": "stability",
  "Stability": "stability",
  "Reopen Rate": "stability",
  "Throughput Consistency": "throughput",
  "Throughput": "throughput",
  "Active Days": "throughput",
  "Consistency": "throughput",
  "Backlog Health": "backlog",
  "Backlog": "backlog",
  "Worked on Holidays": "worked_on_holidays",
  "Holiday Activity": "worked_on_holidays",
};

function clampPct(pct: number | null): number | null {
  if (pct === null) return null;
  return Math.max(-100, Math.min(100, pct));
}

const colorMap = {
  green: { value: "text-green-700", indicator: "bg-green-500", border: "border-gray-100", bg: "bg-white" },
  amber: { value: "text-amber-600", indicator: "bg-amber-400", border: "border-gray-100", bg: "bg-white" },
  red: { value: "text-red-600", indicator: "bg-red-500", border: "border-gray-100", bg: "bg-white" },
  neutral: { value: "text-gray-800", indicator: "bg-gray-300", border: "border-gray-100", bg: "bg-white" },
} as const;

interface KPICardProps {
  card: KPICardType;
  onDrill?: (target: Omit<DrillTarget, "month" | "assigneeId" | "projectKey">) => void;
}

export function KPICard({ card, onDrill }: KPICardProps) {
  const scheme = colorMap[card.color ?? "neutral"];
  const drillKey = LABEL_TO_DRILL[card.label];
  const clickable = !!(onDrill && drillKey);

  const rawPct = card.mom?.change_pct ?? null;
  const displayPct = clampPct(rawPct);
  const up = rawPct !== null && rawPct > 0;
  const flat = rawPct === 0;
  const invertGood =
    card.label.toLowerCase().includes("resolution") ||
    card.label.toLowerCase().includes("low activity");
  const positive = flat || displayPct === null ? null : invertGood ? !up : up;

  const TrendIcon = flat ? Minus : up ? TrendingUp : TrendingDown;
  const trendColorClass =
    displayPct === null || flat
      ? "text-gray-400"
      : positive
        ? "text-green-600"
        : "text-red-500";

  return (
    <div
      onClick={clickable ? () => onDrill!({ kpi: drillKey, label: card.label }) : undefined}
      className={cn(
        "relative rounded-3xl border px-6 py-6 flex flex-col gap-2 overflow-hidden transition-all duration-300 h-full min-h-[160px]",
        scheme.border,
        scheme.bg,
        clickable && "cursor-pointer hover:border-gray-200 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]"
      )}
    >
      <div className={cn("absolute top-0 left-0 right-0 h-0.5 rounded-t-xl", scheme.indicator)} />

      <div className="flex items-center justify-between pt-0.5">
        <p className="text-[11px] font-semibold text-gray-500 tracking-widest uppercase leading-tight">
          {card.label}
        </p>
        {clickable && <ChevronRight size={13} className="text-gray-300 shrink-0 -mr-1" />}
      </div>

      <div className="flex items-baseline gap-1 mt-auto">
        <span className={cn("text-4xl font-black tabular-nums tracking-tight leading-none", scheme.value)}>
          {typeof card.value === "number"
            ? Number.isInteger(card.value)
              ? card.value.toLocaleString()
              : card.value.toFixed(1)
            : card.value}
        </span>
        {card.unit && <span className="text-sm font-bold text-gray-400 mb-1">{card.unit}</span>}
      </div>

      {displayPct !== null && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100/60">
          <div className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold",
            positive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          )}>
            <TrendIcon size={10} strokeWidth={3} />
            <span>
              {up ? "+" : ""}
              {displayPct}%
            </span>
          </div>
          <span className="text-[10px] text-gray-400 font-medium">vs prev month</span>
        </div>
      )}

      {card.mom && (
        <p className="text-[11px] text-gray-400 mt-0.5">
          Last month:{" "}
          <span className="font-semibold text-gray-500">
            {Number.isInteger(card.mom.previous)
              ? card.mom.previous.toLocaleString()
              : card.mom.previous.toFixed(1)}
            {card.unit ?? ""}
          </span>
        </p>
      )}
    </div>
  );
}

interface KPIStripProps {
  cards: KPICardType[];
  onDrill?: (target: Omit<DrillTarget, "month" | "assigneeId" | "projectKey">) => void;
}

export function KPIStrip({ cards, onDrill }: KPIStripProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {cards.map((card) => (
        <KPICard key={card.label} card={card} onDrill={onDrill} />
      ))}
    </div>
  );
}
