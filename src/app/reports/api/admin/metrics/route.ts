import { NextResponse } from "next/server";
import { calculateAdminDashboard } from "@/lib/jira/metrics";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectKey = searchParams.get("project_key") ?? null;
    const month = searchParams.get("month") ?? null;
    const data = await calculateAdminDashboard(projectKey, month);
    return NextResponse.json(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
