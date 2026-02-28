import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, handleApiError, ApiError } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { ids, action } = body;

    if (!["approve", "void"].includes(action)) {
      throw new ApiError(400, "Action must be 'approve' or 'void'");
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ApiError(400, "ids must be a non-empty array");
    }

    const supabase = await createServiceClient();
    const newStatus = action === "approve" ? "approved" : "voided";

    const { data, error } = await supabase
      .from("commissions")
      .update({ status: newStatus })
      .in("id", ids)
      .eq("status", "pending")
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ updated: data?.length ?? 0 });
  } catch (err) {
    return handleApiError(err);
  }
}
