import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, am_id } = body;

    if (!email || !am_id) {
      return NextResponse.json(
        { error: "email and am_id are required" },
        { status: 400 },
      );
    }

    const supabase = await createServiceClient();

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
