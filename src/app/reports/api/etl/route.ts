import { NextRequest, NextResponse } from "next/server";
import { runJiraETL } from "@/lib/jira/etl";
import { getAsyncDb } from "@/lib/jira/db-async";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    if (mode === "auto") {
      const db = await getAsyncDb();
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD (UTC)

      const lastRun = await db.query(
        `SELECT run_at FROM etl_run_log WHERE status = 'success' AND run_at LIKE ? ORDER BY id DESC LIMIT 1`,
        [`${today}%`]
      );

      if (lastRun.length > 0) {
        console.log(`[ETL] Auto-sync skipped. Already synced today at ${lastRun[0].run_at}`);
        return NextResponse.json({
          status: "already_synced",
          last_run: lastRun[0].run_at
        }, { status: 200 });
      }
    }

    const result = await runJiraETL();
    return NextResponse.json(result, {
      status: result.status === "success" ? 200 : 500,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ status: "error", error_message: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = await getAsyncDb();
    const lastRun = await db.query(`SELECT * FROM etl_run_log ORDER BY id DESC LIMIT 5`);
    const issueCountRows = await db.query(`SELECT COUNT(*) as cnt FROM jira_issues`);
    const issueCount = Number(issueCountRows[0]?.cnt ?? 0);

    const configRows = await db.query(`SELECT value FROM app_config WHERE key = 'baseline_date'`);
    const baseline = (configRows[0] as { value: string } | undefined)?.value;

    return NextResponse.json({ last_runs: lastRun, issue_count: issueCount, baseline_date: baseline });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
