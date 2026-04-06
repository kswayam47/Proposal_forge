const Database = require('better-sqlite3');
const db = new Database('./data/woodfrog.db');

try {
    // Find Aniket
    const aniket = db.prepare("SELECT DISTINCT assignee_id, assignee_name FROM jira_issues WHERE assignee_name LIKE '%niket%'").all();
    console.log("ANIKET:", JSON.stringify(aniket));

    if (aniket.length > 0) {
        const id = aniket[0].assignee_id;
        
        // Count closed in Feb by project
        const byProject = db.prepare("SELECT COUNT(*) as cnt, project_key FROM jira_issues WHERE assignee_id = ? AND completed_date BETWEEN '2026-02-01' AND '2026-02-28' GROUP BY project_key").all(id);
        console.log("FEB_BY_PROJECT:", JSON.stringify(byProject));

        // Count with IN clause
        const combined = db.prepare("SELECT COUNT(*) as cnt FROM jira_issues WHERE assignee_id = ? AND completed_date BETWEEN '2026-02-01' AND '2026-02-28' AND project_key IN ('EI','WI')").all(id);
        console.log("FEB_COMBINED:", JSON.stringify(combined));
    }

    // All project keys
    const projects = db.prepare("SELECT DISTINCT project_key, COUNT(*) as cnt FROM jira_issues GROUP BY project_key").all();
    console.log("PROJECTS:", JSON.stringify(projects));

} catch (e) {
    console.error("ERR:", e.message);
} finally {
    db.close();
}
