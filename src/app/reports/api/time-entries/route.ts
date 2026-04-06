import { NextRequest, NextResponse } from 'next/server';
import { getAsyncDb } from '@/lib/jira/db-async';
import { format } from 'date-fns';
import type { TimeEntryInput, EntryType } from '@/types';

const VALID_TYPES: EntryType[] = ['work', 'public_holiday', 'personal_leave', 'sick_leave', 'half_day'];

export async function GET(request: NextRequest) {
  try {
    const db = await getAsyncDb();
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id') ?? process.env.EMPLOYEE_ID ?? 'EMP001';
    const month = searchParams.get('month'); // YYYY-MM

    let rows;
    if (month) {
      const [year, mon] = month.split('-');
      const startDate = `${year}-${mon}-01`;
      const endDate = `${year}-${mon}-31`;
      rows = await db.query(
        `SELECT * FROM time_entries WHERE employee_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC`,
        [employeeId, startDate, endDate]
      );
    } else {
      rows = await db.query(
        `SELECT * FROM time_entries WHERE employee_id = ? ORDER BY date DESC LIMIT 100`,
        [employeeId]
      );
    }

    return NextResponse.json({ entries: rows });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TimeEntryInput = await request.json();
    const { employee_id, date, hours_logged, entry_type, notes } = body;

    // Validation
    if (!employee_id || !date || hours_logged === undefined || !entry_type) {
      return NextResponse.json({ error: 'Missing required fields: employee_id, date, hours_logged, entry_type' }, { status: 400 });
    }
    if (hours_logged > 24 || hours_logged < 0) {
      return NextResponse.json({ error: 'hours_logged must be between 0 and 24' }, { status: 400 });
    }
    if (!VALID_TYPES.includes(entry_type)) {
      return NextResponse.json({ error: `Invalid entry_type. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
    }

    const db = await getAsyncDb();

    // Cannot mark Work + Leave on same date
    const existingRows = await db.query(
      `SELECT entry_type FROM time_entries WHERE employee_id = ? AND date = ?`,
      [employee_id, date]
    );
    const existing = existingRows[0] as { entry_type: string } | undefined;

    if (existing) {
      const existingIsWork = existing.entry_type === 'work';
      const newIsLeave = ['public_holiday', 'personal_leave', 'sick_leave'].includes(entry_type);
      const newIsWork = entry_type === 'work';
      const existingIsLeave = ['public_holiday', 'personal_leave', 'sick_leave'].includes(existing.entry_type);

      if ((existingIsWork && newIsLeave) || (existingIsLeave && newIsWork)) {
        return NextResponse.json(
          { error: 'Cannot mark Work and Leave on the same date.' },
          { status: 409 }
        );
      }
    }

    const now = new Date().toISOString();

    await db.query(`
      INSERT INTO time_entries (employee_id, date, hours_logged, entry_type, notes, entry_timestamp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(employee_id, date) DO UPDATE SET
        hours_logged = EXCLUDED.hours_logged,
        entry_type = EXCLUDED.entry_type,
        notes = EXCLUDED.notes,
        entry_timestamp = EXCLUDED.entry_timestamp
    `, [employee_id, date, hours_logged, entry_type, notes ?? null, now]);

    return NextResponse.json({ success: true, date });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const date = searchParams.get('date');

    if (!employeeId || !date) {
      return NextResponse.json({ error: 'employee_id and date required' }, { status: 400 });
    }

    const db = await getAsyncDb();
    await db.query(`DELETE FROM time_entries WHERE employee_id = ? AND date = ?`, [employeeId, date]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
