import { NextRequest, NextResponse } from "next/server";
import { getAsyncDb } from "@/lib/jira/db-async";

export async function GET() {
    try {
        const db = await getAsyncDb();
        const rows = await db.query(`
      SELECT assignee_id as employee_id, MIN(assignee_name) as display_name, STRING_AGG(DISTINCT project_key, '+') as project_ids
      FROM jira_issues
      WHERE assignee_id != 'unassigned' AND assignee_name IS NOT NULL
      GROUP BY assignee_id
      ORDER BY display_name ASC
    `);
        return NextResponse.json({ employees: rows });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
