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
        <Loader2 size={20} className="animate-spin text-zinc-600" />
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
          className="flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
        >
          <ArrowLeft size={14} strokeWidth={ICON_STROKE_WIDTH} />
          Back to Campaigns
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-2 text-white">{campaign.name}</h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="rounded border border-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500 font-mono">
                {campaign.slug}
              </span>
              <span className="text-[11px] text-zinc-600">
                Created {new Date(campaign.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={copyUrl}>
            {copied ? (
              <Check size={14} strokeWidth={ICON_STROKE_WIDTH} className="text-emerald-400" />
            ) : (
              <Copy size={14} strokeWidth={ICON_STROKE_WIDTH} />
            )}
            Copy Tracking URL
          </Button>
        </div>
      </div>

      {/* URL display */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-3">
        <p className="text-[11px] text-zinc-600 mb-1">Tracking URL</p>
        <p className="text-[13px] text-zinc-300 font-mono break-all">
          {trackingUrl}/api/track/click?am_id={campaign.slug}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={MousePointerClick}
          label="Clicks"
          value={stats.clicks}
        />
        <StatCard icon={UserPlus} label="Leads" value={stats.leads} />
        <StatCard
          icon={ShoppingCart}
          label="Customers"
          value={stats.customers}
        />
        <StatCard label="Conv. Rate" value={`${convRate}%`} />
      </div>

      {/* Daily trend table */}
      {daily.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-[14px] font-medium text-white mb-4">
              Daily Breakdown
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-zinc-800 text-left">
                    <th className="pb-2 text-zinc-500 font-medium">Date</th>
                    <th className="pb-2 text-zinc-500 font-medium text-right">
                      Clicks
                    </th>
                    <th className="pb-2 text-zinc-500 font-medium text-right">
                      Leads
                    </th>
                    <th className="pb-2 text-zinc-500 font-medium text-right">
                      Customers
                    </th>
                    <th className="pb-2 text-zinc-500 font-medium text-right">
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
                        className="border-b border-zinc-800/50 last:border-0"
                      >
                        <td className="py-2 text-zinc-300">{d.date}</td>
                        <td className="py-2 text-zinc-300 text-right tabular-nums">
                          {d.clicks}
                        </td>
                        <td className="py-2 text-zinc-300 text-right tabular-nums">
                          {d.leads}
                        </td>
                        <td className="py-2 text-zinc-300 text-right tabular-nums">
                          {d.customers}
                        </td>
                        <td className="py-2 text-zinc-400 text-right tabular-nums">
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
          <h2 className="text-[14px] font-medium text-white mb-4">
            Recent Activity
          </h2>
          {recentEvents.length === 0 ? (
            <p className="text-[13px] text-zinc-600">
              No events yet. Share the tracking URL to start collecting data.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-zinc-800 text-left">
                    <th className="pb-2 text-zinc-500 font-medium">Type</th>
                    <th className="pb-2 text-zinc-500 font-medium">Detail</th>
                    <th className="pb-2 text-zinc-500 font-medium text-right">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((evt) => (
                    <tr
                      key={evt.id}
                      className="border-b border-zinc-800/50 last:border-0"
                    >
                      <td className="py-2">
                        <EventBadge type={evt.event_type} />
                      </td>
                      <td className="py-2 text-zinc-400">
                        {evt.email || evt.ip_hash?.slice(0, 8) || "—"}
                      </td>
                      <td className="py-2 text-zinc-500 text-right">
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon size={14} className="text-zinc-500" />}
        <span className="text-[12px] text-zinc-500">{label}</span>
      </div>
      <p className="text-[22px] font-semibold text-white tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function EventBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    click: "bg-zinc-800 text-zinc-300",
    lead: "bg-zinc-800 text-white",
    customer: "bg-zinc-800 text-white",
    trial: "bg-zinc-800 text-zinc-300",
  };

  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium ${styles[type] || styles.click}`}
    >
      {type}
    </span>
  );
}
