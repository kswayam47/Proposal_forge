import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    let body;
    try {
      const text = await request.text();
      try {
        body = JSON.parse(text);
      } catch (e) {
        // Handle cases where body might be wrapped in extra quotes
        const trimmed = text.trim();
        if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
          body = JSON.parse(trimmed.slice(1, -1));
        } else {
          throw e;
        }
      }
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    const { proposalType, industry, serviceDescription, tone } = body;

    const prompt = `You are an elite enterprise proposal architect. Create an exceptionally detailed, 15+ page professional business proposal template.

CONTEXT:
- Proposal Type: "${proposalType || 'Enterprise Business Proposal'}"
- Industry: "${industry || 'Technology & Professional Services'}"
- Service/Product: "${serviceDescription || 'Enterprise Digital Transformation Solutions'}"
- Tone: "${tone || 'Executive-level Professional'}"

CRITICAL REQUIREMENTS:

1. **LENGTH & DEPTH** (MANDATORY):
   - Generate AT LEAST 50 content blocks
   - Each paragraph must be 4-6 sentences of substantive, enterprise-grade content
   - Use industry-specific terminology and executive language
   - Include specific metrics, percentages, and timeframes where relevant
   - Bold important terms using **bold** syntax
   - Structure content with clear hierarchies

2. **MANDATORY SECTIONS** (ALL REQUIRED with detailed multi-paragraph content):

   A. COVER & INTRODUCTION (Pages 1-2):
   - Professional Cover Page with branding
   - Confidentiality & Non-Disclosure Statement
   - Table of Contents reference

   B. EXECUTIVE OVERVIEW (Pages 3-4):
   - Executive Summary (3 detailed paragraphs minimum)
   - Strategic Value Proposition
   - Key Success Metrics & KPIs

   C. CLIENT & CONTEXT ANALYSIS (Pages 5-6):
   - Client Organization Profile
   - Current State Assessment
   - Business Challenges & Pain Points (detailed analysis)
   - Strategic Objectives Alignment

   D. SOLUTION ARCHITECTURE (Pages 7-9):
   - Proposed Solution Overview (comprehensive)
   - Technical Architecture & Framework
   - Innovation & Differentiating Features
   - Integration Strategy
   - **MUST include Architecture Diagram placeholder**

   E. IMPLEMENTATION FRAMEWORK (Pages 10-12):
   - Project Methodology (Agile/Waterfall/Hybrid details)
   - Phased Implementation Approach
   - Detailed Timeline with Milestones
   - Resource Allocation Matrix
   - **MUST include Timeline Chart (bar chart)**
   - **MUST include Milestones Table**

   F. DELIVERABLES & SCOPE (Pages 13-14):
   - Comprehensive Deliverables Matrix
   - In-Scope Items (detailed breakdown)
   - Out-of-Scope Items (explicit exclusions)
   - Acceptance Criteria
   - **MUST include Deliverables Table**

   G. INVESTMENT & COMMERCIAL (Pages 15-17):
   - Investment Summary with ROI projection
   - Detailed Pricing Breakdown by Phase
   - Payment Schedule & Terms
   - Value Analysis & Cost-Benefit
   - **MUST include Budget Breakdown Chart (pie chart)**
   - **MUST include ROI Projection Chart (line chart)**
   - **MUST include Pricing Table**

   H. GOVERNANCE & RISK (Pages 18-19):
   - Project Governance Structure
   - Roles & Responsibilities Matrix
   - Risk Assessment & Mitigation Plan
   - Change Management Process
   - **MUST include Risk Matrix Table**
   - **MUST include Team Structure Table**

   I. QUALITY & SUPPORT (Pages 20-21):
   - Quality Assurance Framework
   - Testing Methodology
   - Post-Implementation Support
   - Training & Knowledge Transfer Plan
   - Service Level Agreement Terms

   J. COMPANY CREDENTIALS (Pages 22-23):
   - Company Overview & History
   - Core Competencies & Capabilities
   - Industry Certifications & Partnerships
   - Case Studies (2-3 detailed examples)
   - Client Testimonials
   - **MUST include Company Logo placeholder**
   - **MUST include Case Study Image placeholders**

   K. TERMS & CLOSING (Pages 24-25):
   - Terms & Conditions
   - Intellectual Property Rights
   - Confidentiality Terms
   - Next Steps & Call to Action
   - Signature Blocks

3. **VISUAL ELEMENTS** (ALL MANDATORY):
   Every visual MUST have a complete schema with columns array:
   
   REQUIRED CHARTS:
   - BudgetAllocationChart (pie) - Investment distribution
   - ProjectTimelineChart (bar) - Timeline visualization  
   - ROIProjectionChart (line) - Return on investment over time
   - RiskHeatmapChart (bar) - Risk levels visualization

   REQUIRED TABLES:
   - DeliverablesMatrix - All deliverables with dates
   - PricingBreakdown - Detailed cost structure
   - MilestonesTable - Project milestones
   - RiskAssessmentMatrix - Risk analysis
   - TeamRolesMatrix - Team responsibilities

   REQUIRED IMAGES:
   - CompanyLogo - Branding
   - SolutionArchitectureDiagram - Technical overview
   - CaseStudyImage1 - Success story visual
   - TeamOrgChart - Organization structure

4. **FORMATTING REQUIREMENTS**:
   - Use **bold** for key terms, metrics, and important phrases
   - Use proper heading hierarchy (level 1 for main sections, level 2 for subsections)
   - Include bullet lists for features and benefits
   - Use professional enterprise language throughout

OUTPUT JSON STRUCTURE:
{
  "content": [
    { "id": "uuid", "type": "heading", "level": 1, "content": "Section Title" },
    { "id": "uuid", "type": "paragraph", "content": "Detailed content with **bold emphasis** and {{placeholders}}. Multiple sentences with professional depth." },
    { "id": "uuid", "type": "list", "items": ["Item 1", "Item 2", "Item 3"] },
    { "id": "uuid", "type": "table", "visualPlaceholder": "TableName" },
    { "id": "uuid", "type": "chart", "visualPlaceholder": "ChartName" },
    { "id": "uuid", "type": "image", "visualPlaceholder": "ImageName", "optional": true }
  ],
  "placeholders": [
    { "key": "client_name", "label": "Client Organization Name", "type": "text", "required": true },
    { "key": "proposal_date", "label": "Proposal Date", "type": "date", "required": true },
    { "key": "validity_days", "label": "Validity Period (Days)", "type": "number", "required": true },
    { "key": "your_company", "label": "Your Company Name", "type": "text", "required": true },
    { "key": "executive_summary", "label": "Executive Summary", "type": "textarea", "required": true },
    { "key": "client_background", "label": "Client Background", "type": "textarea", "required": true },
    { "key": "problem_statement", "label": "Business Challenges", "type": "textarea", "required": true },
    { "key": "proposed_solution", "label": "Proposed Solution", "type": "textarea", "required": true },
    { "key": "total_investment", "label": "Total Investment", "type": "currency", "required": true },
    { "key": "project_duration", "label": "Project Duration", "type": "text", "required": true },
    { "key": "contact_name", "label": "Contact Person", "type": "text", "required": true },
    { "key": "contact_email", "label": "Contact Email", "type": "text", "required": true },
    { "key": "payment_terms", "label": "Payment Terms", "type": "textarea", "required": true }
  ],
  "visualPlaceholders": [
    {
      "id": "uuid",
      "type": "chart",
      "name": "BudgetAllocationChart",
      "chartType": "pie",
      "schema": {
        "columns": [
          { "key": "category", "label": "Category", "type": "string" },
          { "key": "amount", "label": "Amount ($)", "type": "currency" }
        ],
        "description": "Investment distribution across project phases",
        "insights": "This chart visualizes how the total investment is allocated across different project components, helping stakeholders understand resource distribution."
      }
    },
    {
      "id": "uuid",
      "type": "chart",
      "name": "ProjectTimelineChart",
      "chartType": "bar",
      "schema": {
        "columns": [
          { "key": "phase", "label": "Phase", "type": "string" },
          { "key": "weeks", "label": "Duration (Weeks)", "type": "number" }
        ],
        "description": "Project phases and their durations",
        "insights": "Visualizes the timeline showing each project phase duration for clear project planning and stakeholder communication."
      }
    },
    {
      "id": "uuid",
      "type": "chart",
      "name": "ROIProjectionChart",
      "chartType": "line",
      "schema": {
        "columns": [
          { "key": "period", "label": "Time Period", "type": "string" },
          { "key": "roi_percent", "label": "ROI (%)", "type": "number" }
        ],
        "description": "Projected return on investment over time",
        "insights": "Shows the expected ROI trajectory, highlighting the break-even point and long-term value realization."
      }
    },
    {
      "id": "uuid",
      "type": "table",
      "name": "DeliverablesMatrix",
      "schema": {
        "columns": [
          { "key": "deliverable", "label": "Deliverable", "type": "string" },
          { "key": "description", "label": "Description", "type": "string" },
          { "key": "due_date", "label": "Due Date", "type": "string" }
        ],
        "description": "Comprehensive list of project deliverables",
        "insights": "Complete matrix of all deliverables with descriptions and expected delivery dates."
      }
    },
    {
      "id": "uuid",
      "type": "table",
      "name": "PricingBreakdown",
      "schema": {
        "columns": [
          { "key": "item", "label": "Line Item", "type": "string" },
          { "key": "quantity", "label": "Qty", "type": "number" },
          { "key": "unit_price", "label": "Unit Price", "type": "currency" },
          { "key": "total", "label": "Total", "type": "currency" }
        ],
        "description": "Detailed pricing breakdown",
        "insights": "Itemized cost breakdown showing transparent pricing structure."
      }
    },
    {
      "id": "uuid",
      "type": "table",
      "name": "RiskAssessmentMatrix",
      "schema": {
        "columns": [
          { "key": "risk", "label": "Risk", "type": "string" },
          { "key": "impact", "label": "Impact", "type": "string" },
          { "key": "probability", "label": "Probability", "type": "string" },
          { "key": "mitigation", "label": "Mitigation Strategy", "type": "string" }
        ],
        "description": "Risk assessment and mitigation strategies",
        "insights": "Comprehensive risk analysis with proactive mitigation strategies."
      }
    },
    {
      "id": "uuid",
      "type": "table",
      "name": "MilestonesTable",
      "schema": {
        "columns": [
          { "key": "milestone", "label": "Milestone", "type": "string" },
          { "key": "target_date", "label": "Target Date", "type": "string" },
          { "key": "deliverables", "label": "Key Deliverables", "type": "string" }
        ],
        "description": "Project milestones and key dates",
        "insights": "Critical project milestones for tracking progress and ensuring timely delivery."
      }
    },
    {
      "id": "uuid",
      "type": "table",
      "name": "TeamRolesMatrix",
      "schema": {
        "columns": [
          { "key": "role", "label": "Role", "type": "string" },
          { "key": "name", "label": "Name", "type": "string" },
          { "key": "responsibilities", "label": "Key Responsibilities", "type": "string" }
        ],
        "description": "Project team roles and responsibilities",
        "insights": "Clear delineation of team structure and accountability."
      }
    },
    {
      "id": "uuid",
      "type": "image",
      "name": "CompanyLogo",
      "optional": true,
      "schema": {
        "columns": [],
        "description": "Company branding logo",
        "insights": "Professional branding element for proposal header"
      }
    },
    {
      "id": "uuid",
      "type": "image",
      "name": "SolutionArchitectureDiagram",
      "optional": true,
      "schema": {
        "columns": [],
        "description": "Technical solution architecture diagram",
        "insights": "Visual representation of the proposed technical architecture"
      }
    }
  ]
}

IMPORTANT: Generate comprehensive, professional content. Each section must have real substance. Return ONLY valid JSON with no markdown formatting.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const MODELS = [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-pro",
      "gemini-1.5-flash-8b"
    ];
    
    let retryCount = 0;
    const maxRetries = MODELS.length;

    while (retryCount < maxRetries) {
      const modelName = MODELS[retryCount];
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 }
      });


      try {
        console.log(`Using model: ${modelName} (Attempt ${retryCount + 1})`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) text = jsonMatch[0];
        else text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        const parsed = JSON.parse(text);
        
        parsed.content = (parsed.content || []).map((block: Record<string, unknown>) => ({ 
          ...block, 
          id: block.id || uuidv4() 
        }));
        
        if (parsed.visualPlaceholders) {
          parsed.visualPlaceholders = parsed.visualPlaceholders.map((vp: Record<string, unknown>) => {
            const processed = { ...vp, id: vp.id || uuidv4() };
            if (!processed.schema) {
              processed.schema = {
                columns: [
                  { key: "label", label: "Label", type: "string" },
                  { key: "value", label: "Value", type: "number" }
                ],
                description: `Data for ${vp.name}`,
                insights: "Interactive visualization with hover insights"
              };
            }
            return processed;
          });
        }
        
        return NextResponse.json(parsed);
      } catch (error) {
        console.warn(`AI attempt ${retryCount + 1} failed:`, (error as Error).message);
        const errorMessage = (error as Error).message || '';
        const errorStatus = (error as { status?: number }).status;
        
        if (errorStatus === 429 || errorMessage.includes('429') || errorMessage.includes('quota')) {
          retryCount++;
          if (retryCount <= maxRetries) {
            const delay = Math.pow(2, retryCount) * 2500 + Math.random() * 2000;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        if (errorStatus === 404 || errorMessage.includes('404') || errorMessage.includes('not found')) {
          retryCount++;
          continue;
        }
        break;
      }
    }

    return NextResponse.json({ error: "Failed to generate template" }, { status: 500 });
  } catch (error) {
    console.error("Template generation error:", error);
    return NextResponse.json({ error: "Failed to generate template" }, { status: 500 });
  }
}
