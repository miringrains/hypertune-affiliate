import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, handleApiError } from "@/lib/auth";
import { nanoid } from "@/lib/utils";

export async function GET() {
  try {
    await requireAdmin();

    const supabase = await createServiceClient();
    const { data: links, error } = await supabase
      .from("invite_links")
      .select(
        "id, code, commission_rate, label, is_reusable, is_tracking_only, parent_affiliate_id, expires_at, created_at, used_by_affiliate_id",
      )
      .is("parent_affiliate_id", null)
      .order("created_at", { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(links ?? []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const body = await request.json();
    const { label, is_reusable = true, expires_at } = body;

    const code = nanoid(12);
    const supabase = await createServiceClient();

    const { data: link, error } = await supabase
      .from("invite_links")
      .insert({
        code,
        commission_rate: 70,
        label: label || null,
        is_reusable,
        is_tracking_only: false,
        parent_affiliate_id: null,
        created_by: admin.userId,
        expires_at: expires_at || null,
      })
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(link);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = await createServiceClient();
    const { error } = await supabase.from("invite_links").delete().eq("id", id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
