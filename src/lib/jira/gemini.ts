import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import os from "os";

// Custom error for quota limits
export class QuotaLimitError extends Error {
  constructor(message: string = "Quota Limit exceeded pls replace") {
    super(message);
    this.name = "QuotaLimitError";
  }
}

// ── Model waterfall ─────────────────────────────────────────────────────────
// Most available (highest free quota) first. On any 429/quota error skip to next.
const MODEL_WATERFALL = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
];

function getModel(apiKey: string, name: string) {
  const client = new GoogleGenerativeAI(apiKey);
  return client.getGenerativeModel({
    model: name,
    generationConfig: {
      temperature: 0.15,
      maxOutputTokens: 3000,
      responseMimeType: "application/json",
    },
  });
}

// ── Types ───────────────────────────────────────────────────────────────────
export interface GeminiKPIInput {
  kpi_id: string;
  kpi_name: string;
  employee_name: string;
  current_value: string | number;
  mom_change: string;
  percentile: number;
  trend: string;
  drilldown_data: {
    issue_type_distribution: Record<string, number>;
    priority_distribution: Record<string, number>;
    aging_buckets: Record<string, number>;
    top_aging_issue_keys: string[];
    slowest_issue_keys: string[];
    reopened_issue_keys: string[];
    inactive_dates: string[];
    daily_distribution: Array<{ date: string; value: number }>;
  };
}

export interface GeminiKPIOutput {
  interpretation: string;
  suggestion: string;
}

export interface GeminiOverallSummary {
  summary: string;
  strengths: string[];
  concerns: string[];
}

export type GeminiBatchOutput = Record<string, GeminiKPIOutput>;

export interface GeminiFullOutput {
  kpi_insights: GeminiBatchOutput;
  overall_summary: GeminiOverallSummary;
}

// ── File-based cache (survives server hot-reloads) ──────────────────────────
const CACHE_DIR = path.join(os.tmpdir(), "jira2-gemini-cache");
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function ensureCacheDir() {
  try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch { /* ignore */ }
}

function safeCacheKey(obj: unknown): string {
  // Stable hash — use first 200 chars of sorted JSON
  const s = JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return Math.abs(h).toString(16);
}

function readCache<T>(key: string): T | null {
  try {
    ensureCacheDir();
    const f = path.join(CACHE_DIR, `${key}.json`);
    if (!fs.existsSync(f)) return null;
    const { ts, data } = JSON.parse(fs.readFileSync(f, "utf8"));
    if (Date.now() - ts > CACHE_TTL_MS) { fs.unlinkSync(f); return null; }
    console.log(`Gemini cache HIT: ${key}`);
    return data as T;
  } catch { return null; }
}

function writeCache(key: string, data: unknown) {
  try {
    ensureCacheDir();
    fs.writeFileSync(
      path.join(CACHE_DIR, `${key}.json`),
      JSON.stringify({ ts: Date.now(), data }),
      "utf8"
    );
  } catch { /* ignore */ }
}

// ── KPI context dictionary ──────────────────────────────────────────────────
const KPI_CTX: Record<string, string> = {
  issues_closed: "Count of Jira issues moved to Done. Higher = more output delivered.",
  resolution_time: "Avg days from issue creation to closure. Lower = faster delivery.",
  output_velocity: "Issues closed ÷ working days. >1 means closing >1 issue/day on average.",
  stability: "(1 - reopened÷closed)×100%. 100% = zero regressions or rework.",
  throughput: "Active days ÷ working days × 100%. Active = ≥1 Jira update that day.",
  backlog: "Issues aged <7 days ÷ total open × 100%. Higher = fresher, healthier backlog.",
};

// ── Build ONE prompt for everything — KPI insights + overall summary ─────────
function buildUnifiedPrompt(
  inputs: GeminiKPIInput[],
  score: number,
  band: string,
  factorScores: Record<string, number>
): string {
  const name = inputs[0]?.employee_name ?? "the employee";

  const kpiBlocks = inputs.map((inp) => {
    const dd = inp.drilldown_data;
    const ev: string[] = [];
    if (Object.keys(dd.aging_buckets).length)
      ev.push(`aging_buckets:${JSON.stringify(dd.aging_buckets)}`);
    if (dd.slowest_issue_keys.length)
      ev.push(`slowest:[${dd.slowest_issue_keys.slice(0, 3).join(",")}]`);
    if (dd.reopened_issue_keys.length)
      ev.push(`reopened:[${dd.reopened_issue_keys.slice(0, 3).join(",")}]`);
    if (dd.inactive_dates.length)
      ev.push(`inactive_days:${dd.inactive_dates.length}`);
    if (dd.top_aging_issue_keys.length)
      ev.push(`aging_issues:[${dd.top_aging_issue_keys.slice(0, 3).join(",")}]`);

    return `KPI_ID:${inp.kpi_id} | Name:${inp.kpi_name} | Value:${inp.current_value} | MoM:${inp.mom_change} | Pct:${inp.percentile}th
Context:${KPI_CTX[inp.kpi_id] ?? ""}
Evidence:${ev.join("; ") || "none"}`;
  }).join("\n\n");

  const kpiIds = inputs.map((i) => i.kpi_id);
  const kpiNames = inputs.map((i) => i.kpi_name).join(", ");

  const insightShape = kpiIds
    .map((id) => `"${id}":{"interpretation":"• ...\\n• ...\\n• ...","suggestion":"• ...\\n• ...\\n• ..."}`)
    .join(",");

  return `You are a senior engineering performance analyst. Analyse ${name}'s Jira KPIs and return a single JSON object.

EMPLOYEE: ${name}
OVERALL SCORE: ${score}/100 (${band})
FACTOR SCORES: ${JSON.stringify(factorScores)}

AVAILABLE KPIs — ONLY these exist. Do NOT invent or mention any other metric (no "quality", "defect rate", "code review", etc.):
${kpiBlocks}

OUTPUT FORMAT — return ONLY this JSON, no markdown, no extra text:
{
  "kpi_insights": {${insightShape}},
  "overall_summary": {
    "summary": "...",
    "strengths": ["• ...","• ..."],
    "concerns": ["• ...","• ..."]
  }
}

RULES FOR kpi_insights:
- For each kpi_id: "interpretation" = exactly 3 bullet points (•). Each must cite specific numbers, issue keys, or evidence from the data above. Explain WHY the metric is at this level. 15-25 words each.
- "suggestion" = exactly 3 bullet points (•). Each must be a concrete, specific next action referencing actual issue keys or patterns where available. 15-25 words each.
- If Evidence is "none", base interpretation only on value, MoM change, and percentile.

RULES FOR overall_summary:
- "summary": 3-4 sentences. State score+band. Mention 1-2 strongest KPIs with actual values and why they matter for delivery. Mention 1-2 weakest KPIs with actual values and the specific risk they create. Use "${name}" by name.
- "strengths": exactly 2 bullet points (•). Strong KPI name + actual value + why it matters for the team. Specific.
- "concerns": exactly 2 bullet points (•). Weak KPI name + actual value + the concrete delivery risk. Only reference KPIs from this list: ${kpiNames}.
- NEVER mention any metric not in the KPI list above.`;
}

// ── Rate-limit detection ────────────────────────────────────────────────────
function isRateLimit(err: unknown): boolean {
  const s = String(err);
  return s.includes("429") || s.includes("RESOURCE_EXHAUSTED") ||
    s.includes("quota") || s.includes("Too Many Requests") ||
    s.includes("rate limit") || s.includes("rateLimitExceeded");
}

// ── Single Gemini call with model waterfall and key rotation ─────────────────
async function callGemini(prompt: string, apiKeys: string | string[]): Promise<string> {
  const keys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];
  let lastErr: Error = new Error("All models and keys exhausted");

  for (const apiKey of keys) {
    if (!apiKey) continue;

    for (const modelName of MODEL_WATERFALL) {
      try {
        console.log(`Gemini → trying ${modelName} with key ${apiKey.slice(-4)}`);
        const result = await getModel(apiKey, modelName).generateContent(prompt);
        const text = result.response.text().trim();
        console.log(`Gemini ✓ success with ${modelName}`);
        return text;
      } catch (err) {
        lastErr = err as Error;
        if (isRateLimit(err)) {
          console.warn(`Gemini ✗ ${modelName} rate-limited with key ${apiKey.slice(-4)}`);
          // If we hit a rate limit on a specific model, we try the next model with SAME key first
          // because models have independent quotas oftentimes
          continue;
        }
        console.warn(`Gemini ✗ ${modelName} error: ${String(err).slice(0, 100)} → trying next model`);
      }
    }

    // If we've tried all models for THIS key and all were rate limited or errored,
    // only then we consider this key "exhausted" for now and rotate to next key.
    console.warn(`Gemini ✗ Key ${apiKey.slice(-4)} exhausted → rotating to next key`);
  }

  if (isRateLimit(lastErr)) {
    throw new QuotaLimitError();
  }
  throw lastErr;
}

// ── JSON parser with fallback ───────────────────────────────────────────────
function parseJSON<T>(text: string): T {
  let cleaned = text.startsWith("```")
    ? text.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim()
    : text;

  // Handle raw newlines in strings
  cleaned = cleaned.replace(/"([^"]*)"/g, (match, p1) => {
    return `"${p1.replace(/\n/g, "\\n")}"`;
  });

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    // Attempt rescue for truncated JSON
    let attempt = cleaned;
    
    // If we are in the middle of a string (odd number of quotes), close it
    const quotes = (attempt.match(/(^|[^\\])"/g) || []).length;
    if (quotes % 2 !== 0) attempt += '"';

    const openBraces = (attempt.match(/\{/g) || []).length;
    const closeBraces = (attempt.match(/\}/g) || []).length;
    const openBrackets = (attempt.match(/\[/g) || []).length;
    const closeBrackets = (attempt.match(/\]/g) || []).length;

    for (let i = 0; i < openBrackets - closeBrackets; i++) attempt += "]";
    for (let i = 0; i < openBraces - closeBraces; i++) attempt += "}";

    try {
      return JSON.parse(attempt) as T;
    } catch {
      // Last resort: extract anything between the first { and corresponding last }
      const s = cleaned.indexOf("{");
      const e = cleaned.lastIndexOf("}");
      if (s !== -1 && e !== -1) {
        try {
          const extracted = cleaned.slice(s, e + 1);
          return JSON.parse(extracted) as T;
        } catch { /* ignore */ }
      }
      throw new Error("JSON parse failed: " + cleaned.slice(0, 100));
    }
  }
}

// ── Fallbacks ───────────────────────────────────────────────────────────────
const FALLBACK_KPI: GeminiKPIOutput = {
  interpretation: "• Data available in dashboard — AI analysis temporarily unavailable.\n• Review the charts and drill-down tables in this section for current status.\n• Retry report generation after 60 seconds to get AI insights.",
  suggestion: "• Retry report generation after 60 seconds.\n• Review KPI cards on the main dashboard for current metric values.\n• Contact admin if issue persists after retry.",
};

const FALLBACK_SUMMARY: GeminiOverallSummary = {
  summary: "Overall summary temporarily unavailable. Please retry after 60 seconds.",
  strengths: ["• Review KPI sections for positive indicators.", "• Dashboard shows detailed current metrics."],
  concerns: ["• AI summary unavailable — retry after 60 seconds.", "• Check individual KPI pages for detailed analysis."],
};

// ── Public API — ONE call for everything ────────────────────────────────────

/**
 * Single Gemini call returning BOTH per-KPI insights AND overall summary.
 * Uses file-based cache (1h TTL) that survives server hot-reloads.
 */
export async function generateFullReport(
  inputs: GeminiKPIInput[],
  score: number,
  band: string,
  factorScores: Record<string, number>,
  apiKey?: string | string[]
): Promise<GeminiFullOutput> {
  const effectiveKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";

  if (!inputs.length) {
    return { kpi_insights: {}, overall_summary: FALLBACK_SUMMARY };
  }

  const cacheKey = safeCacheKey({ inputs, score, band, factorScores, key: Array.isArray(effectiveKey) ? effectiveKey.map(k => k.slice(-5)).join("|") : effectiveKey.slice(-5) });
  const cached = readCache<GeminiFullOutput>(cacheKey);
  if (cached) return cached;

  try {
    const prompt = buildUnifiedPrompt(inputs, score, band, factorScores);
    const text = await callGemini(prompt, effectiveKey);
    const parsed = parseJSON<GeminiFullOutput>(text);

    // Ensure all KPI IDs are present
    if (!parsed.kpi_insights) parsed.kpi_insights = {};
    for (const inp of inputs) {
      if (!parsed.kpi_insights[inp.kpi_id]) {
        parsed.kpi_insights[inp.kpi_id] = FALLBACK_KPI;
      }
    }
    if (!parsed.overall_summary) parsed.overall_summary = FALLBACK_SUMMARY;

    writeCache(cacheKey, parsed);
    return parsed;
  } catch (err) {
    // Re-throw errors instead of returning fallbacks, so API/UI can detect failure.
    // This aligns with user request to "stop pdf generation" on AI failure.
    throw err;
  }
}

// Keep backward-compat exports used elsewhere
export async function generateGeminiInsightsBatch(inputs: GeminiKPIInput[], apiKey?: string | string[]): Promise<GeminiBatchOutput> {
  const result = await generateFullReport(inputs, 0, "", {}, apiKey);
  return result.kpi_insights;
}

export async function generateGeminiInsight(input: GeminiKPIInput, apiKey?: string | string[]): Promise<GeminiKPIOutput> {
  const batch = await generateGeminiInsightsBatch([input], apiKey);
  return batch[input.kpi_id] ?? FALLBACK_KPI;
}

export async function generateOverallSummary(
  _name: string, score: number, band: string,
  inputs: GeminiKPIInput[], factorScores: Record<string, number>,
  apiKey?: string | string[]
): Promise<GeminiOverallSummary> {
  const result = await generateFullReport(inputs, score, band, factorScores, apiKey);
  return result.overall_summary;
}
