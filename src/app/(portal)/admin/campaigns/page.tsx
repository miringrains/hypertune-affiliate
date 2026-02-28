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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm">Campaigns</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Internal tracking links — no affiliate commission. Track your own marketing efforts.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus size={15} strokeWidth={ICON_STROKE_WIDTH} />
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
          <CardContent className="pt-6 pb-6 px-6">
            <form onSubmit={createCampaign} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name</Label>
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
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign-slug">Tracking Slug</Label>
                  <Input
                    id="campaign-slug"
                    value={newSlug}
                    onChange={(e) =>
                      setNewSlug(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      )
                    }
                    placeholder="facebook-ads-q1"
                  />
                </div>
              </div>
              <p className="text-[12px] text-muted-foreground">
                Tracking URL: {trackingUrl}/api/track/click?am_id=
                {newSlug || "..."}
              </p>
              <div className="flex gap-2">
                <Button type="submit" disabled={creating || !newName.trim()}>
                  {creating ? "Creating..." : "Create Campaign"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
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
      {campaigns.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone
              size={32}
              strokeWidth={ICON_STROKE_WIDTH}
              className="mx-auto mb-3 text-muted-foreground"
            />
            <p className="text-[14px] text-muted-foreground">
              No campaigns yet. Create one to start tracking your own marketing
              efforts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const isCopied = copiedId === c.id;
            const convRate =
              c.stats.clicks > 0
                ? ((c.stats.leads / c.stats.clicks) * 100).toFixed(1)
                : "0.0";

            return (
              <Card key={c.id}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-semibold">
                          {c.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground px-2 py-0.5 rounded-full border border-border font-mono">
                          {c.slug}
                        </span>
                      </div>
                      <p className="text-[12px] font-mono text-muted-foreground truncate">
                        {trackingUrl}/api/track/click?am_id={c.slug}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Created{" "}
                        {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyTrackingUrl(c.slug, c.id)}
                      >
                        {isCopied ? (
                          <Check size={14} strokeWidth={ICON_STROKE_WIDTH} />
                        ) : (
                          <Copy size={14} strokeWidth={ICON_STROKE_WIDTH} />
                        )}
                        {isCopied ? "Copied" : "Copy"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          router.push(`/admin/campaigns/${c.id}`)
                        }
                      >
                        <ExternalLink
                          size={14}
                          strokeWidth={ICON_STROKE_WIDTH}
                        />
                        Details
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteCampaign(c.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 size={14} strokeWidth={ICON_STROKE_WIDTH} />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <MiniStat label="Clicks" value={c.stats.clicks} />
                    <MiniStat label="Leads" value={c.stats.leads} />
                    <MiniStat label="Customers" value={c.stats.customers} />
                    <MiniStat label="Conv. Rate" value={`${convRate}%`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Icon size={14} className="text-muted-foreground" />
          <span className="text-[12px] text-muted-foreground">{label}</span>
        </div>
        <p className="text-[22px] font-semibold tabular-nums">
          {value.toLocaleString()}
        </p>
      </CardContent>
    </Card>
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
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-[15px] font-semibold tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
