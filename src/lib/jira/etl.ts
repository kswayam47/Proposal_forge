import { getAsyncDb } from "./db-async";
import {
  createJiraClient,
  fetchAllIssues,
  parseStoryPoints,
  parseActiveSprint,
  wasReopened,
  isIssueDone,
} from "./jira-client";
import { differenceInCalendarDays, parseISO } from "date-fns";

export interface ETLResult {
  issues_fetched: number;
  projects_synced: string[];
  status: "success" | "error";
  error_message?: string;
}

/**
 * Sync all Jira issues per active project via POST /search/jql?jql=project="KEY"
 * Skips archived projects. Upserts all issues into local DB.
 */
export async function runJiraETL(): Promise<ETLResult> {
  const db = await getAsyncDb();
  let issuesFetched = 0;
  const projectsSynced: string[] = [];

  try {
    const client = createJiraClient();

    // 1. Discover active (non-archived) projects
    const projectRes = await client.get<{
      values: Array<{ id: string; key: string; name: string; archived?: boolean }>;
    }>("/project/search", {
      params: { maxResults: 100, orderBy: "name" },
    });

    const activeProjects = projectRes.data.values.filter((p) => !p.archived);
    console.log(
      `[ETL] Found ${activeProjects.length} active project(s): ${activeProjects.map((p) => p.key).join(", ")}`
    );

    if (activeProjects.length === 0) {
      return { issues_fetched: 0, projects_synced: [], status: "success" };
    }

    // 2. Loop projects
    for (const project of activeProjects) {
      console.log(`[ETL] Syncing project: ${project.key}...`);
      const issues = await fetchAllIssues(client, { projectKey: project.key });
      console.log(`[ETL] Fetched ${issues.length} issues for ${project.key}`);

      for (const issue of issues) {
        const fields = issue.fields;
        const issueId = issue.id;
        const issueKey = issue.key;
        const summary = fields.summary || "";
        const assignee = fields.assignee;
        const assigneeId = assignee?.accountId || "";
        const assigneeName = assignee?.displayName || "Unassigned";
        const issueType = fields.issuetype?.name || "Task";
        const priority = fields.priority?.name || "Medium";
        const status = fields.status?.name || "To Do";

        const createdDate = fields.created ? fields.created.split("T")[0] : null;
        const updatedDate = fields.updated ? fields.updated.split("T")[0] : null;
        const resolutionDate = fields.resolutiondate ? fields.resolutiondate.split("T")[0] : null;
        const completedDate = isIssueDone(fields) ? (resolutionDate || updatedDate || createdDate) : null;

        const storyPoints = parseStoryPoints(fields);
        const sprint = parseActiveSprint(fields);
        const reopened = wasReopened(issue) ? 1 : 0;

        let resDays = null;
        if (completedDate && createdDate) {
          resDays = differenceInCalendarDays(parseISO(completedDate), parseISO(createdDate));
        }

        await db.query(`
          INSERT INTO jira_issues (
            issue_id, issue_key, project_key, summary, assignee_id, assignee_name,
            issue_type, priority, story_points, sprint_name, created_date,
            completed_date, updated_date, resolution_time_days, status, reopened_flag,
            fetched_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(issue_id) DO UPDATE SET
            issue_key = excluded.issue_key,
            summary = excluded.summary,
            assignee_id = excluded.assignee_id,
            assignee_name = excluded.assignee_name,
            issue_type = excluded.issue_type,
            priority = excluded.priority,
            story_points = excluded.story_points,
            sprint_name = excluded.sprint_name,
            created_date = excluded.created_date,
            completed_date = excluded.completed_date,
            updated_date = excluded.updated_date,
            resolution_time_days = excluded.resolution_time_days,
            status = excluded.status,
            reopened_flag = excluded.reopened_flag,
            fetched_at = excluded.fetched_at
        `, [
          issueId, issueKey, project.key, summary, assigneeId, assigneeName,
          issueType, priority, storyPoints, sprint, createdDate,
          completedDate, updatedDate, resDays, status, reopened,
          new Date().toISOString()
        ]);

        issuesFetched++;
      }
      projectsSynced.push(project.key);
    }

    // ── Log Success in etl_run_log ──────────────────────────────────────────
    await db.query(`
      INSERT INTO etl_run_log (run_at, status, issues_fetched)
      VALUES (?, ?, ?)
    `, [new Date().toISOString(), "success", issuesFetched]);

    return { issues_fetched: issuesFetched, projects_synced: projectsSynced, status: "success" };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[ETL] Error: ${msg}`);
    return { issues_fetched: issuesFetched, projects_synced: projectsSynced, status: "error", error_message: msg };
  }
}
