"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import type { EntryType, TimeEntryInput } from "@/types";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";

interface TimeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  employeeId: string;
  defaultDate?: string;
}

const ENTRY_TYPES: { value: EntryType; label: string; defaultHours: number }[] =
  [
    { value: "work", label: "Work", defaultHours: 10 },
    { value: "public_holiday", label: "Public Holiday", defaultHours: 0 },
    { value: "personal_leave", label: "Personal Leave", defaultHours: 0 },
    { value: "sick_leave", label: "Sick Leave", defaultHours: 0 },
    { value: "half_day", label: "Half Day", defaultHours: 5 },
  ];

const LEAVE_TYPES: EntryType[] = [
  "public_holiday",
  "personal_leave",
  "sick_leave",
];

function getDefaultHours(type: EntryType): number {
  return ENTRY_TYPES.find((t) => t.value === type)?.defaultHours ?? 10;
}

export function TimeEntryModal({
  isOpen,
  onClose,
  onSaved,
  employeeId,
  defaultDate,
}: TimeEntryModalProps) {
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const [date, setDate] = useState(defaultDate ?? todayStr);
  const [hours, setHours] = useState<number>(10);
  const [entryType, setEntryType] = useState<EntryType>("work");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isLeave = LEAVE_TYPES.includes(entryType);

  const handleTypeChange = useCallback((val: EntryType) => {
    setEntryType(val);
    setHours(getDefaultHours(val));
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setDate(defaultDate ?? todayStr);
    setHours(10);
    setEntryType("work");
    setNotes("");
    setError(null);
    setSaved(false);
  }, [defaultDate, todayStr]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!date) return setError("Date is required.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return setError("Invalid date format.");
    if (!isLeave) {
      if (isNaN(hours) || hours < 0 || hours > 24)
        return setError("Hours must be between 0 and 24.");
    }

    const payload: TimeEntryInput = {
      employee_id: employeeId,
      date,
      hours_logged: isLeave ? 0 : hours,
      entry_type: entryType,
      notes: notes.trim() || undefined,
    };

    setLoading(true);
    try {
      const res = await fetch("/reports/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save entry.");
      } else {
        setSaved(true);
        setTimeout(() => {
          onSaved();
          handleClose();
        }, 900);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl shadow-black/10 border border-gray-100"
        role="dialog"
        aria-modal="true"
        aria-label="Log Time Entry"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Log Time Entry</h2>
            <p className="text-xs text-gray-400 mt-0.5">Employee: {employeeId}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayStr}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition"
            />
          </div>

          {/* Entry Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
              Entry Type <span className="text-red-500">*</span>
            </label>
            <select
              value={entryType}
              onChange={(e) => handleTypeChange(e.target.value as EntryType)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition appearance-none"
            >
              {ENTRY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Hours — only for work / half_day */}
          {!isLeave && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                Hours Logged <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                min={0}
                max={24}
                step={0.5}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                {entryType === "work" && (
                  <>
                    Target: <span className="font-semibold">10 hrs</span>.{" "}
                    <span
                      className={
                        hours >= 10
                          ? "text-green-600 font-medium"
                          : hours >= 8
                            ? "text-amber-600 font-medium"
                            : "text-red-600 font-medium"
                      }
                    >
                      {hours >= 10
                        ? "Compliant"
                        : hours >= 8
                          ? "Below target"
                          : "Underlogged"}
                    </span>
                  </>
                )}
                {entryType === "half_day" && "Half-day capped at 5 hrs."}
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
              Notes{" "}
              <span className="text-gray-400 font-normal normal-case tracking-normal">
                (optional)
              </span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Any context or reason..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent resize-none transition"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Success */}
          {saved && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-sm text-green-700">
              <CheckCircle2 size={14} />
              Entry saved successfully.
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || saved}
              className="flex-1 bg-gray-900 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : saved ? "Saved!" : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
