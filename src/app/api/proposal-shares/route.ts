import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proposal_id, expires_in_days, password, max_views, created_by } = body;

    if (!proposal_id) {
      return NextResponse.json({ error: "proposal_id is required" }, { status: 400 });
    }

    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select("id, title, client_name")
      .eq("id", proposal_id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const clientSlug = slugify(proposal.client_name || "client");
    const proposalSlug = slugify(proposal.title || "proposal");
    const shortId = crypto.randomBytes(4).toString("hex");
    const share_token = `${clientSlug}-${proposalSlug}-${shortId}`;
    
    const expires_at = expires_in_days
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const password_hash = password ? hashPassword(password) : null;

    const { data: share, error: shareError } = await supabase
      .from("proposal_shares")
      .insert({
        proposal_id,
        share_token,
        expires_at,
        password_hash,
        max_views: max_views || null,
        created_by: created_by || "system",
        is_active: true,
      })
      .select()
      .single();

    if (shareError) {
      console.error("Error creating share:", shareError);
      return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
    }

    return NextResponse.json({
      share_id: share.id,
      share_token: share.share_token,
      share_url: `/view/${share.share_token}`,
      expires_at: share.expires_at,
      has_password: !!password_hash,
      max_views: share.max_views,
    });
  } catch (error) {
    console.error("Error in POST /api/proposal-shares:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const proposal_id = searchParams.get("proposal_id");

    if (!proposal_id) {
      return NextResponse.json({ error: "proposal_id is required" }, { status: 400 });
    }

    const { data: shares, error } = await supabase
      .from("proposal_shares")
      .select("*")
      .eq("proposal_id", proposal_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching shares:", error);
      return NextResponse.json({ error: "Failed to fetch shares" }, { status: 500 });
    }

    return NextResponse.json(
      shares.map((s) => ({
        ...s,
        has_password: !!s.password_hash,
        password_hash: undefined,
      }))
    );
  } catch (error) {
    console.error("Error in GET /api/proposal-shares:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const share_id = searchParams.get("share_id");

    if (!share_id) {
      return NextResponse.json({ error: "share_id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("proposal_shares")
      .delete()
      .eq("id", share_id);

    if (error) {
      console.error("Error deleting share:", error);
      return NextResponse.json({ error: "Failed to delete share" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/proposal-shares:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { share_id, is_active } = body;

    if (!share_id) {
      return NextResponse.json({ error: "share_id is required" }, { status: 400 });
    }

    const { data: share, error } = await supabase
      .from("proposal_shares")
      .update({ is_active })
      .eq("id", share_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating share:", error);
      return NextResponse.json({ error: "Failed to update share" }, { status: 500 });
    }

    return NextResponse.json(share);
  } catch (error) {
    console.error("Error in PATCH /api/proposal-shares:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
