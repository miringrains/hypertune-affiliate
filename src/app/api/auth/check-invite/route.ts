import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const supabase = await createServiceClient();

  const { data: invite, error } = await supabase
    .from("invite_links")
    .select("commission_rate, parent_affiliate_id, is_tracking_only, expires_at")
    .eq("code", code)
    .is("used_by_affiliate_id", null)
    .single();

  if (error || !invite) {
    return NextResponse.json(
      { error: "Invalid or expired invite" },
      { status: 404 },
    );
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  return NextResponse.json({
    commission_rate: invite.commission_rate,
    parent_affiliate_id: invite.parent_affiliate_id,
  });
}
