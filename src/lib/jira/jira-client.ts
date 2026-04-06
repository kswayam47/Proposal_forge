import axios, { AxiosInstance } from "axios";

// ─── Raw Jira API shapes ──────────────────────────────────────────────────────

export interface JiraIssueRaw {
  id: string;
  key: string;
  fields: {
    summary: string;
    assignee: { accountId: string; displayName: string } | null;
    status: {
      name: string;
      statusCategory: { key: string; name: string };
    };
    issuetype?: { name: string } | null;
    priority?: { name: string } | null;
    updated?: string;
    // Story Points — different field names for classic vs next-gen projects
    customfield_10016?: number | null;
    customfield_10028?: number | null;
    created: string;
    resolutiondate: string | null;
    timespent: number | null;
    timetracking?: { timeSpentSeconds?: number };
    // Sprints array (next-gen / cloud)
    customfield_10020?: Array<{
      state: "active" | "closed" | "future";
      name: string;
      startDate?: string;
      endDate?: string;
    }> | null;
  };
  // Changelog is requested via expand=changelog
  changelog?: {
    histories: Array<{
      created: string;
      items: Array<{
        field: string;
        fromString: string | null;
        toString: string | null;
      }>;
    }>;
  };
}

export interface JiraSearchResponse {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssueRaw[];
}

// ─── Client factory ───────────────────────────────────────────────────────────

export function createJiraClient(): AxiosInstance {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_USER_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email || !token) {
    throw new Error(
      "Missing Jira credentials. Ensure JIRA_BASE_URL, JIRA_USER_EMAIL, and JIRA_API_TOKEN are set in .env.local"
    );
  }

  const credentials = Buffer.from(`${email}:${token}`).toString("base64");

  return axios.create({
    baseURL: `${baseUrl.replace(/\/$/, "")}/rest/api/3`,
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    timeout: 30_000,
  });
}

// ─── Paginated issue fetch ────────────────────────────────────────────────────

/**
 * Fetch all issues for a project via GET /search/jql?jql=project="KEY"
 * Matches the confirmed working Jira Cloud URL pattern.
 * Changelog is fetched separately per resolved issue via GET /issue/{key}/changelog
 */
export async function fetchAllIssues(
  client: AxiosInstance,
  options?: {
    assigneeAccountId?: string;
    projectKey?: string;
    onProgress?: (fetched: number, total: number) => void;
  }
): Promise<JiraIssueRaw[]> {
  const all: JiraIssueRaw[] = [];
  const PAGE_SIZE = 100;
  let startAt = 0;
  let total = Infinity;

  // Build JQL — project="KEY" is the confirmed working pattern
  const clauses: string[] = [];
  if (options?.projectKey) clauses.push(`project = "${options.projectKey}"`);
  if (options?.assigneeAccountId) clauses.push(`assignee = "${options.assigneeAccountId}"`);
  const jql = clauses.length > 0 ? clauses.join(" AND ") : "order by created ASC";

  const fields = [
    "summary",
    "assignee",
    "status",
    "issuetype",
    "priority",
    "updated",
    "customfield_10016",
    "customfield_10028",
    "created",
    "resolutiondate",
    "timespent",
    "timetracking",
    "customfield_10020",
  ].join(",");

  while (startAt < total) {
    // GET /search/jql?jql=project="SC" — confirmed working on Jira Cloud
    const response = await client.get<JiraSearchResponse>("/search/jql", {
      params: {
        jql,
        fields,
        startAt,
        maxResults: PAGE_SIZE,
      },
    });

    const data = response.data;
    // /search/jql returns { issues, total } — same shape as /search
    total = data.total ?? data.issues.length;
    all.push(...data.issues);
    startAt += data.issues.length;

    if (options?.onProgress) options.onProgress(all.length, total);
    if (data.issues.length < PAGE_SIZE) break;
  }

  // Fetch changelogs for resolved issues via GET /issue/{key}/changelog
  const doneIssues = all.filter((i) => isIssueDone(i.fields));
  for (const issue of doneIssues) {
    try {
      const clRes = await client.get<{ values: NonNullable<JiraIssueRaw["changelog"]>["histories"] }>(
        `/issue/${issue.key}/changelog`
      );
      issue.changelog = { histories: clRes.data.values ?? [] };
    } catch {
      issue.changelog = { histories: [] };
    }
  }

  return all;
}

// ─── Field parsers ────────────────────────────────────────────────────────────

export function parseStoryPoints(
  fields: JiraIssueRaw["fields"]
): number | null {
  return fields.customfield_10016 ?? fields.customfield_10028 ?? null;
}

export function parseActiveSprint(
  fields: JiraIssueRaw["fields"]
): string | null {
  const sprints = fields.customfield_10020;
  if (!sprints?.length) return null;
  const active = sprints.find((s) => s.state === "active");
  if (active) return active.name;
  // Fall back to most-recent closed sprint
  const closed = sprints.filter((s) => s.state === "closed");
  return closed[closed.length - 1]?.name ?? sprints[sprints.length - 1]?.name ?? null;
}

export function wasReopened(issue: JiraIssueRaw): boolean {
  if (!issue.changelog?.histories) return false;
  const DONE_CATEGORIES = new Set(["done"]);
  let closedOnce = false;

  for (const history of issue.changelog.histories) {
    for (const item of history.items) {
      if (item.field !== "status") continue;
      const to = item.toString?.toLowerCase() ?? "";
      const from = item.fromString?.toLowerCase() ?? "";
      if (DONE_CATEGORIES.has(to) || to === "resolved" || to === "closed") {
        closedOnce = true;
      } else if (
        closedOnce &&
        (DONE_CATEGORIES.has(from) || from === "resolved" || from === "closed")
      ) {
        return true;
      }
    }
  }
  return false;
}

export function isIssueDone(fields: JiraIssueRaw["fields"]): boolean {
  if (!fields?.status) return false;
  const catKey = fields.status.statusCategory?.key?.toLowerCase() ?? "";
  const statusName = fields.status.name?.toLowerCase() ?? "";
  return (
    catKey === "done" ||
    statusName === "done" ||
    statusName === "closed" ||
    statusName === "resolved"
  );
}
