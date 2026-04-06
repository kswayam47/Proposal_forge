import { NextRequest, NextResponse } from "next/server";
import { getAsyncDb } from "@/lib/jira/db-async";

export async function GET(request: NextRequest) {
    try {
        const db = await getAsyncDb();
        const { searchParams } = new URL(request.url);
        const pipelineId = searchParams.get("pipeline_id");
        const limitStr = searchParams.get("limit") || "50";
        const limit = parseInt(limitStr);

        let logs;
        if (pipelineId) {
            logs = await db.query(
                "SELECT * FROM pipeline_run_logs WHERE pipeline_id = ? ORDER BY id DESC LIMIT ?",
                [parseInt(pipelineId), limit]
            );
        } else {
            logs = await db.query(
                "SELECT * FROM pipeline_run_logs ORDER BY id DESC LIMIT ?",
                [limit]
            );
        }

        return NextResponse.json(logs);
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
