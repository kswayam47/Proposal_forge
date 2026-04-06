import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;
    const pipelineId = sp.get("pipeline_id");
    const employeeId = sp.get("employee_id");
    const month = sp.get("month");

    if (!pipelineId || !employeeId || !month) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const filename = `${pipelineId}-${employeeId}-${month}.pdf`;
    const filePath = path.join(process.cwd(), "data", "pipeline-reports", filename);

    if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const displayName = sp.get("display_name") || employeeId;

    return new NextResponse(fileBuffer, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="Report-${displayName}-${month}.pdf"`,
        },
    });
}
