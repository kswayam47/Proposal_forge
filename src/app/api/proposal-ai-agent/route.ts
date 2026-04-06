import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { description, templateFields } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "AI API Key not configured" }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
      You are an expert solution architect and proposal writer. 
      The user wants to build a software system described as: "${description}"
      
      Based on this description, fill in the following template fields for a professional proposal.
      ONLY fill in fields that can be inferred from the description (functionalities, purpose, summaries, assumptions).
      DO NOT fill in fields that require specific user input like budget (base_price, total_price), specific dates (project_start_date), or team names.
      
      Fields to potentially fill (if applicable):
      ${templateFields.map((f: any) => `- ${f.key} (${f.label})`).join("\n")}
      
      Guidelines:
      1. Be professional and detailed.
      2. For features, provide a concise but comprehensive summary.
      3. For purpose/summaries, explain the value and goal.
      4. For assumptions, list standard technical and business assumptions related to the project.
      5. Return ONLY a JSON object where keys are the field keys and values are the generated content.
      
      Example Response Format:
      {
        "core_value_statement": "To streamline operations...",
        "user_app_purpose": "Provide a seamless experience for...",
        "user_features_summary": "1. Login... 2. Dashboard...",
        "assumptions_list": "1. Client will provide APIs... 2. Third-party services..."
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}") + 1;
      const jsonStr = text.substring(jsonStart, jsonEnd);
      const updates = JSON.parse(jsonStr);
      return NextResponse.json({ updates });
    } catch (e) {
      console.error("Failed to parse AI response:", text);
      return NextResponse.json({ error: "Failed to process AI response" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
