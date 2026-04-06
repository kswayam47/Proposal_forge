import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const pipelineId = searchParams.get("pipeline_id");
        const employeeId = searchParams.get("employee_id");
        const month = searchParams.get("month");

        if (!pipelineId || !employeeId || !month) {
            return NextResponse.json(
                { error: "pipeline_id, employee_id, and month are required" },
                { status: 400 }
            );
        }

        const pdfFilename = `${pipelineId}-${employeeId}-${month}.pdf`;
        const pdfPath = path.join(process.cwd(), "data", "pipeline-reports", pdfFilename);

        if (!fs.existsSync(pdfPath)) {
            return NextResponse.json({ error: "PDF not found" }, { status: 404 });
        }

        const pdfBuffer = fs.readFileSync(pdfPath);
        return new NextResponse(pdfBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${pdfFilename}"`,
            },
        });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
