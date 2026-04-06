import { NextRequest, NextResponse } from "next/server";
import { getAsyncDb } from "@/lib/jira/db-async";
import { runPipelineInstance } from "@/lib/jira/pipeline";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: rawId } = await params;
        const id = parseInt(rawId);
        if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

        const body = await request.json();
        const { action } = body;
        const db = await getAsyncDb();
        const baseUrl = new URL(request.url).origin;

        if (action === "trigger") {
            // Run asynchronously so the response returns immediately
            runPipelineInstance(id, baseUrl).catch(e => {
                console.error(`Pipeline ${id} failed:`, e);
            });
            return NextResponse.json({ started: true, pipelineId: id });
        } else if (action === "activate") {
            await db.query("UPDATE report_pipelines SET is_active = true WHERE id = ?", [id]);
            return NextResponse.json({ success: true });
        } else if (action === "deactivate") {
            await db.query("UPDATE report_pipelines SET is_active = false WHERE id = ?", [id]);
            return NextResponse.json({ success: true });
        } else if (action === "toggle") {
            const { is_active } = body;
            await db.query("UPDATE report_pipelines SET is_active = ? WHERE id = ?", [!!is_active, id]);
            return NextResponse.json({ success: true });
        } else if (action === "delete") {
            await db.query("DELETE FROM report_pipelines WHERE id = ?", [id]);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
