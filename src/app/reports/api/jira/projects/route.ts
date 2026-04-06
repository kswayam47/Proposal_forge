import { NextResponse } from "next/server";
import { createJiraClient } from "@/lib/jira/jira-client";
import { getAsyncDb } from "@/lib/jira/db-async";

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  avatarUrl?: string;
}

/**
 * GET /api/jira/projects
 * Fetches all accessible Jira projects from the configured Atlassian org.
 * Falls back to projects already in the local DB if Jira is unreachable.
 */
export async function GET() {
  // Always try to return projects from live Jira first
  try {
    const client = createJiraClient();
    const res = await client.get<{
      values: Array<{
        id: string;
        key: string;
        name: string;
        projectTypeKey: string;
        archived?: boolean;
        isPrivate?: boolean;
        avatarUrls?: Record<string, string>;
      }>;
      isLast: boolean;
    }>("/project/search", {
      params: { maxResults: 100, orderBy: "name" },
    });

    const projects: JiraProject[] = res.data.values
      .filter((p) => !p.archived)
      .map((p) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        projectTypeKey: p.projectTypeKey,
        avatarUrl: p.avatarUrls?.["48x48"],
      }));

    return NextResponse.json({ projects });
  } catch {
    // Fallback: return distinct projects already stored in local DB
    try {
      const db = await getAsyncDb();
      // jira_issues stores issue_key like "PROJ-123" — extract prefix as project key
      // Using PostgreSQL strpos instead of SQLite instr
      const rows = await db.query(
        `SELECT DISTINCT substr(issue_key, 1, strpos(issue_key, '-') - 1) AS project_key
           FROM jira_issues
           WHERE issue_key LIKE '%-%'
           ORDER BY project_key ASC`
      ) as Array<{ project_key: string }>;

      const projects: JiraProject[] = rows.map((r) => ({
        id: r.project_key,
        key: r.project_key,
        name: r.project_key,
        projectTypeKey: "software",
      }));

      return NextResponse.json({ projects, source: "local" });
    } catch (dbErr) {
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }
}
