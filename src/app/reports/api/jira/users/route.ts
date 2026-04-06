import { NextResponse } from "next/server";
import { createJiraClient } from "@/lib/jira/jira-client";
import { getAsyncDb } from "@/lib/jira/db-async";

/**
 * GET /api/jira/users
 *
 * Returns all active human (atlassian-type) users in the organisation.
 * Falls back to assignees already stored in the local DB if Jira is unreachable.
 */
export async function GET() {
  // ── Try Jira API first ────────────────────────────────────────────────────
  try {
    const client = createJiraClient();
    const PAGE = 200;
    let startAt = 0;
    const all: Array<{
      accountId: string;
      displayName: string;
      emailAddress?: string;
      avatarUrl?: string;
    }> = [];

    while (true) {
      const res = await client.get<
        Array<{
          accountId: string;
          displayName: string;
          emailAddress?: string;
          avatarUrls?: Record<string, string>;
          accountType: string;
          active: boolean;
        }>
      >("/users/search", {
        params: { maxResults: PAGE, startAt },
      });

      const page = res.data
        .filter((u) => u.active && u.accountType === "atlassian")
        .map((u) => ({
          accountId: u.accountId,
          displayName: u.displayName,
          emailAddress: u.emailAddress,
          avatarUrl: u.avatarUrls?.["48x48"],
        }));

      all.push(...page);
      if (res.data.length < PAGE) break;
      startAt += res.data.length;
    }

    all.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return NextResponse.json({ users: all });
  } catch {
    // ── Fallback: pull distinct assignees from local DB ───────────────────
    try {
      const db = await getAsyncDb();
      const rows = await db.query(
        `SELECT DISTINCT assignee_id, assignee_name FROM jira_issues
         WHERE assignee_id != 'unassigned'
         ORDER BY assignee_name ASC`
      ) as Array<{ assignee_id: string; assignee_name: string }>;

      const users = rows.map((r) => ({
        accountId: r.assignee_id,
        displayName: r.assignee_name,
      }));

      return NextResponse.json({ users, source: "local" });
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }
}
