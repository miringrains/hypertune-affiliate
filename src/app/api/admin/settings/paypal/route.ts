import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, handleApiError, ApiError } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { client_id, client_secret, mode } = body;

    if (!client_id || !client_secret) {
      throw new ApiError(400, "Client ID and Secret are required.");
    }

    if (mode && !["sandbox", "live"].includes(mode)) {
      throw new ApiError(400, "Mode must be 'sandbox' or 'live'.");
    }

    const supabase = await createServiceClient();

    const entries = [
      { key: "paypal_client_id", value: client_id },
      { key: "paypal_client_secret", value: client_secret },
      { key: "paypal_mode", value: mode ?? "sandbox" },
    ];

    for (const entry of entries) {
      const { error } = await supabase
        .from("settings")
        .upsert(
          { key: entry.key, value: entry.value, updated_at: new Date().toISOString() },
          { onConflict: "key" },
        );
      if (error) throw new ApiError(500, error.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
