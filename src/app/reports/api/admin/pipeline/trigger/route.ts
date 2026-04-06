import { NextRequest, NextResponse } from "next/server";
import { initPipelineQueue, processPipelineQueue } from "@/lib/jira/pipeline";
import { getAsyncDb } from "@/lib/jira/db-async";

export async function POST(req: NextRequest) {
    try {
        const { month, action, selections } = await req.json();
        if (!month) return NextResponse.json({ error: "Month is required" }, { status: 400 });

        const baseUrl = new URL(req.url).origin;

        if (action === "init") {
            await initPipelineQueue(month, selections);
            return NextResponse.json({ status: "initialized" });
        }

        if (action === "process") {
            // This is a long-running process, in a real prod app we'd use a background job/worker.
            // Here we run it and return the result. Puppeteer is heavy.
            const result = await processPipelineQueue(month, baseUrl);
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (err) {
        console.error("Pipeline trigger error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    if (!month) return NextResponse.json({ error: "Month required" }, { status: 400 });

    const db = await getAsyncDb();
    const stats = await db.query(`
    SELECT status, COUNT(*) as count 
    FROM report_pipeline_queue 
    WHERE month = ? 
    GROUP BY status
  `, [month]) as Array<{ status: string; count: number }>;

    const items = await db.query(`
    SELECT * FROM report_pipeline_queue 
    WHERE month = ? 
    ORDER BY updated_at DESC
  `, [month]);

    return NextResponse.json({ stats, items });
}
