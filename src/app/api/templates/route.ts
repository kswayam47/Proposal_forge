import { NextResponse } from "next/server";
import postgres from "postgres";
import { ensureIndustryStandardTemplate } from "@/lib/seed-templates";

const connectionString = process.env.DATABASE_URL!;

export async function GET() {
  const sql = postgres(connectionString, { ssl: "require" });
  
  try {
    await ensureIndustryStandardTemplate(sql);
    
    const templates = await sql`
      SELECT * FROM templates ORDER BY created_at DESC
    `;
    
    await sql.end();
    return NextResponse.json({ templates });
  } catch (err) {
    console.error("Database error:", err);
    await sql.end();
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const sql = postgres(connectionString, { ssl: "require" });
  try {
    const body = await request.json();
    
    // Extract fields, mapping them to the database columns
    const { 
      name, 
      description, 
      proposal_type, 
      content, 
      sections, 
      variables, 
      tags, 
      status = 'draft' 
    } = body;

    const [template] = await sql`
      INSERT INTO templates (
        name, 
        description, 
        proposal_type, 
        content, 
        sections, 
        variables, 
        tags, 
        status
      ) VALUES (
        ${name}, 
        ${description}, 
        ${proposal_type}, 
        ${content}, 
        ${JSON.stringify(sections)}, 
        ${JSON.stringify(variables)}, 
        ${tags}, 
        ${status}
      )
      RETURNING *
    `;

    await sql.end();
    return NextResponse.json({ template });
  } catch (err) {
    console.error("Server error:", err);
    await sql.end();
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const sql = postgres(connectionString, { ssl: "require" });
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      await sql.end();
      return NextResponse.json({ error: "Missing template ID" }, { status: 400 });
    }

    const [template] = await sql`
      SELECT is_permanent FROM templates WHERE id = ${id}
    `;

    if (template?.is_permanent) {
      await sql.end();
      return NextResponse.json({ error: "Cannot delete permanent template" }, { status: 403 });
    }

    const [proposalCount] = await sql`
      SELECT COUNT(*) as count FROM proposals WHERE template_id = ${id}
    `;

    if (proposalCount && parseInt(proposalCount.count) > 0) {
      await sql.end();
      return NextResponse.json({ 
        error: `Cannot delete template: ${proposalCount.count} proposal(s) are using this template. Delete the proposals first.` 
      }, { status: 400 });
    }

    await sql`
      DELETE FROM templates WHERE id = ${id}
    `;

    await sql.end();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Server error:", err);
    await sql.end();
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
