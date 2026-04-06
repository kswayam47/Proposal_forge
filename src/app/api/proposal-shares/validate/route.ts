import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const { data: share, error: shareError } = await supabase
      .from("proposal_shares")
      .select("*")
      .eq("share_token", token)
      .single();

    if (shareError || !share) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
    }

    if (!share.is_active) {
      return NextResponse.json({ error: "This link has been deactivated" }, { status: 403 });
    }

    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json({ error: "This link has expired" }, { status: 403 });
    }

    if (share.max_views && share.view_count >= share.max_views) {
      return NextResponse.json({ error: "Maximum views reached for this link" }, { status: 403 });
    }

    if (share.password_hash) {
      if (!password) {
        return NextResponse.json({ 
          requires_password: true,
          error: "Password required" 
        }, { status: 401 });
      }
      
      const providedHash = hashPassword(password);
      if (providedHash !== share.password_hash) {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
    }

    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select(`
        *,
        template:templates(*)
      `)
      .eq("id", share.proposal_id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    await supabase
      .from("proposal_shares")
      .update({ 
        view_count: share.view_count + 1,
        last_viewed_at: new Date().toISOString()
      })
      .eq("id", share.id);

    return NextResponse.json({
        proposal: {
          id: proposal.id,
          title: proposal.title,
          subtitle: proposal.subtitle,
          client_name: proposal.client_name,
          client_industry: proposal.client_industry,
          region: proposal.region,
          validity_period: proposal.validity_period,
          start_date: proposal.start_date,
          author_name: proposal.author_name,
          filled_data: proposal.filled_data,
          content: proposal.content,
          visual_placeholders: proposal.visual_placeholders,
          rendered_content: proposal.rendered_content,
          template: proposal.template,
          created_at: proposal.created_at,
          header_image_url: proposal.header_image_url,
          graph_color_palette: proposal.graph_color_palette,
        },
      share: {
        expires_at: share.expires_at,
        view_count: share.view_count + 1,
        max_views: share.max_views,
      }
    });
  } catch (error) {
    console.error("Error in POST /api/proposal-shares/validate:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
