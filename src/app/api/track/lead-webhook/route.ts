import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  const expected = process.env.LEAD_WEBHOOK_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: string; am_id?: string; clerk_id?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, am_id, clerk_id, name } = body;

  if (!email || !am_id) {
    return NextResponse.json(
      { error: "email and am_id are required" },
      { status: 400 },
    );
  }

  const supabase = await createServiceClient();

  // Check if am_id is a campaign slug
  const { data: campaign } = await (supabase as any)
    .from("campaigns")
    .select("id")
    .eq("slug", am_id)
    .single() as { data: { id: string } | null; error: any };

  if (campaign) {
    await (supabase as any).from("campaign_events").insert({
      campaign_id: campaign.id,
      event_type: "lead",
      email,
      metadata: { clerk_id: clerk_id ?? null, name: name ?? null },
    });

    return NextResponse.json({ tracked: true, type: "campaign" });
  }

  // Check if am_id is an affiliate slug
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id")
    .eq("slug", am_id)
    .eq("status", "active")
    .single();

  if (affiliate) {
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("email", email)
      .eq("affiliate_id", affiliate.id)
      .single();

    if (existingLead) {
      return NextResponse.json({ tracked: true, type: "affiliate", existing: true });
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({ affiliate_id: affiliate.id, email })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tracked: true, type: "affiliate", lead_id: lead!.id });
  }

  return NextResponse.json(
    { error: "am_id does not match any campaign or affiliate" },
    { status: 404 },
  );
}
