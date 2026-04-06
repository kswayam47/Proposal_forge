import { NextResponse } from "next/server";
import { checkAndTriggerPipelines } from "@/lib/jira/pipeline";

/**
 * POST /api/admin/pipelines/check
 * Called by the background scheduler to check and trigger active pipelines.
 */
export async function POST(req: Request) {
    try {
        const baseUrl = new URL(req.url).origin;
        await checkAndTriggerPipelines(baseUrl);
        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("[Pipeline Check] Error:", e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
