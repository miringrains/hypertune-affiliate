import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { slug, exclude_id } = body;

  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const normalized = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (normalized.length < 2) {
    return NextResponse.json({ available: false, reason: "Too short (min 2 characters)" });
  }
  if (normalized.length > 30) {
    return NextResponse.json({ available: false, reason: "Too long (max 30 characters)" });
  }

  const supabase = await createServiceClient();

  let query = supabase
    .from("affiliates")
    .select("id", { count: "exact", head: true })
    .eq("slug", normalized);

  if (exclude_id) {
    query = query.neq("id", exclude_id);
  }

  const { count } = await query;

  return NextResponse.json({
    available: (count ?? 0) === 0,
    slug: normalized,
  });
}
