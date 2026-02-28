import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireTier1Affiliate, handleApiError } from "@/lib/auth";
import { nanoid } from "@/lib/utils";
import { COMMISSION_RATES } from "@/lib/constants";

export async function GET() {
  try {
    const affiliate = await requireTier1Affiliate();

    const supabase = await createServiceClient();
    const { data: links, error } = await supabase
      .from("invite_links")
      .select("id, code, commission_rate, label, is_reusable, created_at")
      .eq("parent_affiliate_id", affiliate.id)
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
    const affiliate = await requireTier1Affiliate();

    const body = await request.json();
    const { commission_rate, label } = body;

    if (
      !commission_rate ||
      !COMMISSION_RATES.includes(commission_rate as (typeof COMMISSION_RATES)[number])
    ) {
      return NextResponse.json(
        { error: `Commission rate must be one of: ${COMMISSION_RATES.join(", ")}` },
        { status: 400 },
      );
    }

    const code = `${affiliate.slug}-${commission_rate}`;
    const supabase = await createServiceClient();

    const { data: existing } = await supabase
      .from("invite_links")
      .select("id")
      .eq("code", code)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `A link with ${commission_rate}% already exists for your account` },
        { status: 409 },
      );
    }

    const { data: link, error } = await supabase
      .from("invite_links")
      .insert({
        code,
        commission_rate,
        label: label || `${affiliate.slug} ${commission_rate}%`,
        is_reusable: true,
        is_tracking_only: false,
        parent_affiliate_id: affiliate.id,
        created_by: affiliate.userId,
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
    const affiliate = await requireTier1Affiliate();

    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = await createServiceClient();
    const { error } = await supabase
      .from("invite_links")
      .delete()
      .eq("id", id)
      .eq("parent_affiliate_id", affiliate.id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
