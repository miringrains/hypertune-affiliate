import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { COOKIE_NAME } from "@/lib/constants";
import { trackLeadLimiter } from "@/lib/rate-limit";

const CAMPAIGN_COOKIE = "ht_campaign";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!trackLeadLimiter(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { email, stripe_customer_id, am_id } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Check for campaign attribution first
    const campaignSlug = request.cookies.get(CAMPAIGN_COOKIE)?.value;
    if (campaignSlug && !am_id) {
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
          metadata: { stripe_customer_id: stripe_customer_id || null },
        });
        return NextResponse.json({ lead_id: null, existing: false, campaign: true });
      }
    }

    // Standard affiliate attribution
    const affiliateSlug =
      am_id || request.cookies.get(COOKIE_NAME)?.value;

    if (!affiliateSlug) {
      return NextResponse.json(
        { error: "No affiliate attribution found" },
        { status: 400 },
      );
    }

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id")
      .eq("slug", affiliateSlug)
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
      if (stripe_customer_id) {
        await supabase
          .from("leads")
          .update({ stripe_customer_id })
          .eq("id", existingLead.id);
      }
      return NextResponse.json({ lead_id: existingLead.id, existing: true });
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        affiliate_id: affiliate.id,
        email,
        stripe_customer_id: stripe_customer_id || null,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ lead_id: lead!.id, existing: false });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}
