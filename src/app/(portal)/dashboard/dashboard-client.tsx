"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MousePointerClick,
  Users,
  UserCheck,
  DollarSign,
  Clock,
  Copy,
  Check,
  Link,
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
    maximumFractionDigits: 2,
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
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-body-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon size={18} strokeWidth={ICON_STROKE_WIDTH} className="text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-display-sm">{value}</div>
        {subtitle && (
          <p className="text-caption text-muted-foreground mt-1">{subtitle}</p>
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
    <div className="space-y-8">
      <div>
        <h1 className="text-heading-1">Dashboard</h1>
        <p className="text-body-sm text-muted-foreground mt-1">
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-heading-3 flex items-center gap-2">
              <Link size={18} strokeWidth={ICON_STROKE_WIDTH} />
              Your Referral Link
            </CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {affiliate.commission_rate}% commission
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={referralLink}
                readOnly
                className="pr-10 font-mono text-xs"
              />
              <a
                href={referralLink}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink size={14} strokeWidth={ICON_STROKE_WIDTH} />
              </a>
            </div>
            <Button onClick={copyLink} variant="outline" size="default">
              {copied ? (
                <Check size={16} strokeWidth={ICON_STROKE_WIDTH} />
              ) : (
                <Copy size={16} strokeWidth={ICON_STROKE_WIDTH} />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-caption text-muted-foreground">Slug:</span>
            {editingSlug ? (
              <div className="flex items-center gap-2">
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="h-7 w-40 font-mono text-xs"
                  autoFocus
                />
                <Button size="sm" variant="outline" onClick={saveSlug} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
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
                className="flex items-center gap-1.5 text-caption font-mono hover:text-foreground text-muted-foreground transition-colors"
              >
                {affiliate.slug}
                <Pencil size={12} strokeWidth={ICON_STROKE_WIDTH} />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center space-y-2">
            <p className="text-heading-4 text-muted-foreground">Commission Rate</p>
            <p className="text-display-lg">{affiliate.commission_rate}%</p>
            <p className="text-caption text-muted-foreground">
              for {affiliate.commission_duration_months} months
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="pt-6 text-center space-y-2">
            <p className="text-heading-4 text-muted-foreground">Sub-Affiliate Rate</p>
            <p className="text-display-lg">{affiliate.sub_affiliate_rate}%</p>
            <p className="text-caption text-muted-foreground">per recruited affiliate</p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="pt-6 text-center space-y-2">
            <p className="text-heading-4 text-muted-foreground">Tier Level</p>
            <p className="text-display-lg">Tier {affiliate.tier_level}</p>
            <p className="text-caption text-muted-foreground">
              {affiliate.tier_level === 1 ? "Main Affiliate" : `Sub-Affiliate (L${affiliate.tier_level})`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
