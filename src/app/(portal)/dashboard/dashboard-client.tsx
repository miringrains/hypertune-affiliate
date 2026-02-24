"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  MousePointerClick,
  Users,
  UserCheck,
  DollarSign,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

interface DashboardStats {
  clicks: number;
  leads: number;
  customers: number;
  earned: number;
  pending: number;
}

interface DashboardClientProps {
  affiliate: Tables<"affiliates">;
  stats: DashboardStats;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5 px-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium text-muted-foreground">{title}</span>
          <Icon size={16} strokeWidth={ICON_STROKE_WIDTH} className="text-muted-foreground/50" />
        </div>
        <div className="text-[1.75rem] font-semibold tracking-tight leading-none">{value}</div>
        {subtitle && (
          <p className="text-[12px] text-muted-foreground mt-1.5">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardClient({ affiliate, stats }: DashboardClientProps) {
  const [copied, setCopied] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [slug, setSlug] = useState(affiliate.slug);
  const [saving, setSaving] = useState(false);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = `${appUrl}/api/track/click?am_id=${affiliate.slug}`;

  async function copyLink() {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function saveSlug() {
    if (!slug || slug === affiliate.slug) {
      setEditingSlug(false);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("affiliates")
      .update({ slug })
      .eq("id", affiliate.id);

    setSaving(false);

    if (error) {
      toast.error("Failed to update slug", { description: error.message });
      setSlug(affiliate.slug);
    } else {
      toast.success("Referral slug updated!");
    }
    setEditingSlug(false);
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-display-sm">Dashboard</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Welcome back, {affiliate.name}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Clicks"
          value={stats.clicks.toLocaleString()}
          icon={MousePointerClick}
          subtitle="Last 30 days"
        />
        <StatCard
          title="Leads"
          value={stats.leads.toLocaleString()}
          icon={Users}
          subtitle="All time"
        />
        <StatCard
          title="Customers"
          value={stats.customers.toLocaleString()}
          icon={UserCheck}
          subtitle="Converted"
        />
        <StatCard
          title="Earned"
          value={formatCurrency(stats.earned)}
          icon={DollarSign}
          subtitle="Paid out"
        />
        <StatCard
          title="Pending"
          value={formatCurrency(stats.pending)}
          icon={Clock}
          subtitle="Awaiting payout"
        />
      </div>

      <Card>
        <CardContent className="pt-6 pb-6 px-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-heading-3">Your Referral Link</h3>
            <span className="text-[12px] font-medium text-muted-foreground px-2.5 py-1 rounded-full border border-border">
              {affiliate.commission_rate}% commission
            </span>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={referralLink}
                readOnly
                className="pr-9 font-mono text-[12px] bg-muted/40"
              />
              <a
                href={referralLink}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink size={13} strokeWidth={ICON_STROKE_WIDTH} />
              </a>
            </div>
            <Button onClick={copyLink} size="default">
              {copied ? (
                <Check size={15} strokeWidth={ICON_STROKE_WIDTH} />
              ) : (
                <Copy size={15} strokeWidth={ICON_STROKE_WIDTH} />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <div className="flex items-center gap-2.5 mt-4">
            <span className="text-[12px] text-muted-foreground">Slug:</span>
            {editingSlug ? (
              <div className="flex items-center gap-2">
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="h-7 w-36 font-mono text-[12px]"
                  autoFocus
                />
                <Button size="xs" onClick={saveSlug} disabled={saving}>
                  {saving ? "..." : "Save"}
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setSlug(affiliate.slug);
                    setEditingSlug(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setEditingSlug(true)}
                className="flex items-center gap-1.5 text-[12px] font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                {affiliate.slug}
                <Pencil size={11} strokeWidth={ICON_STROKE_WIDTH} />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="text-center">
          <CardContent className="pt-6 pb-6 px-6">
            <p className="text-[12px] font-medium text-muted-foreground mb-2">Commission Rate</p>
            <p className="text-[2.25rem] font-semibold tracking-tight leading-none">
              {affiliate.commission_rate}%
            </p>
            <p className="text-[12px] text-muted-foreground mt-2">
              for {affiliate.commission_duration_months} months
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6 pb-6 px-6">
            <p className="text-[12px] font-medium text-muted-foreground mb-2">Sub-Affiliate Rate</p>
            <p className="text-[2.25rem] font-semibold tracking-tight leading-none">
              {affiliate.sub_affiliate_rate}%
            </p>
            <p className="text-[12px] text-muted-foreground mt-2">per recruited affiliate</p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6 pb-6 px-6">
            <p className="text-[12px] font-medium text-muted-foreground mb-2">Tier Level</p>
            <p className="text-[2.25rem] font-semibold tracking-tight leading-none">
              Tier {affiliate.tier_level}
            </p>
            <p className="text-[12px] text-muted-foreground mt-2">
              {affiliate.tier_level === 1 ? "Main Affiliate" : `Sub-Affiliate L${affiliate.tier_level}`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
