import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { auth } from "@/lib/auth"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SUPERADMIN_EMAILS = ["ananta@gmail.com", "swayam@gmail.com", "swayamkewlani118@gmail.com"]

export async function GET() {
  const session = await auth()
  
  if (!session?.user?.email || !SUPERADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  
  const { data, error } = await supabase
    .from("allowed_users")
    .select("*")
    .order("created_at", { ascending: false })
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user?.email || !SUPERADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  
  const body = await request.json()
  const { email, name, role = "user" } = body
  
  if (!email || !email.endsWith("@gmail.com")) {
    return NextResponse.json({ error: "Invalid email. Only @gmail.com emails are allowed." }, { status: 400 })
  }
  
  const { data, error } = await supabase
    .from("allowed_users")
    .insert({
      email: email.toLowerCase(),
      name,
      role,
      added_by: session.user.email,
      is_active: true,
    })
    .select()
    .single()
  
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user?.email || !SUPERADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  
  if (!id) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }
  
  const { data: user } = await supabase
    .from("allowed_users")
    .select("email")
    .eq("id", id)
    .single()
  
  if (user && SUPERADMIN_EMAILS.includes(user.email)) {
    return NextResponse.json({ error: "Cannot delete superadmin users" }, { status: 403 })
  }
  
  const { error } = await supabase
    .from("allowed_users")
    .delete()
    .eq("id", id)
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user?.email || !SUPERADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  
  const body = await request.json()
  const { id, is_active, role } = body
  
  if (!id) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }
  
  const { data: user } = await supabase
    .from("allowed_users")
    .select("email")
    .eq("id", id)
    .single()
  
  if (user && SUPERADMIN_EMAILS.includes(user.email) && is_active === false) {
    return NextResponse.json({ error: "Cannot deactivate superadmin users" }, { status: 403 })
  }
  
  const updates: Record<string, unknown> = {}
  if (typeof is_active === "boolean") updates.is_active = is_active
  if (role) updates.role = role
  
  const { data, error } = await supabase
    .from("allowed_users")
    .update(updates)
    .eq("id", id)
    .select()
    .single()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}
