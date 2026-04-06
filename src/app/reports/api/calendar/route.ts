import { NextRequest, NextResponse } from "next/server";
import { getAsyncDb } from "@/lib/jira/db-async";

export interface OrgCalendarDay {
  date: string;
  day_type: "holiday" | "leave";
  label: string | null;
}

// GET /api/calendar?year=2026&month=2&employee_id=X
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const year = sp.get("year");
  const month = sp.get("month");
  const employeeId = sp.get("employee_id");

  const db = await getAsyncDb();
  try {
    let rows: OrgCalendarDay[] = [];
    
    if (year && month) {
      const pad = String(month).padStart(2, "0");
      const start = `${year}-${pad}-01`;
      const end = `${year}-${pad}-31`;
      
      // Get org-wide holidays/leaves
      rows = await db.query(
        `SELECT date, day_type, label FROM org_calendar
         WHERE date >= ? AND date <= ? ORDER BY date`,
        [start, end]
      ) as unknown as OrgCalendarDay[];

      // If employeeId provided, also get their specific leaves
      if (employeeId) {
        const empRows = await db.query(
          `SELECT date, 'leave' as day_type, COALESCE(leave_type || ': ' || reason, leave_type) as label 
           FROM employee_leaves
           WHERE employee_id = ? AND date >= ? AND date <= ? AND status = 'approved'`,
          [employeeId, start, end]
        ) as unknown as OrgCalendarDay[];
        
        // Merge - employee specific leaves override or add to org calendar
        const dateMap = new Map<string, OrgCalendarDay>();
        for (const r of rows) dateMap.set(r.date, r);
        for (const r of empRows) dateMap.set(r.date, r);
        rows = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      }

      return NextResponse.json({ days: rows });
    }
    
    // No filter — return all org calendar (fallback)
    rows = await db.query(
      `SELECT date, day_type, label FROM org_calendar ORDER BY date`
    ) as unknown as OrgCalendarDay[];
    return NextResponse.json({ days: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/calendar  body: { date, day_type, label? }
export async function POST(req: NextRequest) {
  const db = await getAsyncDb();
  try {
    const { date, day_type, label } = (await req.json()) as {
      date: string;
      day_type: "holiday" | "leave";
      label?: string;
    };
    if (!date || !day_type) {
      return NextResponse.json({ error: "date and day_type required" }, { status: 400 });
    }
    await db.query(
      `INSERT INTO org_calendar (date, day_type, label)
       VALUES (?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET day_type = EXCLUDED.day_type, label = EXCLUDED.label`,
      [date, day_type, label ?? null]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/calendar  body: { date }
export async function DELETE(req: NextRequest) {
  const db = await getAsyncDb();
  try {
    const { date } = (await req.json()) as { date: string };
    if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });
    await db.query(`DELETE FROM org_calendar WHERE date = ?`, [date]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
