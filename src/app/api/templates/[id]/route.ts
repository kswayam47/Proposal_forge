import { NextResponse } from "next/server";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = postgres(connectionString, { ssl: "require" });

  try {
    const [template] = await sql`
      SELECT * FROM templates WHERE id = ${id}
    `;

    await sql.end();

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (err) {
    console.error("Database error:", err);
    await sql.end();
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = postgres(connectionString, { ssl: "require" });

  try {
    const body = await request.json();
    const {
      name,
      description,
      proposal_type,
      content,
      sections,
      variables,
      placeholders_schema,
      visual_placeholders,
      fixed_sections,
      tags,
      status,
    } = body;

    const [template] = await sql`
      UPDATE templates SET
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        proposal_type = COALESCE(${proposal_type}, proposal_type),
        content = COALESCE(${content ? JSON.stringify(content) : null}::jsonb, content),
        sections = COALESCE(${sections ? JSON.stringify(sections) : null}::jsonb, sections),
        variables = COALESCE(${variables ? JSON.stringify(variables) : null}::jsonb, variables),
        placeholders_schema = COALESCE(${placeholders_schema ? JSON.stringify(placeholders_schema) : null}::jsonb, placeholders_schema),
        visual_placeholders = COALESCE(${visual_placeholders ? JSON.stringify(visual_placeholders) : null}::jsonb, visual_placeholders),
        fixed_sections = COALESCE(${fixed_sections ? JSON.stringify(fixed_sections) : null}::jsonb, fixed_sections),
        tags = COALESCE(${tags}, tags),
        status = COALESCE(${status}, status),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    await sql.end();

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (err) {
    console.error("Database error:", err);
    await sql.end();
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = postgres(connectionString, { ssl: "require" });

  try {
    const [template] = await sql`
      SELECT is_permanent FROM templates WHERE id = ${id}
    `;

    if (!template) {
      await sql.end();
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (template.is_permanent) {
      await sql.end();
      return NextResponse.json({ error: "Cannot delete permanent template" }, { status: 403 });
    }

    const [proposalCount] = await sql`
      SELECT COUNT(*) as count FROM proposals WHERE template_id = ${id}
    `;

    if (proposalCount && parseInt(proposalCount.count) > 0) {
      await sql.end();
      return NextResponse.json({
        error: `Cannot delete template: ${proposalCount.count} proposal(s) are using this template. Delete the proposals first.`,
      }, { status: 400 });
    }

    await sql`DELETE FROM templates WHERE id = ${id}`;

    await sql.end();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Database error:", err);
    await sql.end();
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
