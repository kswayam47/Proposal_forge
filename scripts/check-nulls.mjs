import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('C:/JIRA-2/data/woodfrog.db');
const nulls = db.prepare("SELECT COUNT(*) as c FROM jira_issues WHERE issue_type IS NULL").get();
const total = db.prepare('SELECT COUNT(*) as c FROM jira_issues').get();
console.log('null issue_type:', nulls.c, 'total:', total.c);
