import { NextResponse, type NextRequest } from "next/server";
import { requireAffiliate, handleApiError, ApiError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const affiliate = await requireAffiliate();
    const body = await request.json();
    const { details } = body;

    if (!details?.email) {
      throw new ApiError(400, "PayPal email is required.");
    }

    const supabase = await createClient();

    const { count } = await supabase
      .from("payout_methods")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", affiliate.id);

    const isFirst = (count ?? 0) === 0;

    const { data, error } = await supabase
      .from("payout_methods")
      .insert({
        affiliate_id: affiliate.id,
        method_type: "paypal",
        details: { email: details.email },
        is_primary: isFirst,
      })
      .select()
      .single();

    if (error) throw new ApiError(500, error.message);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const affiliate = await requireAffiliate();
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) throw new ApiError(400, "Missing payout method id.");

    const supabase = await createClient();

    const { data: method } = await supabase
      .from("payout_methods")
      .select("id, is_primary")
      .eq("id", id)
      .eq("affiliate_id", affiliate.id)
      .single();

    if (!method) throw new ApiError(404, "Payout method not found.");

    await supabase.from("payout_methods").delete().eq("id", id);

    if (method.is_primary) {
      const { data: remaining } = await supabase
        .from("payout_methods")
        .select("id")
        .eq("affiliate_id", affiliate.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (remaining && remaining.length > 0) {
        await supabase
          .from("payout_methods")
          .update({ is_primary: true })
          .eq("id", remaining[0].id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const affiliate = await requireAffiliate();
    const body = await request.json();
    const { id } = body;

    if (!id) throw new ApiError(400, "Missing payout method id.");

    const supabase = await createClient();

    await supabase
      .from("payout_methods")
      .update({ is_primary: false })
      .eq("affiliate_id", affiliate.id);

    const { error } = await supabase
      .from("payout_methods")
      .update({ is_primary: true })
      .eq("id", id)
      .eq("affiliate_id", affiliate.id);

    if (error) throw new ApiError(500, error.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
