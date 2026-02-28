import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, handleApiError, ApiError } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

interface CampaignRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface CampaignEventRow {
  id: string;
  campaign_id: string;
  event_type: string;
  email: string | null;
  ip_hash: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const supabase = await createServiceClient();

    const { data: campaign, error } = await (supabase as any)
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .single() as { data: CampaignRow | null; error: any };

    if (error || !campaign) throw new ApiError(404, "Campaign not found.");

    const { data: events } = await (supabase as any)
      .from("campaign_events")
      .select("*")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false }) as { data: CampaignEventRow[] | null; error: any };

    const stats = { clicks: 0, leads: 0, customers: 0, trials: 0 };
    for (const evt of events ?? []) {
      if (evt.event_type in stats) {
        stats[evt.event_type as keyof typeof stats]++;
      }
    }

    const dailyMap = new Map<string, { clicks: number; leads: number; customers: number; trials: number }>();
    for (const evt of events ?? []) {
      const day = new Date(evt.created_at).toISOString().slice(0, 10);
      if (!dailyMap.has(day)) {
        dailyMap.set(day, { clicks: 0, leads: 0, customers: 0, trials: 0 });
      }
      const d = dailyMap.get(day)!;
      if (evt.event_type in d) {
        d[evt.event_type as keyof typeof d]++;
      }
    }

    const daily = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    return NextResponse.json({
      campaign,
      stats,
      daily,
      recentEvents: (events ?? []).slice(0, 50),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name) throw new ApiError(400, "Name is required.");

    const supabase = await createServiceClient();

    const { error } = await (supabase as any)
      .from("campaigns")
      .update({ name })
      .eq("id", id) as { error: any };

    if (error) throw new ApiError(500, error.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
