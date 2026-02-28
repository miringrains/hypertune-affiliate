"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  Megaphone,
  ExternalLink,
  MousePointerClick,
  UserPlus,
  ShoppingCart,
} from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";

interface CampaignStats {
  clicks: number;
  leads: number;
  customers: number;
  trials: number;
}

interface Campaign {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  stats: CampaignStats;
}

export default function AdminCampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const trackingUrl = typeof window !== "undefined" ? window.location.origin : "";

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/campaigns");
      if (res.ok) {
        setCampaigns(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  function autoSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        slug: newSlug || autoSlug(newName),
      }),
    });

    setCreating(false);

    if (res.ok) {
      toast.success("Campaign created");
      setShowForm(false);
      setNewName("");
      setNewSlug("");
      fetchCampaigns();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create campaign");
    }
  }

  async function deleteCampaign(id: string) {
    const res = await fetch(`/api/admin/campaigns?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("Campaign deleted");
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } else {
      toast.error("Failed to delete campaign");
    }
  }

  async function copyTrackingUrl(slug: string, campaignId: string) {
    const url = `${trackingUrl}/api/track/click?am_id=${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(campaignId);
    toast.success("Tracking URL copied!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  const totalClicks = campaigns.reduce((s, c) => s + c.stats.clicks, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.stats.leads, 0);
  const totalCustomers = campaigns.reduce((s, c) => s + c.stats.customers, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-2 text-white">Campaigns</h1>
          <p className="text-[13px] text-zinc-500 mt-1">
            Internal tracking links with no affiliate commission. Track your own marketing efforts.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus size={14} strokeWidth={ICON_STROKE_WIDTH} />
          New Campaign
        </Button>
      </div>

      {/* Aggregate stats */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={MousePointerClick} label="Total Clicks" value={totalClicks} />
          <StatCard icon={UserPlus} label="Total Leads" value={totalLeads} />
          <StatCard icon={ShoppingCart} label="Total Conversions" value={totalCustomers} />
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={createCampaign} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name" className="text-[12px]">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (!newSlug || newSlug === autoSlug(newName)) {
                      setNewSlug(autoSlug(e.target.value));
                    }
                  }}
                  placeholder="e.g. Facebook Ads Q1"
                  className="h-9 max-w-sm"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-slug" className="text-[12px]">Tracking Slug</Label>
                <div className="flex items-center gap-2 max-w-sm">
                  <Input
                    id="campaign-slug"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="facebook-ads-q1"
                    className="h-9"
                  />
                </div>
                <p className="text-[11px] text-zinc-600">
                  Tracking URL: {trackingUrl}/api/track/click?am_id={newSlug || "..."}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" type="submit" disabled={creating || !newName.trim()}>
                  {creating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Campaign"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setNewName("");
                    setNewSlug("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Campaign list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-zinc-600" />
        </div>
      ) : campaigns.length === 0 && !showForm ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Megaphone size={32} className="mx-auto text-zinc-700 mb-3" />
            <p className="text-[14px] text-zinc-400 mb-1">No campaigns yet</p>
            <p className="text-[12px] text-zinc-600 mb-4">
              Create a campaign to generate a tracking link for your own marketing efforts.
            </p>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} strokeWidth={ICON_STROKE_WIDTH} />
              Create First Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <CampaignRow
              key={c.id}
              campaign={c}
              trackingUrl={trackingUrl}
              copiedId={copiedId}
              onCopy={() => copyTrackingUrl(c.slug, c.id)}
              onDelete={() => deleteCampaign(c.id)}
              onView={() => router.push(`/admin/campaigns/${c.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-zinc-500" />
        <span className="text-[12px] text-zinc-500">{label}</span>
      </div>
      <p className="text-[22px] font-semibold text-white tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function CampaignRow({
  campaign,
  trackingUrl,
  copiedId,
  onCopy,
  onDelete,
  onView,
}: {
  campaign: Campaign;
  trackingUrl: string;
  copiedId: string | null;
  onCopy: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const isCopied = copiedId === campaign.id;
  const s = campaign.stats;
  const convRate =
    s.clicks > 0 ? ((s.leads / s.clicks) * 100).toFixed(1) : "0.0";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[14px] font-medium text-white truncate">
              {campaign.name}
            </h3>
            <span className="shrink-0 rounded border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500 font-mono">
              {campaign.slug}
            </span>
          </div>
          <p className="text-[11px] text-zinc-600 font-mono truncate">
            {trackingUrl}/api/track/click?am_id={campaign.slug}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="xs"
            variant="ghost"
            onClick={onCopy}
            title="Copy tracking URL"
          >
            {isCopied ? (
              <Check size={13} strokeWidth={ICON_STROKE_WIDTH} className="text-emerald-400" />
            ) : (
              <Copy size={13} strokeWidth={ICON_STROKE_WIDTH} />
            )}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={onView}
            title="View details"
          >
            <ExternalLink size={13} strokeWidth={ICON_STROKE_WIDTH} />
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2
              size={13}
              strokeWidth={ICON_STROKE_WIDTH}
              className="text-zinc-500 hover:text-red-400"
            />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <MiniStat label="Clicks" value={s.clicks} />
        <MiniStat label="Leads" value={s.leads} />
        <MiniStat label="Customers" value={s.customers} />
        <MiniStat label="Conv. Rate" value={`${convRate}%`} />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800/50 bg-black px-3 py-2">
      <p className="text-[10px] text-zinc-600 mb-0.5">{label}</p>
      <p className="text-[15px] font-semibold text-white tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
