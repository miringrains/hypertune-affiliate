import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, handleApiError, ApiError } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

// Campaigns + campaign_events are not yet in generated Supabase types.
// We query via the service client with explicit typing.

interface CampaignRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface CampaignEventRow {
  campaign_id: string;
  event_type: string;
}

export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createServiceClient();

    const { data: campaigns, error } = await (supabase as any)
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false }) as { data: CampaignRow[] | null; error: any };

    if (error) throw new ApiError(500, error.message);

    const campaignIds = (campaigns ?? []).map((c) => c.id);
    let eventCounts: Record<string, Record<string, number>> = {};

    if (campaignIds.length > 0) {
      const { data: events } = await (supabase as any)
        .from("campaign_events")
        .select("campaign_id, event_type") as { data: CampaignEventRow[] | null; error: any };

      for (const evt of events ?? []) {
        if (!eventCounts[evt.campaign_id]) {
          eventCounts[evt.campaign_id] = {};
        }
        eventCounts[evt.campaign_id][evt.event_type] =
          (eventCounts[evt.campaign_id][evt.event_type] ?? 0) + 1;
      }
    }

    const result = (campaigns ?? []).map((c) => ({
      ...c,
      stats: {
        clicks: eventCounts[c.id]?.click ?? 0,
        leads: eventCounts[c.id]?.lead ?? 0,
        customers: eventCounts[c.id]?.customer ?? 0,
        trials: eventCounts[c.id]?.trial ?? 0,
      },
    }));

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      throw new ApiError(400, "Name and slug are required.");
    }

    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/--+/g, "-")
      .replace(/^-|-$/g, "");

    if (!cleanSlug) {
      throw new ApiError(400, "Invalid slug.");
    }

    const supabase = await createServiceClient();

    const { data: existingAffiliate } = await supabase
      .from("affiliates")
      .select("id")
      .eq("slug", cleanSlug)
      .single();

    if (existingAffiliate) {
      throw new ApiError(409, "This slug is already used by an affiliate.");
    }

    const { data: existingCampaign } = await (supabase as any)
      .from("campaigns")
      .select("id")
      .eq("slug", cleanSlug)
      .single() as { data: { id: string } | null; error: any };

    if (existingCampaign) {
      throw new ApiError(409, "This slug is already used by another campaign.");
    }

    const { data, error } = await (supabase as any)
      .from("campaigns")
      .insert({ name, slug: cleanSlug })
      .select()
      .single() as { data: CampaignRow | null; error: any };

    if (error) throw new ApiError(500, error.message);

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");

    if (!id) throw new ApiError(400, "Missing campaign id.");

    const supabase = await createServiceClient();

    const { error } = await (supabase as any)
      .from("campaigns")
      .delete()
      .eq("id", id) as { error: any };

    if (error) throw new ApiError(500, error.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
