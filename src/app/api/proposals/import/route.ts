import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const INTERNAL_SECRET = process.env.NEXT_PUBLIC_INTERNAL_SHARED_SECRET || "";
const INDUSTRY_STANDARD_TEMPLATE_ID = "d7b6f8a1-c2b3-4d5e-a6f7-1234567890ab";

/**
 * Internal API endpoint for cross-app integration.
 * Creates a new proposal from externally provided feature list (e.g. from QA Forge).
 *
 * Protected by x-internal-secret header instead of session auth.
 */
export async function POST(request: Request) {
  try {
    // ── Validate shared secret ──
    const secret = request.headers.get("x-internal-secret");
    if (!secret || secret !== INTERNAL_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized: invalid or missing internal secret" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      project_name,
      feature_list,
      client_name,
      project_description,
    } = body;

    if (!title || !feature_list || !Array.isArray(feature_list)) {
      return NextResponse.json(
        { error: "Missing required fields: title, feature_list (array)" },
        { status: 400 }
      );
    }

    // ── Verify the template exists ──
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("id, content, placeholders_schema, visual_placeholders")
      .eq("id", INDUSTRY_STANDARD_TEMPLATE_ID)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Industry-Standard template not found in database" },
        { status: 500 }
      );
    }

    // ── Parse template data ──
    const contentData =
      typeof template.content === "string"
        ? JSON.parse(template.content)
        : template.content;
    const visualPlaceholders =
      typeof template.visual_placeholders === "string"
        ? JSON.parse(template.visual_placeholders)
        : template.visual_placeholders;
    const placeholdersSchema =
      typeof template.placeholders_schema === "string"
        ? JSON.parse(template.placeholders_schema)
        : template.placeholders_schema || [];

    // ── Build default filled_data from template defaults ──
    const defaultData: Record<string, unknown> = {};
    placeholdersSchema.forEach(
      (field: { key: string; defaultValue?: unknown }) => {
        if (field.defaultValue !== undefined) {
          defaultData[field.key] = field.defaultValue;
        }
      }
    );

    // ── Merge in the feature list and project context ──
    const filledData: Record<string, unknown> = {
      ...defaultData,
      feature_list: feature_list,
      client_name: client_name || project_name || "",
      client_overview: project_description || "",
    };

    // ── Create proposal ──
    const { data: proposal, error: insertError } = await supabase
      .from("proposals")
      .insert({
        title,
        template_id: INDUSTRY_STANDARD_TEMPLATE_ID,
        content: contentData,
        visual_placeholders: visualPlaceholders,
        filled_data: filledData,
        status: "draft",
        client_name: client_name || project_name || null,
        created_by: "qa-forge-import",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Import] Supabase insert error:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    const proposalUrl = `/proposals/${proposal.id}`;

    return NextResponse.json({
      success: true,
      proposal_id: proposal.id,
      proposal_url: proposalUrl,
      features_imported: feature_list.length,
    });
  } catch (err) {
    console.error("[Import] Server error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
