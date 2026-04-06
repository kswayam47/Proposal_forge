import { NextResponse } from "next/server";
import { getPipelineProgress, cancelPipelineRun } from "@/lib/jira/pipeline";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const pipelineId = parseInt(url.searchParams.get("pipeline_id") || "0");

    if (!pipelineId) {
        return NextResponse.json({ error: "pipeline_id required" }, { status: 400 });
    }

    const progress = getPipelineProgress(pipelineId);
    return NextResponse.json(progress || { status: "idle" });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { pipeline_id, action } = body;

        if (action === "stop" && pipeline_id) {
            const stopped = cancelPipelineRun(pipeline_id);
            return NextResponse.json({ stopped });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
