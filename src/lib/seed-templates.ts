import postgres from "postgres";

const INDUSTRY_STANDARD_TEMPLATE_ID = "d7b6f8a1-c2b3-4d5e-a6f7-1234567890ab";

const INDUSTRY_STANDARD_TEMPLATE = {
  id: INDUSTRY_STANDARD_TEMPLATE_ID,
  name: "Industry-Standard Multi-Platform Delivery Proposal",
  description: "Universal software project proposal with phases, scope, resources, pricing, governance, and deliverables.",
  proposal_type: "Multi-Platform Delivery",
  industry: "Universal",
  tone: "Professional",
  content: [
    { id: "meta-h", type: "heading", level: 1, content: "1. Proposal Metadata" },
    { id: "meta-section", type: "chart", visualPlaceholder: "proposal_metadata" },
    { id: "biz-h", type: "heading", level: 1, content: "2. Summary of Business Understanding" },
    { id: "biz-p1-c", type: "paragraph", content: "{{client_overview}}" },
    { id: "biz-p2-c", type: "paragraph", content: "{{platform_description}}" },
    { id: "biz-p3-c", type: "paragraph", content: "{{value_drivers}}" },
    { id: "feat-h", type: "heading", level: 1, content: "3. Features & Requirements" },
    { id: "feat-section", type: "chart", visualPlaceholder: "features_list_section" },
    { id: "plan-h", type: "heading", level: 1, content: "4. Delivery Plan (Phases & Timelines)" },
    { id: "plan-block", type: "chart", visualPlaceholder: "delivery_plan" },
    { id: "res-h", type: "heading", level: 1, content: "5. Resource Engagement" },
    { id: "res-block", type: "chart", visualPlaceholder: "resource_engagement" },
    { id: "price-h", type: "heading", level: 1, content: "6. Pricing & Commercials" },
    { id: "price-block", type: "chart", visualPlaceholder: "pricing_section" },
    { id: "task-h", type: "heading", level: 1, content: "7. Tasks Involved" },
    { id: "task-section", type: "chart", visualPlaceholder: "tasks_section" },
    { id: "deliv-h", type: "heading", level: 1, content: "8. Deliverables" },
    { id: "deliv-section", type: "chart", visualPlaceholder: "deliverables_section" },
    { id: "assump-h", type: "heading", level: 1, content: "9. Assumptions" },
    { id: "assump-section", type: "chart", visualPlaceholder: "assumptions_section" },
    { id: "dep-h", type: "heading", level: 1, content: "10. Dependencies" },
    { id: "dep-section", type: "chart", visualPlaceholder: "dependencies_section" },
    { id: "gov-h", type: "heading", level: 1, content: "11. Governance & Communication" },
    { id: "gov-section", type: "chart", visualPlaceholder: "governance_section" },
    { id: "chng-h", type: "heading", level: 1, content: "12. Change Management" },
    { id: "chng-section", type: "chart", visualPlaceholder: "change_management_section" },
    { id: "sign-h", type: "heading", level: 1, content: "13. Sign-offs" },
    { id: "sign-section", type: "chart", visualPlaceholder: "signoff_requirements_section" }
  ],
  placeholders_schema: [
    { key: "subtitle", type: "text", label: "Subtitle" },
    { key: "client_name", type: "text", label: "Client Name", required: true },
    { key: "client_industry", type: "text", label: "Client Industry" },
    { key: "region", type: "text", label: "Region" },
    { key: "version", type: "text", label: "Version", defaultValue: "1.0" },
    { key: "author_name", type: "text", label: "Author Name" },
    { key: "start_date", type: "date", label: "Start Date" },
    { key: "validity_period", type: "text", label: "Validity Period" },
    { key: "confidentiality_level", type: "select", label: "Confidentiality", options: ["Low", "Medium", "High", "Confidential"] },
    { key: "client_overview", type: "textarea", label: "Client Overview" },
    { key: "business_goals", type: "textarea", label: "Business Goals" },
    { key: "problem_statements", type: "textarea", label: "Problem Statements" },
    { key: "platforms", type: "textarea", label: "Platforms" },
    { key: "value_drivers", type: "textarea", label: "Value Drivers" },
    { key: "success_metrics", type: "textarea", label: "Success Metrics" },
    { key: "system_capabilities_summary", type: "textarea", label: "System Capabilities Summary" },
    { key: "team_size", type: "number", label: "Team Size" },
    { key: "resource_justification", type: "textarea", label: "Resource Justification" },
    { key: "pricing_model", type: "text", label: "Pricing Model" },
    { key: "total_cost", type: "number", label: "Total Cost" },
    { key: "tax_percent", type: "number", label: "Tax Percent" },
    { key: "pricing_notes", type: "textarea", label: "Pricing Notes" },
    { key: "tasks_summary", type: "textarea", label: "Tasks Summary" },
    { key: "deliverables", type: "textarea", label: "Deliverables" },
    { key: "deliverable_architecture", type: "textarea", label: "Architecture Benefits" },
    { key: "deliverable_code", type: "textarea", label: "Code Benefits" },
    { key: "deliverable_testing", type: "textarea", label: "Testing Benefits" },
    { key: "deliverable_design", type: "textarea", label: "Design Benefits" },
    { key: "deliverable_ai", type: "textarea", label: "AI Benefits" },
    { key: "deliverable_deployment", type: "textarea", label: "Deployment Benefits" },
    { key: "assumptions_list", type: "textarea", label: "Assumptions" },
    { key: "dependencies_list", type: "textarea", label: "Dependencies" },
    { key: "exclusions_list", type: "textarea", label: "Exclusions" },
    { key: "governance_cadence_list", type: "textarea", label: "Governance Cadence" },
    { key: "governance_reporting_list", type: "textarea", label: "Governance Reporting" },
    { key: "compliance_access_notes", type: "textarea", label: "Compliance Notes" },
    { key: "change_management_process", type: "textarea", label: "Change Process" },
    { key: "change_constraints_list", type: "textarea", label: "Change Constraints" },
    { key: "signoffs_list", type: "textarea", label: "Sign-offs" },
    { key: "baseline_reference_link", type: "text", label: "Baseline Link" },
    { key: "platform_description", type: "textarea", label: "Platform Description" }
  ],
  visual_placeholders: [
    { id: "fl", name: "feature_list", type: "table", schema: { columns: [{ key: "name", type: "string", label: "Feature" }, { key: "category", type: "string", label: "Category" }, { key: "phase", type: "string", label: "Phase" }, { key: "priority", type: "string", label: "Priority" }] } },
    { id: "dp", name: "delivery_plan", type: "chart", chartType: "custom" },
    { id: "re", name: "resource_engagement", type: "chart", chartType: "custom" },
    { id: "ps", name: "pricing_section", type: "chart", chartType: "custom" },
    { id: "rp", name: "resource_plan", type: "table", schema: { columns: [{ key: "role", type: "string", label: "Role" }, { key: "count", type: "number", label: "Count" }, { key: "allocation", type: "number", label: "Allocation" }, { key: "phases", type: "string", label: "Phases" }] } },
    { id: "ppt", name: "phase_pricing_table", type: "table", schema: { columns: [{ key: "phase", type: "string", label: "Phase" }, { key: "cost", type: "currency", label: "Cost" }] } },
    { id: "pmt", name: "payment_milestones_table", type: "table", schema: { columns: [{ key: "milestone", type: "string", label: "Milestone" }, { key: "percentage", type: "number", label: "Percentage" }, { key: "amount", type: "currency", label: "Amount" }] } }
  ],
  status: "published",
  tags: [],
  fixed_sections: [],
  version: "1.0",
  author_name: "Orchids AI",
  is_permanent: true
};

export async function ensureIndustryStandardTemplate(sql: postgres.Sql): Promise<void> {
  try {
    const [existing] = await sql`
      SELECT id FROM templates WHERE id = ${INDUSTRY_STANDARD_TEMPLATE_ID}
    `;

    if (!existing) {
      console.log("[Seed] Industry standard template not found. Creating...");
      
      await sql`
        INSERT INTO templates (
          id, name, description, proposal_type, industry, tone,
          content, placeholders_schema, visual_placeholders,
          status, tags, fixed_sections, version, author_name, is_permanent,
          created_at, updated_at
        ) VALUES (
          ${INDUSTRY_STANDARD_TEMPLATE.id},
          ${INDUSTRY_STANDARD_TEMPLATE.name},
          ${INDUSTRY_STANDARD_TEMPLATE.description},
          ${INDUSTRY_STANDARD_TEMPLATE.proposal_type},
          ${INDUSTRY_STANDARD_TEMPLATE.industry},
          ${INDUSTRY_STANDARD_TEMPLATE.tone},
          ${JSON.stringify(INDUSTRY_STANDARD_TEMPLATE.content)}::jsonb,
          ${JSON.stringify(INDUSTRY_STANDARD_TEMPLATE.placeholders_schema)}::jsonb,
          ${JSON.stringify(INDUSTRY_STANDARD_TEMPLATE.visual_placeholders)}::jsonb,
          ${INDUSTRY_STANDARD_TEMPLATE.status},
          ${sql.array(INDUSTRY_STANDARD_TEMPLATE.tags)},
          ${JSON.stringify(INDUSTRY_STANDARD_TEMPLATE.fixed_sections)}::jsonb,
          ${INDUSTRY_STANDARD_TEMPLATE.version},
          ${INDUSTRY_STANDARD_TEMPLATE.author_name},
          ${INDUSTRY_STANDARD_TEMPLATE.is_permanent},
          NOW(),
          NOW()
        )
      `;
      
      console.log("[Seed] Industry standard template created successfully.");
    }
  } catch (error) {
    console.error("[Seed] Error ensuring industry standard template:", error);
  }
}

export { INDUSTRY_STANDARD_TEMPLATE_ID, INDUSTRY_STANDARD_TEMPLATE };
