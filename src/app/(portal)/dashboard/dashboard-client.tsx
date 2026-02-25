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
  Shield,
  UserPlus,
  TrendingUp,
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

interface SubAffiliateStat {
  id: string;
  name: string;
  slug: string;
  commission_rate: number;
  created_at: string;
  clicks: number;
  leads: number;
  customers: number;
  earned: number;
}

interface AdminData {
  totalAffiliates: number;
  recentAffiliates: {
    id: string;
    name: string;
    slug: string;
    tier_level: number;
    commission_rate: number;
    created_at: string;
  }[];
}

interface DashboardClientProps {
  affiliate: Tables<"affiliates">;
  stats: DashboardStats;
  subAffiliateData?: SubAffiliateStat[];
  adminData?: AdminData;
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
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5 px-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium text-muted-foreground">
            {title}
          </span>
          <Icon
            size={16}
            strokeWidth={ICON_STROKE_WIDTH}
            className="text-muted-foreground/50"
          />
        </div>
        <div className="text-[1.75rem] font-semibold tracking-tight leading-none">
          {value}
        </div>
        {subtitle && (
          <p className="text-[12px] text-muted-foreground mt-1.5">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ReferralLinkSection({
  affiliate,
}: {
  affiliate: Tables<"affiliates">;
}) {
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
    const checkRes = await fetch("/api/affiliates/check-slug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, exclude_id: affiliate.id }),
    });
    if (checkRes.ok) {
      const { available } = await checkRes.json();
      if (!available) {
        setSaving(false);
        toast.error("That gamer tag is already taken");
        return;
      }
    }
    const supabase = createClient();
    const { error } = await supabase
      .from("affiliates")
      .update({ slug })
      .eq("id", affiliate.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to update gamer tag", {
        description: error.message,
      });
      setSlug(affiliate.slug);
    } else {
      toast.success("Gamer tag updated!");
    }
    setEditingSlug(false);
  }

  return (
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
          <span className="text-[12px] text-muted-foreground">Gamer Tag:</span>
          {editingSlug ? (
            <div className="flex items-center gap-2">
              <Input
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                  )
                }
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
  );
}

export function DashboardClient({
  affiliate,
  stats,
  subAffiliateData,
  adminData,
}: DashboardClientProps) {
  const isAdmin = affiliate.role === "admin";
  const isTier1 = affiliate.tier_level === 1 && !isAdmin;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-display-sm">
          {isAdmin ? "System Overview" : "Dashboard"}
        </h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          {isAdmin
            ? "Birds-eye view of the affiliate program"
            : `Welcome back, ${affiliate.name}`}
        </p>
      </div>

      {/* Stats Grid */}
      <div
        className={`grid gap-4 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}
      >
        {isAdmin && (
          <StatCard
            title="Affiliates"
            value={adminData?.totalAffiliates.toLocaleString() ?? "0"}
            icon={Shield}
            subtitle="Total active"
          />
        )}
        <StatCard
          title="Clicks"
          value={stats.clicks.toLocaleString()}
          icon={MousePointerClick}
          subtitle={isAdmin ? "Last 30 days (all)" : "Last 30 days"}
        />
        <StatCard
          title="Leads"
          value={stats.leads.toLocaleString()}
          icon={Users}
          subtitle={isAdmin ? "All affiliates" : "All time"}
        />
        <StatCard
          title="Customers"
          value={stats.customers.toLocaleString()}
          icon={UserCheck}
          subtitle={isAdmin ? "All affiliates" : "Converted"}
        />
        <StatCard
          title={isAdmin ? "Total Commissions" : "Earned"}
          value={formatCurrency(stats.earned)}
          icon={DollarSign}
          subtitle={isAdmin ? "All time" : "Paid out"}
        />
        <StatCard
          title="Pending"
          value={formatCurrency(stats.pending)}
          icon={Clock}
          subtitle="Awaiting payout"
        />
      </div>

      {/* Admin: Recent Affiliates */}
      {isAdmin && adminData && adminData.recentAffiliates.length > 0 && (
        <Card>
          <CardContent className="pt-6 pb-4 px-6">
            <h3 className="text-heading-3 mb-4">Recent Affiliates</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Tier
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {adminData.recentAffiliates.map((a) => (
                    <tr key={a.id} className="border-b border-border">
                      <td className="px-3 py-2.5 text-[13px] font-medium">
                        {a.name}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] font-mono text-muted-foreground">
                        {a.slug}
                      </td>
                      <td className="px-3 py-2.5 text-[13px]">
                        Tier {a.tier_level}
                      </td>
                      <td className="px-3 py-2.5 text-[13px]">
                        {a.commission_rate}%
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Affiliate: Referral Link */}
      {!isAdmin && <ReferralLinkSection affiliate={affiliate} />}

      {/* Tier 1: Sub-Affiliate Performance */}
      {isTier1 && subAffiliateData && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus
              size={18}
              strokeWidth={ICON_STROKE_WIDTH}
              className="text-muted-foreground"
            />
            <h3 className="text-heading-3">Sub-Affiliate Performance</h3>
          </div>

          {subAffiliateData.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-[14px] text-muted-foreground">
                  No sub-affiliates yet. Generate invite links from the
                  Sub-Affiliates page to start recruiting.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Affiliate
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Rate
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Clicks
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Leads
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Customers
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Earned
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subAffiliateData.map((sub) => (
                      <tr key={sub.id} className="border-b border-border">
                        <td className="px-5 py-3">
                          <div>
                            <span className="text-[13px] font-medium">
                              {sub.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground ml-2 font-mono">
                              {sub.slug}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-[13px]">
                          {sub.commission_rate}%
                        </td>
                        <td className="px-5 py-3 text-[13px] text-right tabular-nums">
                          {sub.clicks.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-[13px] text-right tabular-nums">
                          {sub.leads.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-[13px] text-right tabular-nums">
                          {sub.customers.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-[13px] text-right tabular-nums font-medium">
                          {formatCurrency(sub.earned)}
                        </td>
                        <td className="px-5 py-3 text-[12px] text-muted-foreground">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Rate cards - only for non-admin */}
      {!isAdmin && (
        <div
          className={`grid gap-4 ${isTier1 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
        >
          <Card className="text-center">
            <CardContent className="pt-6 pb-6 px-6">
              <p className="text-[12px] font-medium text-muted-foreground mb-2">
                Commission Rate
              </p>
              <p className="text-[2.25rem] font-semibold tracking-tight leading-none">
                {affiliate.commission_rate}%
              </p>
              <p className="text-[12px] text-muted-foreground mt-2">
                for {affiliate.commission_duration_months} months
              </p>
            </CardContent>
          </Card>

          {isTier1 && (
            <Card className="text-center">
              <CardContent className="pt-6 pb-6 px-6">
                <p className="text-[12px] font-medium text-muted-foreground mb-2">
                  Sub-Affiliate Rate
                </p>
                <p className="text-[2.25rem] font-semibold tracking-tight leading-none">
                  {affiliate.sub_affiliate_rate}%
                </p>
                <p className="text-[12px] text-muted-foreground mt-2">
                  per recruited affiliate
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="text-center">
            <CardContent className="pt-6 pb-6 px-6">
              <p className="text-[12px] font-medium text-muted-foreground mb-2">
                Tier Level
              </p>
              <p className="text-[2.25rem] font-semibold tracking-tight leading-none">
                Tier {affiliate.tier_level}
              </p>
              <p className="text-[12px] text-muted-foreground mt-2">
                {affiliate.tier_level === 1
                  ? "Main Affiliate"
                  : "Sub-Affiliate"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
