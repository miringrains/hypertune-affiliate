"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  MousePointerClick,
  UserPlus,
  ShoppingCart,
} from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";

interface DailyStats {
  date: string;
  clicks: number;
  leads: number;
  customers: number;
  trials: number;
}

interface EventRow {
  id: string;
  event_type: string;
  email: string | null;
  ip_hash: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface CampaignDetail {
  campaign: { id: string; name: string; slug: string; created_at: string };
  stats: { clicks: number; leads: number; customers: number; trials: number };
  daily: DailyStats[];
  recentEvents: EventRow[];
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const trackingUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/campaigns/${params.id}`);
        if (!res.ok) {
          toast.error("Campaign not found");
          router.push("/admin/campaigns");
          return;
        }
        setData(await res.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  async function copyUrl() {
    if (!data) return;
    const url = `${trackingUrl}/api/track/click?am_id=${data.campaign.slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Tracking URL copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2
          size={24}
          strokeWidth={ICON_STROKE_WIDTH}
          className="animate-spin text-muted-foreground"
        />
      </div>
    );
  }

  if (!data) return null;

  const { campaign, stats, daily, recentEvents } = data;
  const convRate =
    stats.clicks > 0
      ? ((stats.leads / stats.clicks) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/admin/campaigns")}
          className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={14} strokeWidth={ICON_STROKE_WIDTH} />
          Back to Campaigns
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display-sm">{campaign.name}</h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[11px] text-muted-foreground px-2 py-0.5 rounded-full border border-border font-mono">
                {campaign.slug}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Created {new Date(campaign.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <Button variant="outline" onClick={copyUrl}>
            {copied ? (
              <Check size={14} strokeWidth={ICON_STROKE_WIDTH} />
            ) : (
              <Copy size={14} strokeWidth={ICON_STROKE_WIDTH} />
            )}
            Copy Tracking URL
          </Button>
        </div>
      </div>

      {/* URL display */}
      <Card>
        <CardContent className="py-3 px-5">
          <p className="text-[11px] text-muted-foreground mb-1">Tracking URL</p>
          <p className="text-[13px] font-mono break-all">
            {trackingUrl}/api/track/click?am_id={campaign.slug}
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={MousePointerClick} label="Clicks" value={stats.clicks} />
        <StatCard icon={UserPlus} label="Leads" value={stats.leads} />
        <StatCard icon={ShoppingCart} label="Customers" value={stats.customers} />
        <StatCard label="Conv. Rate" value={`${convRate}%`} />
      </div>

      {/* Daily trend table */}
      {daily.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-[14px] font-semibold mb-4">Daily Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="pb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider text-right">
                      Clicks
                    </th>
                    <th className="pb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider text-right">
                      Leads
                    </th>
                    <th className="pb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider text-right">
                      Customers
                    </th>
                    <th className="pb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider text-right">
                      Conv.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((d) => {
                    const rate =
                      d.clicks > 0
                        ? ((d.leads / d.clicks) * 100).toFixed(1)
                        : "—";
                    return (
                      <tr
                        key={d.date}
                        className="border-b border-border last:border-0"
                      >
                        <td className="py-2.5">{d.date}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          {d.clicks}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">
                          {d.leads}
                        </td>
                        <td className="py-2.5 text-right tabular-nums">
                          {d.customers}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                          {rate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent events */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-[14px] font-semibold mb-4">Recent Activity</h2>
          {recentEvents.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              No events yet. Share the tracking URL to start collecting data.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="pb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Detail
                    </th>
                    <th className="pb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider text-right">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((evt) => (
                    <tr
                      key={evt.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-2.5">
                        <EventBadge type={evt.event_type} />
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {evt.email || evt.ip_hash?.slice(0, 8) || "—"}
                      </td>
                      <td className="py-2.5 text-muted-foreground text-right">
                        {new Date(evt.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ElementType;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-2">
          {Icon && <Icon size={14} className="text-muted-foreground" />}
          <span className="text-[12px] text-muted-foreground">{label}</span>
        </div>
        <p className="text-[22px] font-semibold tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
      </CardContent>
    </Card>
  );
}

function EventBadge({ type }: { type: string }) {
  return (
    <span className="inline-block rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[10px] font-medium capitalize">
      {type}
    </span>
  );
}
