import nodemailer from "nodemailer";
import { getAsyncDb } from "./db-async";
import puppeteer from "puppeteer";
import { QuotaLimitError } from "./gemini";
import { format } from "date-fns";
import fs from "fs";
import path from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PipelineSelection {
    employeeId: string;
    projectId?: string;
    employeeName: string;
    projectIds?: string;
}

export interface PipelineInstance {
    id: number;
    name: string;
    gemini_keys: string; // comma separated
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_pass: string;
    admin_email: string;
    selections: string; // JSON string
    trigger_time: string; // HH:mm
    trigger_day: number; // day of month (1-28)
    is_active: number;
    last_run: string | null;
    report_month: string; // 'current' or 'previous'
}

// ─── Active runs tracking (for stop/cancel) ─────────────────────────────────
const globalForPipeline = globalThis as unknown as {
    _pipelineActiveRuns?: Map<number, { aborted: boolean; logId: number | bigint }>;
    _pipelineProgressStore?: Map<number, PipelineProgress>;
};
if (!globalForPipeline._pipelineActiveRuns) {
    globalForPipeline._pipelineActiveRuns = new Map();
}
if (!globalForPipeline._pipelineProgressStore) {
    globalForPipeline._pipelineProgressStore = new Map();
}
const activeRuns = globalForPipeline._pipelineActiveRuns;

export function cancelPipelineRun(pipelineId: number): boolean {
    const run = activeRuns.get(pipelineId);
    if (run) {
        run.aborted = true;
        return true;
    }
    return false;
}

export function getPipelineRunStatus(pipelineId: number): { running: boolean; aborted: boolean } | null {
    const run = activeRuns.get(pipelineId);
    if (!run) return null;
    return { running: true, aborted: run.aborted };
}

// ─── Progress tracking ──────────────────────────────────────────────────────

export interface PipelineProgress {
    pipelineId: number;
    pipelineName: string;
    status: "running" | "completed" | "failed" | "stopped";
    currentEmployee: string;
    currentStep: string; // "generating", "emailing", "done"
    processed: number;
    total: number;
    results: { name: string; status: "success" | "failed" | "skipped"; error?: string; employeeId?: string; month?: string; pipelineId?: number; hasPdf?: boolean }[];
}

const progressStore = globalForPipeline._pipelineProgressStore!;

export function getPipelineProgress(pipelineId: number): PipelineProgress | null {
    return progressStore.get(pipelineId) || null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getISTTimestamp(): string {
    const now = new Date();
    const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const y = ist.getUTCFullYear();
    const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
    const d = String(ist.getUTCDate()).padStart(2, "0");
    const hh = String(ist.getUTCHours()).padStart(2, "0");
    const mm = String(ist.getUTCMinutes()).padStart(2, "0");
    const ss = String(ist.getUTCSeconds()).padStart(2, "0");
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function getISTTime(): { hhmm: string; today: string; dayOfMonth: number } {
    const now = new Date();
    const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const hh = ist.getUTCHours().toString().padStart(2, "0");
    const mm = ist.getUTCMinutes().toString().padStart(2, "0");
    return {
        hhmm: `${hh}:${mm}`,
        today: format(ist, "yyyy-MM-dd"),
        dayOfMonth: ist.getUTCDate(),
    };
}

function generateEmployeeEmail(name: string): string {
    const firstName = name.split(/\s+/)[0] || name;
    return `${firstName.toLowerCase()}@gmail.com`;
}

async function sendEmailFromConfig(config: any, to: string, subject: string, text: string, attachments: any[] = []) {
    if (!config.smtpHost || !config.smtpUser) {
        console.error("SMTP not configured, skipping email to", to);
        return;
    }

    const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: { user: config.smtpUser, pass: config.smtpPass },
    });

    await transporter.sendMail({
        from: config.smtpUser,
        to,
        subject,
        text,
        attachments,
    });
}

// ─── Core Pipeline Execution ────────────────────────────────────────────────

export async function runPipelineInstance(pipelineId: number, baseUrl: string) {
    const db = await getAsyncDb();
    const pipelines = await db.query("SELECT * FROM report_pipelines WHERE id = ?", [pipelineId]) as PipelineInstance[];
    const pipeline = pipelines[0];

    if (!pipeline) throw new Error("Pipeline not found");

    let month: string;
    if (pipeline.report_month === "previous") {
        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        month = format(prevMonth, "yyyy-MM");
    } else {
        month = format(new Date(), "yyyy-MM");
    }
    const selections = JSON.parse(pipeline.selections) as PipelineSelection[];
    const istNow = getISTTimestamp();

    if (selections.length === 0) {
        return { status: "done", processed: 0, sent: 0, failed: 0, details: ["No employees selected in this pipeline."] };
    }

    const logResult = await db.query(
        "INSERT INTO pipeline_run_logs (pipeline_id, pipeline_name, run_at, status, total_reports, gemini_keys) VALUES (?, ?, ?, 'running', ?, ?) RETURNING id",
        [pipelineId, pipeline.name, istNow, selections.length, pipeline.gemini_keys]
    ) as any[];

    // Handle both SQLite (lastInsertRowid) and Postgres (RETURNING id)
    const logId = logResult[0]?.id || (logResult as any).lastInsertRowid;

    const runState = { aborted: false, logId };
    activeRuns.set(pipelineId, runState);

    const progress: PipelineProgress = {
        pipelineId,
        pipelineName: pipeline.name,
        status: "running",
        currentEmployee: "",
        currentStep: "starting",
        processed: 0,
        total: selections.length,
        results: [],
    };
    progressStore.set(pipelineId, progress);

    try {
        const config = {
            geminiKeys: pipeline.gemini_keys?.split(",").map(k => k.trim()).filter(Boolean) || [],
            adminEmail: pipeline.admin_email,
            smtpHost: pipeline.smtp_host,
            smtpPort: pipeline.smtp_port,
            smtpUser: pipeline.smtp_user,
            smtpPass: pipeline.smtp_pass,
        };

        const result = await processSelectionsDirectly(selections, month, config, baseUrl, pipeline.name, pipelineId, runState, progress);

        const doneAt = getISTTimestamp();
        await db.query("UPDATE report_pipelines SET last_run = ? WHERE id = ?", [doneAt, pipelineId]);

        const status = runState.aborted ? "stopped" : (result.failed || 0) > 0 && (result.sent || 0) > 0 ? "partial" : (result.failed || 0) > 0 ? "failed" : "completed";
        await db.query(
            "UPDATE pipeline_run_logs SET status = ?, sent_count = ?, failed_count = ?, details = ? WHERE id = ?",
            [status, result.sent || 0, result.failed || 0, JSON.stringify(result.details || []), logId]
        );

        progress.status = runState.aborted ? "stopped" : "completed";
        progressStore.set(pipelineId, progress);

        return result;
    } catch (e) {
        await db.query(
            "UPDATE pipeline_run_logs SET status = 'failed', error_message = ? WHERE id = ?",
            [String(e), logId]
        );
        progress.status = "failed";
        progressStore.set(pipelineId, progress);
        throw e;
    } finally {
        activeRuns.delete(pipelineId);
        setTimeout(() => progressStore.delete(pipelineId), 5 * 60 * 1000);
    }
}

async function processSelectionsDirectly(
    selections: PipelineSelection[],
    month: string,
    config: any,
    baseUrl: string,
    pipelineName: string,
    pipelineId: number,
    runState: { aborted: boolean },
    progress: PipelineProgress,
) {
    const successList: string[] = [];
    const failList: string[] = [];

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        for (let i = 0; i < selections.length; i++) {
            if (runState.aborted) {
                for (let j = i; j < selections.length; j++) {
                    progress.results.push({ name: selections[j].employeeName, status: "skipped" });
                }
                break;
            }

            const sel = selections[i];
            const email = generateEmployeeEmail(sel.employeeName);

            progress.currentEmployee = sel.employeeName;
            progress.currentStep = "generating";
            progress.processed = i;
            progressStore.set(pipelineId, progress);

            try {
                const page = await browser.newPage();
                await page.setViewport({ width: 1200, height: 1600 });

                const reportUrl = new URL("/reports/report", baseUrl);
                reportUrl.searchParams.set("employee_id", sel.employeeId);
                reportUrl.searchParams.set("month", month);
                reportUrl.searchParams.set("display_name", sel.employeeName);
                if (sel.projectIds) {
                    reportUrl.searchParams.set("project_key", sel.projectIds);
                    reportUrl.searchParams.set("projects_label", sel.projectIds);
                }

                if (config.geminiKeys.length > 0) {
                    await page.setExtraHTTPHeaders({ 'x-pipeline-keys': config.geminiKeys.join(',') });
                }

                await page.goto(reportUrl.toString(), { waitUntil: "networkidle0", timeout: 120000 });
                await page.waitForSelector('body[data-ready="true"]', { timeout: 120000 });
                await new Promise(r => setTimeout(r, 2000));

                if (runState.aborted) {
                    await page.close();
                    progress.results.push({ name: sel.employeeName, status: "skipped" });
                    continue;
                }

                const pdf = await page.pdf({ format: "A4", printBackground: true });
                await page.close();

                const reportsDir = path.join(process.cwd(), "data", "pipeline-reports");
                if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
                const pdfFilename = `${pipelineId}-${sel.employeeId}-${month}.pdf`;
                fs.writeFileSync(path.join(reportsDir, pdfFilename), pdf);

                progress.currentStep = "emailing";
                progressStore.set(pipelineId, progress);

                await sendEmailFromConfig(
                    config,
                    email,
                    `ProposalForge: Performance Report - ${month}`,
                    `Hi ${sel.employeeName},\n\nPlease find attached your performance report for ${month}.\n\nBest regards,\nProposalForge Team`,
                    [{ filename: `Assessment-${sel.employeeName}-${month}.pdf`, content: pdf }]
                );

                successList.push(`✅ ${sel.employeeName} → ${email}`);
                progress.results.push({ name: sel.employeeName, status: "success", employeeId: sel.employeeId, month, pipelineId, hasPdf: true });

            } catch (err) {
                console.error(`Pipeline ✗ Failed ${sel.employeeName}:`, err);
                const isQuota = err instanceof QuotaLimitError || String(err).includes("Quota Limit exceeded");
                failList.push(`❌ ${sel.employeeName} — ${String(err).slice(0, 100)}`);
                // Check if PDF was already saved to disk before the error (e.g. email failed)
                const pdfPath = path.join(process.cwd(), "data", "pipeline-reports", `${pipelineId}-${sel.employeeId}-${month}.pdf`);
                const pdfExists = fs.existsSync(pdfPath);
                progress.results.push({ name: sel.employeeName, status: "failed", error: String(err).slice(0, 100), employeeId: sel.employeeId, month, pipelineId, hasPdf: pdfExists });

                if (isQuota && config.adminEmail) {
                    await sendEmailFromConfig(
                        config,
                        config.adminEmail,
                        "URGENT: Gemini API Keys Exhausted",
                        `The pipeline "${pipelineName}" for ${month} stopped due to quota limits.\n\nPlease replace the API keys in the Admin panel and resume.`
                    );
                    throw new QuotaLimitError("Pipeline keys exhausted.");
                }
                continue;
            }
        }
    } finally {
        if (browser) await browser.close();
    }

    progress.processed = selections.length;
    progress.currentStep = "done";
    progress.currentEmployee = "";
    progressStore.set(pipelineId, progress);

    if (config.adminEmail) {
        const stoppedNote = runState.aborted ? "\n⚠️ Pipeline was manually stopped.\n" : "";
        const summary = [
            `Pipeline "${pipelineName}" ${runState.aborted ? "was stopped" : "completed"} for ${month}.`,
            stoppedNote,
            `📊 Summary:`,
            `  Sent: ${successList.length}`,
            `  Failed: ${failList.length}`,
            ``,
            ...(successList.length > 0 ? [`Reports sent to:`, ...successList] : []),
            ...(failList.length > 0 ? [``, `Failures:`, ...failList] : []),
            ``,
            `— ProposalForge Automated Reports`
        ].join("\n");

        await sendEmailFromConfig(
            config,
            config.adminEmail,
            `Report Pipeline "${pipelineName}" ${runState.aborted ? "Stopped" : "Complete"} — ${successList.length} sent, ${failList.length} failed`,
            summary
        );
    }

    return { status: runState.aborted ? "stopped" : "done", processed: successList.length + failList.length, sent: successList.length, failed: failList.length, details: progress.results };
}

export async function initPipelineQueue(month: string, selections: PipelineSelection[]) {
    const db = await getAsyncDb();
    const istNow = getISTTimestamp();

    for (const selection of selections) {
        const email = generateEmployeeEmail(selection.employeeName);
        await db.query(`
            INSERT INTO report_pipeline_queue (month, employee_id, employee_name, employee_email, project_id, status, updated_at)
            VALUES (?, ?, ?, ?, ?, 'pending', ?)
            ON CONFLICT DO NOTHING
        `, [month, selection.employeeId, selection.employeeName, email, selection.projectId, istNow]);
    }
}

export async function processPipelineQueue(month: string, baseUrl: string) {
    const db = await getAsyncDb();
    const items = await db.query(
        "SELECT * FROM report_pipeline_queue WHERE month = ? AND status = 'pending'",
        [month]
    ) as any[];

    if (items.length === 0) return { status: "done", processed: 0 };

    const pipelines = await db.query("SELECT * FROM report_pipelines WHERE is_active = 1 LIMIT 1") as PipelineInstance[];
    const template = pipelines[0];

    if (!template) throw new Error("No active pipeline found to use as configuration template.");

    const config = {
        geminiKeys: template.gemini_keys?.split(",").map(k => k.trim()).filter(Boolean) || [],
        adminEmail: template.admin_email,
        smtpHost: template.smtp_host,
        smtpPort: template.smtp_port,
        smtpUser: template.smtp_user,
        smtpPass: template.smtp_pass,
    };

    const selections: PipelineSelection[] = items.map(item => ({
        employeeId: item.employee_id,
        employeeName: item.employee_name,
        projectId: item.project_id
    }));

    const runState = { aborted: false };
    const progress: PipelineProgress = {
        pipelineId: 0,
        pipelineName: "Manual Run",
        status: "running",
        currentEmployee: "",
        currentStep: "starting",
        processed: 0,
        total: selections.length,
        results: [],
    };
    progressStore.set(0, progress);

    try {
        const result = await processSelectionsDirectly(selections, month, config, baseUrl, "Manual", 0, runState, progress);

        // Update queue table
        for (const res of progress.results) {
            await db.query(
                "UPDATE report_pipeline_queue SET status = ?, updated_at = ? WHERE month = ? AND employee_id = ?",
                [res.status === "success" ? "completed" : "failed", getISTTimestamp(), month, res.employeeId]
            );
        }

        return result;
    } finally {
        setTimeout(() => progressStore.delete(0), 5 * 60 * 1000);
    }
}

export async function checkAndTriggerPipelines(baseUrl: string) {
    const db = await getAsyncDb();
    const { hhmm, today, dayOfMonth } = getISTTime();

    const activePipelines = await db.query("SELECT * FROM report_pipelines WHERE is_active = 1") as PipelineInstance[];

    for (const p of activePipelines) {
        const pDay = p.trigger_day || 1;
        if (pDay === dayOfMonth && p.trigger_time === hhmm) {
            const lastDate = p.last_run ? p.last_run.split(" ")[0] : "";
            if (lastDate !== today) {
                console.log(`[Automation] ⚡ Triggering pipeline: ${p.name} (ID: ${p.id}) at ${hhmm} IST on day ${dayOfMonth}`);
                runPipelineInstance(p.id, "http://localhost:3000").catch(e => {
                    console.error(`[Automation] ✗ Pipeline ${p.name} failed:`, e);
                });
            }
        }
    }
}
