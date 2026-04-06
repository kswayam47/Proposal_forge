#!/usr/bin/env tsx
/**
 * Woodfrog Foundry — Standalone Metrics Calculator
 *
 * Reads from the local SQLite database and prints all KPIs,
 * alerts, and Jira metrics to stdout.  Useful for debugging,
 * CI checks, or piping into reports.
 *
 * Usage:
 *   bun run etl:calc
 *   npx tsx scripts/calculate-metrics.ts
 */

import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

const { calculateDashboardData } = await import("../src/lib/jira/metrics.js");

console.log("╔════════════════════════════════════════════╗");
console.log("║   Woodfrog Foundry — Metrics Calculator    ║");
console.log("╚════════════════════════════════════════════╝\n");

try {
  const data = calculateDashboardData();

  console.log("── KPI Summary ───────────────────────────────");
  for (const card of data.kpi_cards) {
    const val =
      typeof card.value === "number"
        ? Number.isInteger(card.value)
          ? card.value.toString()
          : card.value.toFixed(2)
        : card.value;
    const unit = card.unit ?? "";
    const momStr = card.mom
      ? ` | prev: ${card.mom.previous}${unit}  Δ ${card.mom.change_pct ?? "—"}%`
      : "";
    console.log(
      `  ${card.label.padEnd(20)}: ${(val + unit).padStart(10)}${momStr}`
    );
  }

  console.log("\n── Jira Productivity ─────────────────────────");
  const m = data.jira_metrics;
  console.log(`  Issues Closed      : ${m.issues_closed}`);
  console.log(`  Story Points       : ${m.story_points_completed} SP`);
  console.log(`  Avg Resolution     : ${m.avg_resolution_time_days} days`);
  console.log(`  Reopened Issues    : ${m.reopened_issues}`);
  console.log(`  Spillover Tasks    : ${m.spillover_tasks}`);

  console.log("\n── Leave Summary ─────────────────────────────");
  const l = data.leave_summary;
  console.log(`  Public Holiday     : ${l.public_holiday}`);
  console.log(`  Personal Leave     : ${l.personal_leave}`);
  console.log(`  Sick Leave         : ${l.sick_leave}`);
  console.log(`  Half Days          : ${l.half_day}`);

  console.log("\n── Behavioral Alerts ─────────────────────────");
  if (data.alerts.length === 0) {
    console.log("  No active alerts.");
  } else {
    for (const a of data.alerts) {
      console.log(`  [${a.type.toUpperCase().padEnd(7)}] ${a.message}`);
    }
  }

  console.log("\n── Meta ──────────────────────────────────────");
  console.log(`  Baseline Date  : ${data.baseline_date}`);
  console.log(`  Last ETL Run   : ${data.last_etl_run ?? "Never"}`);

  console.log("\n── Raw JSON ──────────────────────────────────");
  console.log(JSON.stringify(data, null, 2));

  process.exit(0);
} catch (err) {
  console.error(
    "\n✗ Error:",
    err instanceof Error ? err.message : String(err)
  );
  process.exit(1);
}
