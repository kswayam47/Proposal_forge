import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('C:/JIRA-2/data/woodfrog.db');
const nulls = db.prepare("SELECT issue_key, status, created_date FROM jira_issues WHERE issue_type IS NULL ORDER BY created_date").all();
console.log('Null rows:', JSON.stringify(nulls, null, 2));
// Set fallback value for these orphaned rows
db.prepare("UPDATE jira_issues SET issue_type='Task', priority='Medium' WHERE issue_type IS NULL").run();
const after = db.prepare("SELECT COUNT(*) as c FROM jira_issues WHERE issue_type IS NULL").get();
console.log('Remaining nulls after fallback:', after.c);
