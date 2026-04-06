import { NextResponse } from "next/server";
import { calculateDashboardData } from "@/lib/jira/metrics";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employee_id") ?? "EMP001";
    const assigneeId = searchParams.get("assignee_id") ?? null;
    const projectKey = searchParams.get("project_key") ?? null;
    const month = searchParams.get("month") ?? null;  // "yyyy-MM"

    const data = await calculateDashboardData(employeeId, assigneeId, projectKey, month);
    return NextResponse.json(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
