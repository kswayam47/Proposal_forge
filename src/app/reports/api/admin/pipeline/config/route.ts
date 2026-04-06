import { NextRequest, NextResponse } from "next/server";
import { getAsyncDb } from "@/lib/jira/db-async";

export async function POST(req: NextRequest) {
    try {
        const config = await req.json();
        const db = await getAsyncDb();

        const keys = [
            "pipeline_gemini_keys",
            "pipeline_admin_email",
            "pipeline_smtp_host",
            "pipeline_smtp_port",
            "pipeline_smtp_user",
            "pipeline_smtp_pass",
            "pipeline_from_email"
        ];

        for (const key of keys) {
            if (config[key] !== undefined) {
                await db.query(
                    `INSERT INTO app_config (key, value) VALUES (?, ?)
                     ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`,
                    [key, String(config[key])]
                );
            }
        }

        return NextResponse.json({ status: "success" });
    } catch (err) {
        console.error("Pipeline config error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function GET() {
    try {
        const db = await getAsyncDb();
        const rows = await db.query(
            "SELECT key, value FROM app_config WHERE key LIKE 'pipeline_%'"
        ) as Array<{ key: string; value: string }>;

        const config = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {} as Record<string, string>);
        return NextResponse.json(config);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
