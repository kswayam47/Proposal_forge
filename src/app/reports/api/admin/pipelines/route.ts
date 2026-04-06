import { NextRequest, NextResponse } from "next/server";
import { getAsyncDb } from "@/lib/jira/db-async";

export async function GET() {
    try {
        const db = await getAsyncDb();
        const pipelines = await db.query("SELECT * FROM report_pipelines ORDER BY id DESC");
        return NextResponse.json(pipelines);
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = await getAsyncDb();
        const body = await request.json();
        const {
            name,
            gemini_keys,
            smtp_host,
            smtp_port,
            smtp_user,
            smtp_pass,
            admin_email,
            selections,
            trigger_time,
            trigger_day,
            report_month,
        } = body;

        const results = await db.query(`
            INSERT INTO report_pipelines (
                name, gemini_keys, smtp_host, smtp_port, smtp_user, smtp_pass, admin_email, selections, trigger_time, trigger_day, report_month
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        `, [
            name,
            gemini_keys,
            smtp_host,
            smtp_port || 587,
            smtp_user,
            smtp_pass,
            admin_email,
            JSON.stringify(selections),
            trigger_time,
            trigger_day || 1,
            report_month || "current"
        ]);

        return NextResponse.json({ id: results[0]?.id });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
