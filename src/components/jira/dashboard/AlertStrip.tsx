"use client";

import type { Alert } from "@/types";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertStyle = {
  bg: string;
  border: string;
  accent: string;
  text: string;
  Icon: LucideIcon;
};

const STYLES: Record<Alert["type"], AlertStyle> = {
  danger: {
    bg: "bg-red-50/50",
    border: "border-red-100",
    accent: "bg-red-500",
    text: "text-red-900",
    Icon: XCircle,
  },
  warning: {
    bg: "bg-amber-50/50",
    border: "border-amber-100",
    accent: "bg-amber-500",
    text: "text-amber-900",
    Icon: AlertTriangle,
  },
  success: {
    bg: "bg-emerald-50/50",
    border: "border-emerald-100",
    accent: "bg-emerald-500",
    text: "text-emerald-900",
    Icon: CheckCircle,
  },
  info: {
    bg: "bg-blue-50/50",
    border: "border-blue-100",
    accent: "bg-blue-500",
    text: "text-blue-900",
    Icon: Info,
  },
};

interface AlertStripProps {
  alerts: Alert[];
}

export function AlertStrip({ alerts }: AlertStripProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {alerts.map((alert) => {
        const { bg, border, accent, text, Icon } = STYLES[alert.type];
        return (
          <div
            key={alert.id}
            className={cn(
              "relative flex items-center gap-3 px-5 py-3.5 rounded-xl border text-[13px] font-semibold overflow-hidden shadow-sm",
              bg,
              border,
              text
            )}
          >
            <div className={cn("absolute left-0 top-0 bottom-0 w-1", accent)} />
            <Icon size={16} strokeWidth={2.5} className="flex-shrink-0 opacity-80" />
            <span className="leading-relaxed">{alert.message}</span>
          </div>
        );
      })}
    </div>
  );
}
