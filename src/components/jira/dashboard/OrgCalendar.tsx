"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import type { OrgCalendarDay } from "@/app/reports/api/calendar/route";

// ─── helpers ─────────────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate(); // month is 1-based
}
function firstDowOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay(); // 0 = Sun
}
function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── types ────────────────────────────────────────────────────────────────────

interface CalendarDay {
  date: string;
  day: number;
  isWeekend: boolean;
  dayType: "holiday" | "leave" | null;
  label: string | null;
  hasActivity: boolean;   // from Jira data (only used in throughput mode)
  closed: number;
  updated: number;
  created: number;
}

export interface ActivityDay {
  date: string;
  active: boolean;
  closed: number;
  updated: number;
  created: number;
}

interface Props {
  /** Year/month to display initially */
  initialYear?: number;
  initialMonth?: number;   // 1-based
  /** If provided the calendar shows activity overlay (throughput mode) */
  activityData?: ActivityDay[];
  /** Optional employee ID to fetch specific leaves */
  employeeId?: string | null;
  /** Called when user clicks an active/working day */
  onDayClick?: (date: string) => void;
  /** If false the marking UI is hidden (read-only mode) */
  allowMarking?: boolean;
  /** Called after a mark/unmark so parent can re-fetch metrics */
  onCalendarChange?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrgCalendar({
  initialYear,
  initialMonth,
  activityData,
  employeeId,
  onDayClick,
  allowMarking = true,
  onCalendarChange,
}: Props) {
  const now = new Date();
  const [year, setYear] = useState(initialYear ?? now.getFullYear());
  const [month, setMonth] = useState(initialMonth ?? now.getMonth() + 1);

  // org_calendar data for this month
  const [marked, setMarked] = useState<Map<string, OrgCalendarDay>>(new Map());
  const [loadingCal, setLoadingCal] = useState(false);

  // marking popover state
  const [popover, setPopover] = useState<{ date: string; label: string; dayType: "holiday" | "leave" } | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchMarked = useCallback(async () => {
    setLoadingCal(true);
    try {
      let url = `/reports/api/calendar?year=${year}&month=${month}`;
      if (employeeId) url += `&employee_id=${encodeURIComponent(employeeId)}`;
      const r = await fetch(url);
      const { days } = await r.json() as { days: OrgCalendarDay[] };
      const m = new Map<string, OrgCalendarDay>();
      for (const d of days) m.set(d.date, d);
      setMarked(m);
    } finally {
      setLoadingCal(false);
    }
  }, [year, month, employeeId]);

  useEffect(() => { fetchMarked(); }, [fetchMarked]);

  // build activity map
  const actMap = new Map<string, ActivityDay>();
  for (const d of activityData ?? []) actMap.set(d.date, d);

  // build grid
  const totalDays = daysInMonth(year, month);
  const firstDow = firstDowOfMonth(year, month);

  const days: CalendarDay[] = [];
  for (let d = 1; d <= totalDays; d++) {
    const date = isoDate(year, month, d);
    const dow = (firstDow + d - 1) % 7;
    const act = actMap.get(date);
    const mark = marked.get(date) ?? null;
    days.push({
      date,
      day: d,
      isWeekend: dow === 0 || dow === 6,
      dayType: mark?.day_type ?? null,
      label: mark?.label ?? null,
      hasActivity: act?.active ?? false,
      closed: act?.closed ?? 0,
      updated: act?.updated ?? 0,
      created: act?.created ?? 0,
    });
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  function openPopover(date: string) {
    const existing = marked.get(date);
    setPopover({
      date,
      label: existing?.label ?? "",
      dayType: existing?.day_type ?? "holiday",
    });
  }

  async function saveMark() {
    if (!popover) return;
    setSaving(true);
    try {
      await fetch("/reports/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: popover.date, day_type: popover.dayType, label: popover.label || null }),
      });
      await fetchMarked();
      onCalendarChange?.();
    } finally {
      setSaving(false);
      setPopover(null);
    }
  }

  async function removeMark(date: string) {
    setSaving(true);
    try {
      await fetch("/reports/api/calendar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      await fetchMarked();
      onCalendarChange?.();
    } finally {
      setSaving(false);
      setPopover(null);
    }
  }

  return (
    <div className="select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={15} className="text-gray-500" />
        </button>
        <span className="text-sm font-bold text-gray-800">
          {MONTHS[month - 1]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight size={15} className="text-gray-500" />
        </button>
      </div>

      {loadingCal && (
        <div className="flex justify-center py-3">
          <Loader2 size={16} className="animate-spin text-gray-300" />
        </div>
      )}

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DOW.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* leading empty cells */}
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map((day) => {
          const isHoliday = day.dayType === "holiday";
          const isLeave = day.dayType === "leave";
          const intensity = day.closed + day.updated + day.created;

          // colour priority: holiday > leave > activity > weekend/idle
          let bg = "bg-gray-50 text-gray-400";
          let ring = "";
          if (day.isWeekend) {
            bg = "bg-gray-50 text-gray-300";
          }
          if (isHoliday) {
            bg = "bg-red-100 text-red-700 font-bold";
            ring = "ring-1 ring-red-300";
          } else if (isLeave) {
            bg = "bg-amber-100 text-amber-700 font-bold";
            ring = "ring-1 ring-amber-300";
          } else if (!day.isWeekend && activityData) {
            if (intensity === 0) bg = "bg-gray-50 text-gray-500";
            else if (intensity <= 2) bg = "bg-green-100 text-green-800";
            else if (intensity <= 5) bg = "bg-green-300 text-green-900";
            else bg = "bg-green-500 text-white";
          }

          const clickable = allowMarking && !day.isWeekend;
          const drillable = !!onDayClick && !day.isWeekend;

          return (
            <div
              key={day.date}
              title={
                day.label
                  ? `${day.date} — ${day.dayType}: ${day.label}`
                  : activityData
                    ? `${day.date}\nClosed: ${day.closed} · Updated: ${day.updated} · Created: ${day.created}`
                    : day.date
              }
              className={`
                relative aspect-square rounded-lg flex flex-col items-center justify-center
                text-[11px] font-semibold transition-all
                ${bg} ${ring}
                ${clickable || drillable ? "cursor-pointer hover:scale-105 hover:z-10 hover:shadow-sm" : ""}
              `}
              onClick={() => {
                if (day.isWeekend) return;
                if (drillable && !allowMarking) {
                  onDayClick!(day.date);
                  return;
                }
                if (drillable && day.hasActivity) {
                  onDayClick!(day.date);
                  return;
                }
                if (allowMarking) openPopover(day.date);
              }}
            >
              {day.day}
              {/* tiny dot for activity */}
              {activityData && !day.isWeekend && intensity > 0 && !isHoliday && !isLeave && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current opacity-50" />
              )}
              {/* holiday/leave indicator dot */}
              {(isHoliday || isLeave) && (
                <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isHoliday ? "bg-red-500" : "bg-amber-500"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="w-3 h-3 rounded bg-red-100 ring-1 ring-red-300" /> Holiday
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500">
          <span className="w-3 h-3 rounded bg-amber-100 ring-1 ring-amber-300" /> Leave
        </span>
        {activityData && (
          <>
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="w-3 h-3 rounded bg-green-100" /> 1–2 issues
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="w-3 h-3 rounded bg-green-300" /> 3–5 issues
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <span className="w-3 h-3 rounded bg-green-500" /> 6+ issues
            </span>
          </>
        )}
        {allowMarking && (
          <span className="text-[10px] text-gray-400 ml-auto italic">Click a weekday to mark holiday/leave</span>
        )}
      </div>

      {/* Mark popover */}
      {popover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setPopover(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl p-5 w-80 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">Mark {popover.date}</h3>
              <button onClick={() => setPopover(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={14} className="text-gray-500" />
              </button>
            </div>

            <div className="flex gap-2">
              {(["holiday", "leave"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setPopover(p => p ? { ...p, dayType: t } : p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors capitalize
                    ${popover.dayType === t
                      ? t === "holiday" ? "bg-red-100 border-red-300 text-red-700" : "bg-amber-100 border-amber-300 text-amber-700"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Label (e.g. Republic Day)"
              value={popover.label}
              onChange={e => setPopover(p => p ? { ...p, label: e.target.value } : p)}
              className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs outline-none focus:border-gray-400"
            />

            <div className="flex gap-2">
              {marked.has(popover.date) && (
                <button
                  onClick={() => removeMark(popover.date)}
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
              <button
                onClick={saveMark}
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {saving && <Loader2 size={11} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
