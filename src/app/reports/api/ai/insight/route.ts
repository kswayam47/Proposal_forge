import { NextResponse } from "next/server";
import { generateFullReport, type GeminiKPIInput, type GeminiFullOutput, QuotaLimitError } from "@/lib/jira/gemini";

export type InsightResponse = GeminiFullOutput;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const customKey = req.headers.get("x-gemini-key");
    const pipelineKeysStr = req.headers.get("x-pipeline-keys");

    // Build array of keys to try: 
    // 1. Explicit custom key from user
    // 2. Automated pipeline keys (if any)
    const keys: string[] = [];
    if (customKey) keys.push(customKey);
    if (pipelineKeysStr) keys.push(...pipelineKeysStr.split(",").map(k => k.trim()));

    const inputs: GeminiKPIInput[] = Array.isArray(body.kpis) ? body.kpis : [];
    const meta = body.summary_meta as {
      employee_name: string;
      score: number;
      band: string;
      factor_scores: Record<string, number>;
    } | undefined;

    const result = await generateFullReport(
      inputs,
      meta?.score ?? 0,
      meta?.band ?? "",
      meta?.factor_scores ?? {},
      keys.length > 0 ? (keys.length === 1 ? keys[0] : keys) : undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof QuotaLimitError || String(error).includes("Quota Limit exceeded")) {
      return NextResponse.json(
        { error: "Quota Limit exceeded pls replace" },
        { status: 429 }
      );
    }

    console.error("AI Insight API Error:", error);
    return NextResponse.json({ error: "Failed to generate AI insight" }, { status: 500 });
  }
}
