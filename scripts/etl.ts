#!/usr/bin/env tsx
/**
 * Woodfrog Foundry — Standalone Jira ETL Script
 *
 * Pulls all issues from your Jira project and stores them in the local
 * SQLite database (data/woodfrog.db).
 *
 * Usage:
 *   bun run etl
 *   npx tsx scripts/etl.ts
 *
 * Requires in .env.local:
 *   JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY
 */

import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

const { runJiraETL } = await import("../src/lib/jira/etl.js");

console.log("╔══════════════════════════════════════════╗");
console.log("║   Woodfrog Foundry — Jira ETL Runner     ║");
console.log("╚══════════════════════════════════════════╝");
console.log(`  Project : ${process.env.JIRA_PROJECT_KEY ?? "(not set)"}`);
console.log(`  Host    : ${process.env.JIRA_BASE_URL ?? "(not set)"}`);
console.log(`  User    : ${process.env.JIRA_USER_EMAIL ?? "(not set)"}`);
console.log("──────────────────────────────────────────");

const result = await runJiraETL();

if (result.status === "success") {
  console.log(`\n✓ ETL complete — ${result.issues_fetched} issues fetched.`);
  process.exit(0);
} else {
  console.error(`\n✗ ETL failed: ${result.error_message}`);
  process.exit(1);
}
