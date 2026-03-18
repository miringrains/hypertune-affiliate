import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim();

  if (!code) {
    return NextResponse.json({ valid: false, error: "Missing code" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("name, slug")
    .eq("slug", code)
    .eq("status", "active")
    .single();

  if (!affiliate) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    affiliate_name: affiliate.name,
    slug: affiliate.slug,
  });
}
