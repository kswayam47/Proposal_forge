import { NextRequest, NextResponse } from "next/server";
import { calculateDashboardData } from "@/lib/jira/metrics";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const month = sp.get("month") ?? format(new Date(), "yyyy-MM");
    const assigneeId = sp.get("assignee_id") ?? null;
    const projectKey = sp.get("project_key") ?? null;
    const employeeId = sp.get("employee_id") ?? process.env.EMPLOYEE_ID ?? "EMP001";

    const data = await calculateDashboardData(employeeId, assigneeId, projectKey, month);
    return NextResponse.json({ alerts: data.alerts });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
