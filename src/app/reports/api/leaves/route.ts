import { NextRequest, NextResponse } from "next/server";
import { getAsyncDb } from "@/lib/jira/db-async";

export interface EmployeeLeave {
  id: number;
  employee_id: string;
  employee_name: string | null;
  date: string;
  leave_type: "personal" | "sick" | "casual" | "wfh" | "other";
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

// GET /reports/api/leaves?employee_id=X&month=YYYY-MM
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const employeeId = sp.get("employee_id");
  const month = sp.get("month"); // YYYY-MM format

  const db = getAsyncDb();
  try {
    // Ensure table exists (for db-async which doesn't run db.ts initSchema)
    await db.query(`
      CREATE TABLE IF NOT EXISTS employee_leaves (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id     TEXT    NOT NULL,
        employee_name   TEXT,
        date            TEXT    NOT NULL,
        leave_type      TEXT    NOT NULL CHECK(leave_type IN ('personal','sick','casual','wfh','other')),
        reason          TEXT,
        status          TEXT    NOT NULL DEFAULT 'approved' CHECK(status IN ('pending','approved','rejected')),
        created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE(employee_id, date)
      )
    `);

    if (employeeId && month) {
      // Filter by employee + month
      const start = `${month}-01`;
      const end = `${month}-31`;
      const rows = await db.query(
        `SELECT * FROM employee_leaves WHERE employee_id = ? AND date >= ? AND date <= ? ORDER BY date`,
        [employeeId, start, end]
      ) as unknown as EmployeeLeave[];
      return NextResponse.json({ leaves: rows });
    } else if (employeeId) {
      // All leaves for an employee
      const rows = await db.query(
        `SELECT * FROM employee_leaves WHERE employee_id = ? ORDER BY date DESC`,
        [employeeId]
      ) as unknown as EmployeeLeave[];
      return NextResponse.json({ leaves: rows });
    } else if (month) {
      // All leaves for a month (all employees)
      const start = `${month}-01`;
      const end = `${month}-31`;
      const rows = await db.query(
        `SELECT * FROM employee_leaves WHERE date >= ? AND date <= ? ORDER BY date`,
        [start, end]
      ) as unknown as EmployeeLeave[];
      return NextResponse.json({ leaves: rows });
    }
    // All leaves
    const rows = await db.query(
      `SELECT * FROM employee_leaves ORDER BY date DESC LIMIT 200`
    ) as unknown as EmployeeLeave[];
    return NextResponse.json({ leaves: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /reports/api/leaves  body: { employee_id, employee_name, date, leave_type, reason }
export async function POST(req: NextRequest) {
  const db = getAsyncDb();
  try {
    const { employee_id, employee_name, date, leave_type, reason } = (await req.json()) as {
      employee_id: string;
      employee_name?: string;
      date: string;
      leave_type: string;
      reason?: string;
    };
    if (!employee_id || !date || !leave_type) {
      return NextResponse.json({ error: "employee_id, date, and leave_type are required" }, { status: 400 });
    }

    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS employee_leaves (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id     TEXT    NOT NULL,
        employee_name   TEXT,
        date            TEXT    NOT NULL,
        leave_type      TEXT    NOT NULL CHECK(leave_type IN ('personal','sick','casual','wfh','other')),
        reason          TEXT,
        status          TEXT    NOT NULL DEFAULT 'approved' CHECK(status IN ('pending','approved','rejected')),
        created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE(employee_id, date)
      )
    `);

    await db.query(
      `INSERT INTO employee_leaves (employee_id, employee_name, date, leave_type, reason)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(employee_id, date) DO UPDATE SET
         leave_type = EXCLUDED.leave_type,
         reason = EXCLUDED.reason,
         employee_name = EXCLUDED.employee_name`,
      [employee_id, employee_name ?? null, date, leave_type, reason ?? null]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /reports/api/leaves  body: { employee_id, date }
export async function DELETE(req: NextRequest) {
  const db = getAsyncDb();
  try {
    const { employee_id, date } = (await req.json()) as { employee_id: string; date: string };
    if (!employee_id || !date) {
      return NextResponse.json({ error: "employee_id and date required" }, { status: 400 });
    }
    await db.query(
      `DELETE FROM employee_leaves WHERE employee_id = ? AND date = ?`,
      [employee_id, date]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
