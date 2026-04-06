import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b", 
  "gemini-1.5-pro",
  "gemini-1.0-pro",
  "gemini-pro",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest",
  "gemini-pro-vision"
];

async function callGemini(prompt: string, modelName: string) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");
  
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: modelName });
  
  console.log(`\n========================================`);
  console.log(`AI REQUEST [Model: ${modelName}]`);
  console.log(`========================================`);
  console.log(`Input Characters: ${prompt.length}`);
  console.log(`Estimated Input Tokens: ~${Math.ceil(prompt.length / 4)}`);
  
  const startTime = Date.now();
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  const elapsed = Date.now() - startTime;
  
  console.log(`Response Time: ${elapsed}ms`);
  console.log(`Output Characters: ${text.length}`);
  console.log(`Estimated Output Tokens: ~${Math.ceil(text.length / 4)}`);
  console.log(`========================================\n`);
  
  return text;
}

export async function POST(req: Request) {
  try {
    const { action, context, field, current_value, project_context, feature_list, platform_name, phase_title } = await req.json();

    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not found in environment variables");
      return NextResponse.json({ error: "AI API Key not configured. Please add GEMINI_API_KEY to your .env file." }, { status: 500 });
    }

    let prompt = "";
    
    if (action === "generate_business") {
      prompt = `You are an expert business proposal writer. Based on the following project context, generate a CONCISE "Business Understanding" section for a software development proposal.

PROJECT CONTEXT:
"${context}"

Generate content for these THREE specific fields. KEEP EACH FIELD TO 3-4 LINES MAXIMUM:

1. client_overview: A brief 2-3 sentence overview of the client's business and market position. Keep it concise.

2. platform_description: Describe the platform's 3 components in bullet format. Each component description should be 1 short sentence:
   - User App: (what users can do - 1 sentence)
   - Supplier Web: (what suppliers can do - 1 sentence)
   - Admin Web Console: (what admins can do - 1 sentence)

3. value_drivers: 2-3 sentences explaining the unique value this solution brings. Be direct and specific.

IMPORTANT: Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just raw JSON):
{
  "updates": {
    "client_overview": "Brief 2-3 sentence overview here.",
    "platform_description": "The platform comprises 3 components:\\n• User App: Brief description of user capabilities.\\n• Supplier Web: Brief description of supplier features.\\n• Admin Web Console: Brief description of admin controls.",
    "value_drivers": "2-3 sentences about unique value drivers."
  },
  "message": "Business understanding generated successfully."
}`;
    } else if (action === "refine_field") {
      const fieldLabels: Record<string, string> = {
        client_overview: "Client Overview",
        platform_description: "Platform Description",
        value_drivers: "Unique Value Drivers"
      };
      
      prompt = `You are an expert business proposal writer. Refine the "${fieldLabels[field] || field}" field based on user feedback.

PROJECT CONTEXT:
"${project_context || "No additional context provided"}"

CURRENT VALUE:
"${current_value || "Empty"}"

USER'S REFINEMENT REQUEST:
"${context}"

Generate an improved version of this field that addresses the user's feedback while maintaining professional quality.

${field === "platform_description" 
  ? "Format the platform description covering three perspectives: User App, Supplier Web, and Admin Web Console. Use clear structure." 
  : ""}

IMPORTANT: Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "updates": {
    "${field}": "your refined content here"
  },
  "message": "Field refined successfully."
}`;
    } else if (action === "generate_platform_features") {
      const featuresContext = feature_list && feature_list.length > 0 
        ? `\n\nFEATURES FROM REQUIREMENTS (use these as reference):\n${feature_list.map((f: any) => `- ${f.category || 'General'}: ${f.name}`).join('\n')}`
        : "";
      
      prompt = `You are an expert technical proposal writer. Generate a concise description of features for a specific platform in a delivery phase.

PROJECT CONTEXT:
"${project_context || "Software development project"}"

PHASE: ${phase_title || "Development Phase"}
PLATFORM: ${platform_name || "Platform"}
${featuresContext}

CURRENT FEATURES TEXT:
"${current_value || "Empty"}"

USER'S REQUEST:
"${context}"

Based on the features list and context, write a concise, comma-separated list of features/capabilities for the ${platform_name || "platform"} in this phase. Keep it to 4-8 key items that are relevant to this platform. Be specific and actionable.

Example format: "User authentication, Dashboard with analytics, Order management, Real-time notifications, Profile settings"

IMPORTANT: Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "updates": {
    "features": "Feature 1, Feature 2, Feature 3, Feature 4"
  },
  "message": "Features generated successfully."
}`;
    } else if (action === "generate_signoff_requirements") {
      prompt = `You are an expert business proposal writer. Generate sign-off requirements for a software development project.

PROJECT CONTEXT:
"${project_context || "Software development project"}"

USER'S REQUEST:
"${context}"

Generate professional sign-off requirements that include key milestones and acceptance criteria. Keep it concise (3-5 items max).

IMPORTANT: Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "updates": {
    "signoff_requirements": [
      { "stage": "Architecture Review", "description": "Technical architecture and design approval" },
      { "stage": "UAT Sign-off", "description": "User acceptance testing completion" },
      { "stage": "Go-Live Approval", "description": "Final production deployment authorization" }
    ]
  },
  "message": "Sign-off requirements generated successfully."
}`;
    } else if (action === "generate_governance") {
      prompt = `You are an expert business proposal writer. Generate professional governance and communication standards for a software development project.

PROJECT CONTEXT:
"${project_context || "Software development project"}"

USER'S REQUEST:
"${context}"

Generate concise governance items for Cadence, Reporting, and Decision Rights. 

IMPORTANT: Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "updates": {
    "governance_cadence_items": [
      { "key": "Weekly Status Meeting", "value": "Project status review with all stakeholders every Tuesday at 10 AM." },
      { "key": "Sprint Demo", "value": "Bi-weekly demonstration of completed features to the client." }
    ],
    "governance_reporting_items": [
      { "key": "Status Report", "value": "Weekly PDF report covering progress, blockers, and next steps." },
      { "key": "Quality Report", "value": "Monthly summary of QA metrics and bug status." }
    ],
    "governance_decision_items": [
      { "key": "PM", "value": "Project Manager responsible for daily execution and scope management." },
      { "key": "Client Representative", "value": "Primary point of contact for requirements and final approvals." }
    ]
  },
  "message": "Governance items generated successfully."
}`;
    } else if (action === "generate_change_management") {
      prompt = `You are an expert business proposal writer. Generate a change management process for a software development project.

PROJECT CONTEXT:
"${project_context || "Software development project"}"

USER'S REQUEST:
"${context}"

Generate concise items for Process, Classification, and Constraints.

IMPORTANT: Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "updates": {
    "change_process_items": [
      { "key": "Change Request (CR)", "value": "Formal submission of requested changes via email or project tool." },
      { "key": "Impact Assessment", "value": "Review of CR by technical team to estimate effort, cost, and timeline impact." }
    ],
    "change_classification_items": [
      { "key": "Minor Change", "value": "Changes requiring < 8 hours of effort, often handled within current sprint." },
      { "key": "Major Change", "value": "Changes requiring significant effort or architecture changes, necessitating a formal change order." }
    ],
    "change_constraint_items": [
      "No changes allowed 1 week prior to major releases.",
      "All changes must be approved in writing before implementation begins."
    ]
  },
  "message": "Change management process generated successfully."
}`;
    } else if (action === "generate_delivery_phases") {
      const featuresContext = feature_list && feature_list.length > 0 
        ? `\n\nFEATURES LIST (use these as reference for phases):\n${feature_list.map((f: any) => `- ${f.category || 'General'}: ${f.name}`).join('\n')}`
        : "";

      prompt = `You are an expert technical proposal writer. Generate a complete delivery plan with phases and platform-wise features.

PROJECT CONTEXT:
"${project_context || "Software development project"}"
${featuresContext}

USER'S REQUEST:
"${context}"

Generate a 3-4 phase delivery plan. For each phase, provide:
1. title: A concise name for the phase (e.g., MVP Core, Advanced Features, Go-Live)
2. weeks_start and weeks_end: Reasonable timeline (e.g., Phase 1: 0-8, Phase 2: 9-16, etc.)
3. platforms: List of platforms (User App, Supplier Web, Admin Web Console) with comma-separated features for each.

IMPORTANT: Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "updates": {
    "delivery_phases": [
      {
        "title": "MVP Core Development",
        "weeks_start": 0,
        "weeks_end": 8,
        "platforms": [
          { "name": "User App", "features": "Authentication, Basic profile, Search, Ordering" },
          { "name": "Supplier Web", "features": "Onboarding, Product management, Dashboard" },
          { "name": "Admin Web Console", "features": "User management, Analytics, System settings" }
        ]
      },
      {
        "title": "Scale & Optimization",
        "weeks_start": 9,
        "weeks_end": 16,
        "platforms": [
          { "name": "User App", "features": "Payments, Order tracking, Support chat" },
          { "name": "Supplier Web", "features": "Advanced inventory, Promotions, Messaging" },
          { "name": "Admin Web Console", "features": "Financial reports, Marketing tools, Audit logs" }
        ]
      }
    ]
  },
  "message": "Delivery phases generated successfully."
}`;
    } else if (action === "refine_description") {
      prompt = `You are an expert business proposal writer. Refine the description for "${field}" based on user feedback.

PROJECT CONTEXT:
"${project_context || "No additional context provided"}"

CURRENT VALUE:
"${current_value || "Empty"}"

USER'S REFINEMENT REQUEST:
"${context}"

Generate an improved, concise description (2-4 sentences max) that addresses the user's feedback.

IMPORTANT: Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "updates": {
    "value": "Your refined description here (2-4 sentences max)"
  },
  "message": "Description refined successfully."
}`;
    } else {
      return NextResponse.json({ error: "Invalid action. Use 'generate_business', 'refine_field', or 'generate_platform_features'." }, { status: 400 });
    }

    let lastError: Error | null = null;
    
    for (const modelName of MODELS) {
      try {
        console.log(`Attempting with model: ${modelName}`);
        const text = await callGemini(prompt, modelName);
        
        let jsonStr = text.trim();
        if (jsonStr.startsWith("```json")) {
          jsonStr = jsonStr.slice(7);
        }
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith("```")) {
          jsonStr = jsonStr.slice(0, -3);
        }
        jsonStr = jsonStr.trim();
        
        const jsonStart = jsonStr.indexOf("{");
        const jsonEnd = jsonStr.lastIndexOf("}") + 1;
        
        if (jsonStart === -1 || jsonEnd === 0) {
          throw new Error("AI response did not contain valid JSON");
        }
        
        jsonStr = jsonStr.substring(jsonStart, jsonEnd);
        const aiResult = JSON.parse(jsonStr);
        
        console.log(`SUCCESS with model: ${modelName}`);
        return NextResponse.json(aiResult);
        
      } catch (e: any) {
        console.error(`FAILED with model ${modelName}: ${e.message}`);
        lastError = e;
        continue;
      }
    }

    console.error("All models failed. Last error:", lastError?.message);
    return NextResponse.json({ 
      error: `AI generation failed after trying all models. ${lastError?.message || "Unknown error"}` 
    }, { status: 500 });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
