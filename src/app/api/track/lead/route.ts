import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { COOKIE_NAME } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, stripe_customer_id, am_id } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const affiliateSlug =
      am_id || request.cookies.get(COOKIE_NAME)?.value;

    if (!affiliateSlug) {
      return NextResponse.json(
        { error: "No affiliate attribution found" },
        { status: 400 },
      );
    }

    const supabase = await createServiceClient();

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
