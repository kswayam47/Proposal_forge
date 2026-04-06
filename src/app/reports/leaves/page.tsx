"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  User,
  Clock,
  FileText,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────
function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
function firstDowOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}
function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function isWeekend(dow: number) {
  return dow === 0 || dow === 6;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const LEAVE_TYPES = [
  { value: "personal", label: "Personal Leave", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "sick", label: "Sick Leave", color: "bg-red-100 text-red-700 border-red-300" },
  { value: "casual", label: "Casual Leave", color: "bg-amber-100 text-amber-700 border-amber-300" },
  { value: "wfh", label: "Work From Home", color: "bg-green-100 text-green-700 border-green-300" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-700 border-gray-300" },
  { value: "holiday", label: "Public Holiday", color: "bg-purple-100 text-purple-700 border-purple-300", isOrg: true },
];

interface EmployeeLeave {
  id: number;
  employee_id: string;
  employee_name: string | null;
  date: string;
  leave_type: string;
  reason: string | null;
  status: string;
  created_at: string;
}

interface Employee {
  employee_id: string;
  display_name: string;
  project_ids?: string;
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function LeaveTrackerPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Employee selection
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<string>("");
  const [selectedEmpName, setSelectedEmpName] = useState<string>("");
  const [loadingEmps, setLoadingEmps] = useState(true);

  // Leaves data
  const [leaves, setLeaves] = useState<EmployeeLeave[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [formType, setFormType] = useState("personal");
  const [formReason, setFormReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch employees
  useEffect(() => {
    (async () => {
      setLoadingEmps(true);
      try {
        const r = await fetch("/reports/api/admin/employees");
        const data = await r.json();
        const emps: Employee[] = (data.employees || []).filter((e: Employee) => e.display_name !== "Unassigned");
        setEmployees(emps);
        if (emps.length > 0) {
          setSelectedEmp(emps[0].employee_id);
          setSelectedEmpName(emps[0].display_name);
        }
      } catch {
        console.error("Failed to fetch employees");
      } finally {
        setLoadingEmps(false);
      }
    })();
  }, []);

  // Fetch leaves + holidays when employee or month changes
  const fetchLeaves = useCallback(async () => {
    if (!selectedEmp) return;
    setLoadingLeaves(true);
    try {
      const monthStr = `${year}-${String(month).padStart(2, "0")}`;
      
      // 1. Fetch employee specific leaves
      const r1 = await fetch(`/reports/api/leaves?employee_id=${encodeURIComponent(selectedEmp)}&month=${monthStr}`);
      const d1 = await r1.json();
      const empLeaves: EmployeeLeave[] = d1.leaves || [];
      
      // 2. Fetch org holidays
      const r2 = await fetch(`/reports/api/calendar?year=${year}&month=${month}`);
      const d2 = await r2.json();
      const orgHolidays: Array<{ date: string; day_type: string; label: string }> = d2.days || [];
      
      // Map holidays to EmployeeLeave shape for rendering
      const mappedHolidays: EmployeeLeave[] = orgHolidays.map(h => ({
        id: -1, // placeholder
        employee_id: "ORG",
        employee_name: "Organization",
        date: h.date,
        leave_type: "holiday", // we use 'holiday' as the type
        reason: h.label,
        status: "approved",
        created_at: new Date().toISOString()
      }));

      setLeaves([...empLeaves, ...mappedHolidays]);
    } catch (e) {
      console.error("Failed to fetch leaves", e);
    } finally {
      setLoadingLeaves(false);
    }
  }, [selectedEmp, year, month]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  // Calendar grid
  const totalDays = daysInMonth(year, month);
  const firstDow = firstDowOfMonth(year, month);
  const leaveMap = new Map<string, EmployeeLeave>();
  for (const l of leaves) leaveMap.set(l.date, l);

  // Navigation
  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  // Save leave or holiday
  async function handleSave() {
    if (!formDate || !selectedEmp) return;
    setSaving(true);
    try {
        const isHoliday = formType === "holiday";
        const url = isHoliday ? "/reports/api/calendar" : "/reports/api/leaves";
        const body = isHoliday 
            ? { date: formDate, day_type: "holiday", label: formReason || "Public Holiday" }
            : {
                employee_id: selectedEmp,
                employee_name: selectedEmpName,
                date: formDate,
                leave_type: formType,
                reason: formReason || null,
              };

      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await fetchLeaves();
      setFormOpen(false);
      setFormReason("");
      setFormType("personal");
    } finally {
      setSaving(false);
    }
  }

  // Delete leave or holiday
  async function handleDelete(date: string) {
    const leave = leaveMap.get(date);
    if (!leave) return;
    const isHoliday = leave.employee_id === "ORG";
    
    if (!confirm(`Remove ${isHoliday ? "Public Holiday" : "leave"} on ${date}?`)) return;
    
    const url = isHoliday ? "/reports/api/calendar" : "/reports/api/leaves";
    const body = isHoliday ? { date } : { employee_id: selectedEmp, date };

    await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await fetchLeaves();
  }

  // Click calendar day
  function onDayClick(date: string) {
    if (leaveMap.has(date)) return; // already has leave
    setFormDate(date);
    setFormOpen(true);
  }

  const leaveTypeInfo = (type: string) => LEAVE_TYPES.find(t => t.value === type) || LEAVE_TYPES[4];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <CalendarDays className="h-7 w-7 text-blue-600" />
              Leave Tracker
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Mark and manage employee leaves — automatically reflected in JIRA reports.
            </p>
          </div>
        </div>

        {/* Employee Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <User className="h-4 w-4" />
              Employee
            </div>
            {loadingEmps ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            ) : (
              <select
                value={selectedEmp}
                onChange={(e) => {
                  setSelectedEmp(e.target.value);
                  const emp = employees.find(em => em.employee_id === e.target.value);
                  setSelectedEmpName(emp?.display_name || "");
                }}
                className="flex-1 max-w-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {employees.map(e => (
                  <option key={e.employee_id} value={e.employee_id}>
                    {e.display_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Calendar Section (3 cols) */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <ChevronLeft size={18} className="text-gray-500" />
              </button>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {MONTHS[month - 1]} {year}
              </h2>
              <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <ChevronRight size={18} className="text-gray-500" />
              </button>
            </div>

            {loadingLeaves && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              </div>
            )}

            {/* DOW header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {DOW.map(d => (
                <div key={d} className="text-center text-xs font-bold text-gray-400 dark:text-gray-500 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Leading empties */}
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`e-${i}`} />
              ))}

              {Array.from({ length: totalDays }).map((_, i) => {
                const day = i + 1;
                const date = isoDate(year, month, day);
                const dow = (firstDow + i) % 7;
                const weekend = isWeekend(dow);
                const leave = leaveMap.get(date);
                const today = date === isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());

                let bg = "bg-gray-50 dark:bg-gray-750 text-gray-600 dark:text-gray-400";
                let ring = "";
                if (weekend) bg = "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600";
                if (leave) {
                  const info = leaveTypeInfo(leave.leave_type);
                  bg = info.color;
                  ring = `ring-1 ring-inset ${info.color.includes("blue") ? "ring-blue-300" : info.color.includes("red") ? "ring-red-300" : info.color.includes("amber") ? "ring-amber-300" : info.color.includes("green") ? "ring-green-300" : "ring-gray-300"}`;
                }
                if (today) ring += " ring-2 ring-blue-500";
                
                // Highlight selected date for marking
                const isSelected = formOpen && date === formDate;
                if (isSelected && !leave) {
                  bg = "bg-blue-600 text-white shadow-lg shadow-blue-500/20";
                  ring = "ring-2 ring-blue-400 ring-offset-2";
                }

                const clickable = !weekend && !leave;

                return (
                  <div
                    key={date}
                    title={leave ? `${leave.leave_type}: ${leave.reason || "No reason"}` : date}
                    onClick={() => clickable && onDayClick(date)}
                    className={`
                      relative aspect-square rounded-xl flex flex-col items-center justify-center
                      text-sm font-semibold transition-all duration-200
                      ${bg} ${ring}
                      ${clickable ? "cursor-pointer hover:scale-110 hover:shadow-md hover:z-10" : ""}
                      ${leave ? "cursor-default" : ""}
                    `}
                  >
                    {day}
                    {leave && (
                      <span className="absolute bottom-0.5 text-[7px] font-bold uppercase tracking-wider opacity-70">
                        {leave.leave_type.slice(0, 3)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
              {LEAVE_TYPES.map(t => (
                <span key={t.value} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className={`w-3 h-3 rounded ${t.color.split(" ")[0]} ring-1 ${t.color.split(" ")[2] || "ring-gray-300"}`} />
                  {t.label}
                </span>
              ))}
              <span className="text-xs text-gray-400 ml-auto italic">
                Click a weekday to mark leave
              </span>
            </div>
          </div>

          {/* Leave Form + History (2 cols) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Quick Mark Form */}
            {formOpen ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-blue-200 dark:border-blue-800 p-6 shadow-lg shadow-blue-500/5">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-blue-500" />
                  Mark Leave — {formDate}
                </h3>

                {/* Leave type buttons */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {LEAVE_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setFormType(t.value)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                        formType === t.value
                          ? t.color + " shadow-sm scale-105"
                          : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Reason */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block">
                    Reason (optional)
                  </label>
                  <textarea
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    placeholder="e.g. Doctor appointment, family function..."
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setFormOpen(false); setFormReason(""); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    {saving && <Loader2 size={12} className="animate-spin" />}
                    Mark Leave
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  // Default to today or first working day
                  const todayStr = isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
                  setFormDate(todayStr);
                  setFormOpen(true);
                }}
                className="w-full bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-5 text-center hover:border-blue-300 hover:bg-blue-50/50 dark:hover:border-blue-600 dark:hover:bg-blue-950/20 transition-all cursor-pointer group"
              >
                <Plus className="h-6 w-6 mx-auto text-gray-300 group-hover:text-blue-500 transition-colors" />
                <p className="text-sm font-semibold text-gray-400 group-hover:text-blue-600 mt-2">Mark a Leave</p>
              </button>
            )}

            {/* Leave History */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                Leaves This Month
                <span className="ml-auto text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {leaves.length}
                </span>
              </h3>

              {leaves.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-8 w-8 mx-auto text-gray-200 dark:text-gray-600 mb-2" />
                  <p className="text-xs text-gray-400">No leaves marked this month</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {leaves.map((l) => {
                    const info = leaveTypeInfo(l.leave_type);
                    return (
                      <div
                        key={l.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className={`w-2 h-8 rounded-full ${info.color.split(" ")[0]}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                              {new Date(l.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" })}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${info.color}`}>
                              {info.label}
                            </span>
                          </div>
                          {l.reason && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate flex items-center gap-1">
                              <FileText className="h-3 w-3 flex-shrink-0" />
                              {l.reason}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(l.date)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all"
                          title="Remove leave"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
