import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("custom_deliverable_categories")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching deliverable categories:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, suggestions, default_description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("custom_deliverable_categories")
      .upsert({
        name,
        suggestions: suggestions || [],
        default_description: default_description || "",
        updated_at: new Date().toISOString()
      }, {
        onConflict: "name"
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving category:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error saving deliverable category:", error);
    return NextResponse.json({ error: "Failed to save category" }, { status: 500 });
  }
}
