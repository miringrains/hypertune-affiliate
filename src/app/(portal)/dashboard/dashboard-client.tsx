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
} from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { FeatureCard } from "@/components/shared/feature-card";
import type { Tables } from "@/lib/supabase/types";

interface DashboardStats {
  clicks: number;
  leads: number;
  customers: number;
  earned: number;
  pending: number;
}

interface ChartData {
  clicksByDay: number[];
  leadsByWeek: number[];
  commissionsByMonth: number[];
  conversionRate: number;
  customerStates: { active: number; trialing: number; churned: number };
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
  chartData?: ChartData;
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
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-muted-foreground px-2.5 py-1 rounded-full border border-border">
              Tier {affiliate.tier_level}
            </span>
            <span className="text-[12px] font-medium text-muted-foreground px-2.5 py-1 rounded-full border border-border">
              {affiliate.commission_rate}% for {affiliate.commission_duration_months}mo
            </span>
          </div>
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
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
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
  chartData,
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

      {/* Feature Card Grid — 12-col bento */}
      {isAdmin ? (
        <div className="grid grid-cols-12 gap-4">
          <FeatureCard
            className="col-span-12 sm:col-span-6 lg:col-span-4"
            title="Affiliates"
            value={adminData?.totalAffiliates.toLocaleString() ?? "0"}
            icon={Shield}
            subtitle="Total active"
          />
          <FeatureCard
            className="col-span-12 sm:col-span-6 lg:col-span-4"
            title="Clicks"
            value={stats.clicks.toLocaleString()}
            icon={MousePointerClick}
            subtitle="Last 30 days"
            sparklineData={chartData?.clicksByDay}
          />
          <FeatureCard
            className="col-span-12 sm:col-span-6 lg:col-span-4"
            title="Leads"
            value={stats.leads.toLocaleString()}
            icon={Users}
            subtitle="All affiliates"
            sparklineData={chartData?.leadsByWeek}
            sparklineColor="#22c55e"
          />
          <FeatureCard
            className="col-span-12 sm:col-span-6 lg:col-span-4"
            title="Customers"
            value={stats.customers.toLocaleString()}
            icon={UserCheck}
            subtitle={`${chartData?.customerStates.active ?? 0} active · ${chartData?.customerStates.trialing ?? 0} trialing · ${chartData?.customerStates.churned ?? 0} churned`}
            ringValue={chartData?.conversionRate ?? 0}
            ringLabel={`${chartData?.conversionRate ?? 0}%`}
          />
          <FeatureCard
            className="col-span-12 sm:col-span-6 lg:col-span-4"
            title="Total Commissions"
            value={formatCurrency(stats.earned)}
            icon={DollarSign}
            subtitle="All time"
            sparklineData={chartData?.commissionsByMonth}
            sparklineColor="#eab308"
          />
          <FeatureCard
            className="col-span-12 sm:col-span-6 lg:col-span-4"
            title="Pending"
            value={formatCurrency(stats.pending)}
            icon={Clock}
            subtitle="Awaiting payout"
          />
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          <FeatureCard
            className="col-span-12 sm:col-span-6 lg:col-span-4"
            title="Clicks"
            value={stats.clicks.toLocaleString()}
            icon={MousePointerClick}
            subtitle="Last 30 days"
            sparklineData={chartData?.clicksByDay}
          />
          <FeatureCard
            className="col-span-12 sm:col-span-6 lg:col-span-4"
            title="Leads"
            value={stats.leads.toLocaleString()}
            icon={Users}
            subtitle="All time"
            ringValue={chartData?.conversionRate ?? 0}
            ringLabel={`${chartData?.conversionRate ?? 0}%`}
          />
          <FeatureCard
            className="col-span-12 sm:col-span-6 lg:col-span-4"
            title="Customers"
            value={stats.customers.toLocaleString()}
            icon={UserCheck}
            subtitle="Converted"
          />
          <FeatureCard
            className="col-span-12 sm:col-span-6 lg:col-span-6"
            title="Earned"
            value={formatCurrency(stats.earned)}
            icon={DollarSign}
            subtitle="Paid out"
            sparklineData={chartData?.commissionsByMonth}
            sparklineColor="#22c55e"
          />
          <FeatureCard
            className="col-span-12 sm:col-span-6 lg:col-span-6"
            title="Pending"
            value={formatCurrency(stats.pending)}
            icon={Clock}
            subtitle="Awaiting payout"
          />
        </div>
      )}

      {/* Admin: Recent Affiliates */}
      {isAdmin && adminData && adminData.recentAffiliates.length > 0 && (
        <Card>
          <CardContent className="pt-6 pb-4 px-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-heading-3">Recent Affiliates</h3>
              <a
                href="/admin"
                className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                View all &rarr;
              </a>
            </div>
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

      {/* Tier 1: Sub-Affiliate Summary */}
      {isTier1 && subAffiliateData && (
        <Card>
          <CardContent className="pt-6 pb-5 px-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserPlus
                  size={16}
                  strokeWidth={ICON_STROKE_WIDTH}
                  className="text-muted-foreground"
                />
                <h3 className="text-heading-3">Sub-Affiliates</h3>
                <span className="text-[12px] text-muted-foreground">
                  ({subAffiliateData.length})
                </span>
              </div>
              {subAffiliateData.length > 0 && (
                <a
                  href="/sub-affiliates"
                  className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all &rarr;
                </a>
              )}
            </div>

            {subAffiliateData.length === 0 ? (
              <p className="text-[13px] text-muted-foreground py-4 text-center">
                No sub-affiliates yet.{" "}
                <a href="/sub-affiliates" className="underline hover:text-foreground transition-colors">
                  Generate invite links
                </a>{" "}
                to start recruiting.
              </p>
            ) : (
              <div className="space-y-3">
                {subAffiliateData.slice(0, 3).map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[13px] font-medium truncate">
                        {sub.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                        {sub.commission_rate}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-[12px] tabular-nums text-muted-foreground">
                      <span>{sub.leads} leads</span>
                      <span>{sub.customers} customers</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(sub.earned)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Removed: redundant rate/tier cards — info folded into referral link section */}
    </div>
  );
}
