import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, handleApiError, ApiError } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { key, value } = body;

    if (typeof key !== "string" || key.trim() === "") {
      throw new ApiError(400, "key must be a non-empty string");
    }

    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from("settings")
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err);
  }
}
