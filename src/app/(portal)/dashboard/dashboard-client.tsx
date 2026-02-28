"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  Copy,
  Check,
  ExternalLink,
  Pencil,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  MousePointerClick,
  Users,
  UserCheck,
  DollarSign,
  Clock,
  Shield,
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
  thisMonthEarned: number;
  lastMonthEarned: number;
}

interface ChartData {
  clicksByDay: number[];
  earningsByMonth: { month: string; amount: number }[];
  customerStates: { active: number; trialing: number; churned: number };
}

interface ActivityItem {
  id: string;
  amount: number;
  status: string;
  tier_type: string;
  created_at: string;
  email: string | null;
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
  estimatedMRR?: number;
  commissionLiability?: number;
  totalPaidOut?: number;
}

interface DashboardClientProps {
  affiliate: Tables<"affiliates">;
  stats: DashboardStats;
  chartData: ChartData;
  recentActivity?: ActivityItem[];
  subAffiliateCount?: number;
  adminData?: AdminData;
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function fmtCurrencyShort(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function HeroEarnings({ stats }: { stats: DashboardStats }) {
  const pctChange =
    stats.lastMonthEarned > 0
      ? Math.round(
          ((stats.thisMonthEarned - stats.lastMonthEarned) / stats.lastMonthEarned) * 100,
        )
      : stats.thisMonthEarned > 0
        ? 100
        : 0;

  const isUp = pctChange >= 0;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
      <p className="text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
        This Month&apos;s Earnings
      </p>
      <div className="flex items-end gap-3 mt-2">
        <span className="text-[2.5rem] sm:text-[3rem] font-semibold tracking-tight leading-none text-white">
          {fmtCurrency(stats.thisMonthEarned)}
        </span>
        {pctChange !== 0 && (
          <span
            className={`flex items-center gap-1 text-[13px] font-medium pb-1 ${isUp ? "text-emerald-400" : "text-rose-500"}`}
          >
            {isUp ? (
              <TrendingUp size={14} strokeWidth={2} />
            ) : (
              <TrendingDown size={14} strokeWidth={2} />
            )}
            {Math.abs(pctChange)}% vs last month
          </span>
        )}
      </div>
      <div className="flex items-center gap-6 mt-4 text-[13px] text-zinc-500">
        <span>
          Lifetime earned:{" "}
          <span className="text-zinc-300 font-medium">{fmtCurrencyShort(stats.earned)}</span>
        </span>
        <span>
          Pending:{" "}
          <span className="text-amber-400 font-medium">{fmtCurrencyShort(stats.pending)}</span>
        </span>
      </div>
    </div>
  );
}

function ReferralLinkBar({ affiliate }: { affiliate: Tables<"affiliates"> }) {
  const [copied, setCopied] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [slug, setSlug] = useState(affiliate.slug);
  const [saving, setSaving] = useState(false);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = `${appUrl}/api/track/click?am_id=${slug}`;

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
      toast.error("Failed to update gamer tag", { description: error.message });
      setSlug(affiliate.slug);
    } else {
      toast.success("Gamer tag updated!");
    }
    setEditingSlug(false);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-[12px]">
          <span className="font-medium text-zinc-300">Your link</span>
          <span className="px-1.5 py-0.5 rounded border border-zinc-800 text-[10px] font-medium text-zinc-500">
            {affiliate.commission_rate}% · {affiliate.commission_duration_months}mo
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="flex-1 relative">
          <Input
            value={referralLink}
            readOnly
            className="pr-9 font-mono text-[11px] sm:text-[12px] bg-black border-zinc-800 text-zinc-400 h-9"
          />
          <a
            href={referralLink}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ExternalLink size={13} strokeWidth={ICON_STROKE_WIDTH} />
          </a>
        </div>
        <Button
          onClick={copyLink}
          size="sm"
          className="shrink-0 bg-zinc-800 hover:bg-zinc-700 text-white border-0"
        >
          {copied ? (
            <Check size={14} strokeWidth={ICON_STROKE_WIDTH} />
          ) : (
            <Copy size={14} strokeWidth={ICON_STROKE_WIDTH} />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="flex items-center gap-2 sm:border-l sm:border-zinc-800 sm:pl-4">
        <span className="text-[11px] text-zinc-500">Tag:</span>
        {editingSlug ? (
          <div className="flex items-center gap-1.5">
            <Input
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              className="h-7 w-28 font-mono text-[11px] bg-black border-zinc-800 text-zinc-300"
              autoFocus
            />
            <Button
              size="xs"
              onClick={saveSlug}
              disabled={saving}
              className="bg-zinc-800 hover:bg-zinc-700 text-white border-0 text-[11px]"
            >
              {saving ? "..." : "Save"}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setSlug(affiliate.slug);
                setEditingSlug(false);
              }}
              className="text-zinc-500 hover:text-zinc-300 text-[11px]"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setEditingSlug(true)}
            className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {affiliate.slug}
            <Pencil size={10} strokeWidth={ICON_STROKE_WIDTH} />
          </button>
        )}
      </div>
    </div>
  );
}

function OnboardingBanner({ slug }: { slug: string }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("ht_onboarding_dismissed") === "1";
  });

  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem("ht_onboarding_dismissed", "1");
    setDismissed(true);
  }

  const steps = [
    { num: "1", title: "Copy your referral link", desc: "Use the link bar above to grab your unique tracking URL." },
    { num: "2", title: "Share with your audience", desc: "Post it on social media, embed it on your site, or send it directly." },
    { num: "3", title: "Track your referrals", desc: "Clicks, leads, and commissions will appear here automatically." },
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-medium text-white">Get started</h3>
          <p className="text-[12px] text-zinc-500 mt-0.5">Here&apos;s how to start referring customers</p>
        </div>
        <button onClick={dismiss} className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">Dismiss</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {steps.map((s) => (
          <div key={s.num} className="flex gap-3">
            <div className="shrink-0 w-7 h-7 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center text-[12px] font-semibold text-zinc-300">
              {s.num}
            </div>
            <div>
              <p className="text-[13px] font-medium text-zinc-200">{s.title}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmbedCodeSection({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"script" | "pixel">("script");
  const [copied, setCopied] = useState(false);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const scriptCode = `<script src="${appUrl}/tracking-snippet.js" data-api="${appUrl}"></script>`;
  const pixelCode = `<img src="${appUrl}/api/track/click?am_id=${slug}&redirect=none" width="1" height="1" style="display:none" alt="">`;
  const code = tab === "script" ? scriptCode : pixelCode;

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Embed code copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        Need embed code for your site? →
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[12px] font-medium text-zinc-300">Embed Code</h3>
        <button onClick={() => setOpen(false)} className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">Hide</button>
      </div>
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setTab("script")}
          className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${tab === "script" ? "border-zinc-600 bg-zinc-800 text-zinc-200" : "border-zinc-800 text-zinc-500"}`}
        >
          Script Tag
        </button>
        <button
          onClick={() => setTab("pixel")}
          className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${tab === "pixel" ? "border-zinc-600 bg-zinc-800 text-zinc-200" : "border-zinc-800 text-zinc-500"}`}
        >
          Tracking Pixel
        </button>
      </div>
      <div className="relative">
        <pre className="p-3 rounded-lg bg-black border border-zinc-800 text-[11px] font-mono text-zinc-400 overflow-x-auto whitespace-pre-wrap break-all">
          {code}
        </pre>
        <Button
          size="xs"
          onClick={copyCode}
          className="absolute top-2 right-2 bg-zinc-800 hover:bg-zinc-700 text-white border-0"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </Button>
      </div>
      <p className="text-[10px] text-zinc-600 mt-2">
        {tab === "script"
          ? "Add this tag to your site's <head> or before </body>. It automatically tracks visitors with your affiliate ID."
          : "Add this invisible pixel to any HTML page. It fires a tracking event when loaded."}
      </p>
    </div>
  );
}

function FunnelStrip({ stats }: { stats: DashboardStats }) {
  const clickToLead =
    stats.clicks > 0 ? ((stats.leads / stats.clicks) * 100).toFixed(1) : "0";
  const leadToCustomer =
    stats.leads > 0 ? ((stats.customers / stats.leads) * 100).toFixed(1) : "0";

  const steps = [
    { label: "Clicks", value: stats.clicks, icon: MousePointerClick },
    { label: "Leads", value: stats.leads, icon: Users },
    { label: "Customers", value: stats.customers, icon: UserCheck },
  ];

  const rates = [clickToLead, leadToCustomer];

  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-0">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-stretch flex-1 min-w-0">
          <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950">
            <div className="p-4 sm:p-5 flex items-center gap-3">
              <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg border border-zinc-800 bg-black">
                <step.icon size={18} strokeWidth={ICON_STROKE_WIDTH} className="text-zinc-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[22px] sm:text-[26px] font-semibold tracking-tight leading-none text-white">
                  {step.value.toLocaleString()}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">{step.label}</p>
              </div>
            </div>
          </div>

          {i < steps.length - 1 && (
            <div className="hidden sm:flex flex-col items-center justify-center px-2 shrink-0">
              <ArrowRight size={14} className="text-zinc-700" />
              <span className="text-[10px] font-semibold text-emerald-400 mt-0.5">
                {rates[i]}%
              </span>
            </div>
          )}

          {i < steps.length - 1 && (
            <div className="flex sm:hidden items-center justify-center py-1">
              <span className="text-[10px] font-semibold text-emerald-400">
                ↓ {rates[i]}%
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EarningsTrend({ data }: { data: { month: string; amount: number }[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-medium text-zinc-300">Earnings Trend</h3>
        <span className="text-[11px] text-zinc-600">Last 6 months</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
          />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.02)" }}
            contentStyle={{
              background: "#09090b",
              border: "1px solid #27272a",
              borderRadius: 8,
              fontSize: 12,
              color: "#fff",
            }}
            formatter={(value: number) => [fmtCurrency(value), "Earned"]}
          />
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#ffffff" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <Bar dataKey="amount" fill="url(#barGrad)" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
        <h3 className="text-[13px] font-medium text-zinc-300 mb-4">Recent Activity</h3>
        <p className="text-[13px] text-zinc-600 text-center py-6">
          No activity yet. Share your link to start earning!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-medium text-zinc-300">Recent Activity</h3>
        <a
          href="/earnings"
          className="text-[11px] font-medium text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          View all →
        </a>
      </div>
      <div className="space-y-0">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between py-2.5 border-b border-zinc-800/50 last:border-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center border border-zinc-800 bg-black">
                <DollarSign size={13} strokeWidth={2} className="text-zinc-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] text-zinc-100 truncate">
                  {fmtCurrency(item.amount)} commission
                  {item.tier_type !== "direct" && (
                    <span className="text-zinc-600 ml-1">· {item.tier_type}</span>
                  )}
                </p>
                {item.email && (
                  <p className="text-[11px] text-zinc-600 truncate">{item.email}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                  item.status === "paid"
                    ? "border-emerald-500/20 text-emerald-400"
                    : item.status === "voided"
                      ? "border-rose-500/20 text-rose-500"
                      : "border-amber-500/20 text-amber-400"
                }`}
              >
                {item.status}
              </span>
              <span className="text-[11px] text-zinc-600">{timeAgo(item.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardClient({
  affiliate,
  stats,
  chartData,
  recentActivity,
  subAffiliateCount,
  adminData,
}: DashboardClientProps) {
  const isAdmin = affiliate.role === "admin";
  const isTier1 = affiliate.tier_level === 1 && !isAdmin;

  if (isAdmin) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-display-sm">System Overview</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Birds-eye view of the affiliate program
          </p>
        </div>

        {/* Financial Overview */}
        {adminData && (adminData.estimatedMRR !== undefined) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Estimated MRR</p>
              <p className="text-[28px] font-semibold tracking-tight text-white mt-1">{fmtCurrency(adminData.estimatedMRR ?? 0)}</p>
              <p className="text-[11px] text-zinc-600 mt-1">Based on active subscriptions</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Commission Liability</p>
              <p className="text-[28px] font-semibold tracking-tight text-amber-400 mt-1">{fmtCurrency(adminData.commissionLiability ?? 0)}</p>
              <p className="text-[11px] text-zinc-600 mt-1">Pending + approved commissions</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Total Paid Out</p>
              <p className="text-[28px] font-semibold tracking-tight text-white mt-1">{fmtCurrency(adminData.totalPaidOut ?? 0)}</p>
              <p className="text-[11px] text-zinc-600 mt-1">Completed payouts all time</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-4">
          <FeatureCard className="col-span-12 sm:col-span-6 lg:col-span-4" title="Affiliates" value={adminData?.totalAffiliates.toLocaleString() ?? "0"} icon={Shield} subtitle="Total active" />
          <FeatureCard className="col-span-12 sm:col-span-6 lg:col-span-4" title="Clicks" value={stats.clicks.toLocaleString()} icon={MousePointerClick} subtitle="Last 30 days" sparklineData={chartData.clicksByDay} />
          <FeatureCard className="col-span-12 sm:col-span-6 lg:col-span-4" title="Customers" value={stats.customers.toLocaleString()} icon={UserCheck} subtitle={`${chartData.customerStates.active} active · ${chartData.customerStates.trialing} trialing · ${chartData.customerStates.churned} churned`} />
          <FeatureCard className="col-span-12 sm:col-span-6 lg:col-span-4" title="Leads" value={stats.leads.toLocaleString()} icon={Users} subtitle="All affiliates" />
          <FeatureCard className="col-span-12 sm:col-span-6 lg:col-span-4" title="Total Commissions" value={fmtCurrencyShort(stats.earned)} icon={DollarSign} subtitle="All time" />
          <FeatureCard className="col-span-12 sm:col-span-6 lg:col-span-4" title="Pending" value={fmtCurrencyShort(stats.pending)} icon={Clock} subtitle="Awaiting payout" />
        </div>

        {adminData && adminData.recentAffiliates.length > 0 && (
          <Card>
            <CardContent className="pt-6 pb-4 px-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-heading-3">Recent Affiliates</h3>
                <a href="/admin" className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">View all →</a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["Name", "Slug", "Tier", "Rate", "Joined"].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {adminData.recentAffiliates.map((a) => (
                      <tr key={a.id} className="border-b border-border">
                        <td className="px-3 py-2.5 text-[13px] font-medium">{a.name}</td>
                        <td className="px-3 py-2.5 text-[12px] font-mono text-muted-foreground">{a.slug}</td>
                        <td className="px-3 py-2.5 text-[13px]">Tier {a.tier_level}</td>
                        <td className="px-3 py-2.5 text-[13px]">{a.commission_rate}%</td>
                        <td className="px-3 py-2.5 text-[12px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm">Dashboard</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Welcome back, {affiliate.name}</p>
        </div>
        {isTier1 && subAffiliateCount !== undefined && (
          <a href="/team" className="flex items-center gap-2 text-[12px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950">
            <Users size={14} strokeWidth={ICON_STROKE_WIDTH} />
            {subAffiliateCount} sub-affiliate{subAffiliateCount !== 1 ? "s" : ""}
            <ArrowRight size={12} />
          </a>
        )}
      </div>

      <HeroEarnings stats={stats} />
      <ReferralLinkBar affiliate={affiliate} />

      {stats.clicks === 0 && stats.leads === 0 && stats.customers === 0 && (
        <OnboardingBanner slug={affiliate.slug} />
      )}

      <EmbedCodeSection slug={affiliate.slug} />
      <FunnelStrip stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EarningsTrend data={chartData.earningsByMonth} />
        <ActivityFeed items={recentActivity ?? []} />
      </div>
    </div>
  );
}
