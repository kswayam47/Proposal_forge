/**
 * Backfill remaining null rows - fetches page by page until all done
 */
import { DatabaseSync } from 'node:sqlite';
import https from 'https';
import { readFileSync } from 'fs';

const env = {};
try {
  readFileSync('C:/JIRA-2/.env.local', 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  });
} catch {}

const BASE_URL = (env.JIRA_BASE_URL || 'https://woodfrog.atlassian.net').replace(/\/$/, '');
const EMAIL    = env.JIRA_USER_EMAIL || 'swayam@woodfrog.tech';
const TOKEN    = env.JIRA_API_TOKEN;
const AUTH     = Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');

function jiraGet(path) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${BASE_URL}/rest/api/3${path}`;
    const url = new URL(fullUrl);
    https.get({
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: { Authorization: `Basic ${AUTH}`, Accept: 'application/json' },
      timeout: 30000,
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('JSON: ' + data.slice(0, 200))); }
      });
    }).on('error', reject);
  });
}

const db = new DatabaseSync('C:/JIRA-2/data/woodfrog.db');
const upd = db.prepare(`UPDATE jira_issues SET issue_type=?, priority=?, updated_date=? WHERE issue_key=?`);

// Fetch ALL issues across all pages
const PAGE = 50;
let startAt = 0;
let fetched = 0;
let updated = 0;

console.log('Fetching all issues from Jira...');
while (true) {
  const resp = await jiraGet(
    `/search/jql?jql=project%3D%22EI%22&fields=issuetype%2Cpriority%2Cupdated&maxResults=${PAGE}&startAt=${startAt}`
  );
  
  const issues = resp.issues || [];
  const total  = typeof resp.total === 'number' ? resp.total : issues.length;
  
  console.log(`  Page startAt=${startAt}: got ${issues.length} issues, total=${total}`);
  
  for (const issue of issues) {
    const issueType   = issue.fields?.issuetype?.name ?? null;
    const priority    = issue.fields?.priority?.name ?? null;
    const updatedDate = issue.fields?.updated ? issue.fields.updated.substring(0, 10) : null;
    upd.run(issueType, priority, updatedDate, issue.key);
    updated++;
  }
  
  fetched += issues.length;
  startAt += issues.length;
  
  if (issues.length === 0 || fetched >= total) break;
}

console.log(`\nDone. Updated ${updated} rows from ${fetched} Jira issues.`);

const nulls = db.prepare("SELECT COUNT(*) as c FROM jira_issues WHERE issue_type IS NULL").get();
const total2 = db.prepare('SELECT COUNT(*) as c FROM jira_issues').get();
console.log(`Remaining nulls: ${nulls.c} / ${total2.c} total`);
