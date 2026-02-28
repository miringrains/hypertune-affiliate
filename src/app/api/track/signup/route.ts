import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { trackSignupLimiter } from "@/lib/rate-limit";

const CAMPAIGN_COOKIE = "ht_campaign";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!trackSignupLimiter(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { email, name, am_id } = body;

    if (!email) {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 },
      );
    }

    const supabase = await createServiceClient();

    // Check for campaign attribution if no am_id
    if (!am_id) {
      const campaignSlug = request.cookies.get(CAMPAIGN_COOKIE)?.value;
      if (campaignSlug) {
        const { data: campaign } = await (supabase as any)
          .from("campaigns")
          .select("id")
          .eq("slug", campaignSlug)
          .single() as { data: { id: string } | null; error: any };

        if (campaign) {
          await (supabase as any).from("campaign_events").insert({
            campaign_id: campaign.id,
            event_type: "lead",
            email,
            metadata: { name: name || null },
          });
          return NextResponse.json({ lead_id: null, existing: false, campaign: true });
        }
      }

      return NextResponse.json(
        { error: "email and am_id are required" },
        { status: 400 },
      );
    }

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id")
      .eq("slug", am_id)
      .eq("status", "active")
      .single();

    if (!affiliate) {
      return NextResponse.json(
        { error: "Invalid affiliate" },
        { status: 404 },
      );
    }

    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("email", email)
      .eq("affiliate_id", affiliate.id)
      .single();

    if (existingLead) {
      return NextResponse.json({ lead_id: existingLead.id, existing: true });
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        affiliate_id: affiliate.id,
        email,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      lead_id: lead!.id,
      existing: false,
      name: name || null,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}
