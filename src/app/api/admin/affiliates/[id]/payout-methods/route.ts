import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, handleApiError, ApiError } from "@/lib/auth";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id: affiliateId } = await params;
    const service = getService();

    const { data, error } = await service
      .from("payout_methods")
      .select("*")
      .eq("affiliate_id", affiliateId)
      .order("created_at", { ascending: true });

    if (error) throw new ApiError(500, error.message);
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id: affiliateId } = await params;
    const body = await request.json();
    const { details } = body;

    if (!details?.email) {
      throw new ApiError(400, "PayPal email is required.");
    }

    const service = getService();

    const { count } = await service
      .from("payout_methods")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", affiliateId);

    const { data, error } = await service
      .from("payout_methods")
      .insert({
        affiliate_id: affiliateId,
        method_type: "paypal",
        details: { email: details.email },
        is_primary: (count ?? 0) === 0,
      })
      .select()
      .single();

    if (error) throw new ApiError(500, error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id: affiliateId } = await params;
    const { searchParams } = request.nextUrl;
    const methodId = searchParams.get("method_id");

    if (!methodId) throw new ApiError(400, "Missing method_id.");

    const service = getService();

    const { data: method } = await service
      .from("payout_methods")
      .select("id, is_primary")
      .eq("id", methodId)
      .eq("affiliate_id", affiliateId)
      .single();

    if (!method) throw new ApiError(404, "Payout method not found.");

    await service.from("payout_methods").delete().eq("id", methodId);

    if (method.is_primary) {
      const { data: remaining } = await service
        .from("payout_methods")
        .select("id")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: true })
        .limit(1);

      if (remaining && remaining.length > 0) {
        await service
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
