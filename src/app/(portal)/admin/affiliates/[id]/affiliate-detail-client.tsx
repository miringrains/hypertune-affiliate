"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Check, Wallet, Trash2, Plus, ChevronDown, FileText,
  Download, AlertCircle, MousePointerClick, Users, UserCheck, ArrowRight, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";
import { COMMISSION_RATES, ICON_STROKE_WIDTH } from "@/lib/constants";
import { ConversionRing } from "@/components/shared/conversion-ring";
import type { Tables } from "@/lib/supabase/types";

interface FunnelStats {
  clicks: number;
  leads: number;
  customers: number;
  trialing: number;
  activeSubs: number;
  activeMonthly: number;
  activeAnnual: number;
  canceled: number;
  totalEarned: number;
  pendingAmount: number;
  paidAmount: number;
}

interface PayoutMethodRow {
  id: string;
  method_type: string;
  details: Record<string, string>;
  is_primary: boolean;
}

const DATE_RANGES = [
  { label: "24h", days: "1" },
  { label: "7d", days: "7" },
  { label: "30d", days: "30" },
  { label: "90d", days: "90" },
  { label: "All", days: "all" },
] as const;

interface SubAffiliateOption {
  id: string;
  name: string;
  slug: string;
}

interface AffiliateDetailClientProps {
  affiliate: Tables<"affiliates">;
  stats: FunnelStats;
  subStats?: FunnelStats | null;
  subAffiliates?: SubAffiliateOption[];
}

export function AffiliateDetailClient({
  affiliate: initialAffiliate,
  stats: initialStats,
  subStats: initialSubStats,
  subAffiliates: initialSubAffiliates = [],
}: AffiliateDetailClientProps) {
  const [affiliate, setAffiliate] = useState(initialAffiliate);
  const [stats, setStats] = useState(initialStats);
  const [subStats, setSubStats] = useState<FunnelStats | null>(initialSubStats ?? null);
  const [subAffiliates] = useState<SubAffiliateOption[]>(initialSubAffiliates);
  const [selectedSubId, setSelectedSubId] = useState("all");
  const [selectedRange, setSelectedRange] = useState("all");
  const [loadingStats, setLoadingStats] = useState(false);

  const [status, setStatus] = useState(affiliate.status);
  const [commissionRate, setCommissionRate] = useState(affiliate.commission_rate);
  const [durationMonths, setDurationMonths] = useState(
    affiliate.commission_duration_months,
  );
  const [subAffiliateRate, setSubAffiliateRate] = useState(
    affiliate.sub_affiliate_rate,
  );
  const [subAffiliateDuration, setSubAffiliateDuration] = useState(
    affiliate.sub_affiliate_duration_months,
  );
  const [saving, setSaving] = useState<string | null>(null);

  const fetchStats = useCallback(async (days: string, subId: string) => {
    setLoadingStats(true);
    try {
      const params = new URLSearchParams({ days });
      if (subId !== "all") params.set("subId", subId);
      const res = await fetch(`/api/admin/affiliates/${affiliate.id}?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setSubStats(data.subStats ?? null);
      }
    } finally {
      setLoadingStats(false);
    }
  }, [affiliate.id]);

  function handleRangeChange(days: string) {
    setSelectedRange(days);
    fetchStats(days, selectedSubId);
  }

  function handleSubIdChange(subId: string) {
    setSelectedSubId(subId);
    fetchStats(selectedRange, subId);
  }

  async function saveField(field: string, value: string | number) {
    setSaving(field);
    try {
      const res = await fetch(`/api/admin/affiliates/${affiliate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setAffiliate(data);
      toast.success("Updated successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(null);
    }
  }

  const hasSubAffiliates = affiliate.tier_level <= 2;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm">{affiliate.name}</h1>
          <p className="text-[14px] text-muted-foreground mt-1">{affiliate.email}</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 p-0.5">
          {DATE_RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => handleRangeChange(r.days)}
              className={`px-3 py-1 rounded-md text-[12px] font-medium transition-colors ${
                selectedRange === r.days
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Performance & Financials */}
      <div className={`relative rounded-2xl border border-zinc-700 bg-zinc-950 p-6 sm:p-8 space-y-8 ${loadingStats ? "opacity-60" : ""}`}>
        {loadingStats && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          </div>
        )}

        <PerformanceSection
          label="Direct Performance"
          stats={stats}
          commissionRate={affiliate.commission_rate}
        />

        {hasSubAffiliates && subStats && (
          <>
            <div className="border-t border-zinc-700" />
            <PerformanceSection
              label="Sub-Affiliate Performance"
              stats={subStats}
              commissionRate={affiliate.commission_rate}
              dropdown={
                subAffiliates.length > 1 ? (
                  <select
                    value={selectedSubId}
                    onChange={(e) => handleSubIdChange(e.target.value)}
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300 outline-none focus:border-zinc-600 cursor-pointer"
                  >
                    <option value="all">All Sub-affiliates ({subAffiliates.length})</option>
                    {subAffiliates.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.slug})
                      </option>
                    ))}
                  </select>
                ) : undefined
              }
            />
          </>
        )}
      </div>

      {/* Info & Editable Fields */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-6 space-y-4">
          <h2 className="text-[15px] font-medium text-white">
            Affiliate Info
          </h2>
          <div className="space-y-3">
            <InfoRow label="Slug" value={affiliate.slug} mono />
            <InfoRow label="Tier Level" value={`Tier ${affiliate.tier_level}`} />
            <InfoRow label="Role" value={affiliate.role} capitalize />
            <div className="flex items-center justify-between py-1.5">
              <span className="text-[13px] text-zinc-400">Status</span>
              <StatusBadge status={affiliate.status} />
            </div>
            <InfoRow
              label="Created"
              value={new Date(affiliate.created_at).toLocaleDateString()}
            />
            <InfoRow
              label="Total Paid"
              value={formatCurrency(stats.paidAmount)}
            />
          </div>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-6 space-y-5">
          <h2 className="text-[15px] font-medium text-white">Settings</h2>

          <EditField label="Status" saving={saving === "status"}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[13px] text-white outline-none focus:border-zinc-600"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <SaveButton
              disabled={status === affiliate.status}
              loading={saving === "status"}
              onClick={() => saveField("status", status)}
            />
          </EditField>

          <EditField label="Commission Rate" saving={saving === "commission_rate"}>
            <select
              value={commissionRate}
              onChange={(e) => setCommissionRate(Number(e.target.value))}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[13px] text-white outline-none focus:border-zinc-600"
            >
              {COMMISSION_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}%
                </option>
              ))}
            </select>
            <SaveButton
              disabled={commissionRate === affiliate.commission_rate}
              loading={saving === "commission_rate"}
              onClick={() => saveField("commission_rate", commissionRate)}
            />
          </EditField>

          <EditField
            label="Commission Duration (months)"
            saving={saving === "commission_duration_months"}
          >
            <input
              type="number"
              min={1}
              max={36}
              value={durationMonths}
              onChange={(e) => setDurationMonths(Number(e.target.value))}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[13px] text-white outline-none focus:border-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <SaveButton
              disabled={durationMonths === affiliate.commission_duration_months}
              loading={saving === "commission_duration_months"}
              onClick={() => saveField("commission_duration_months", durationMonths)}
            />
          </EditField>

          {hasSubAffiliates && (
            <>
              <EditField
                label="Sub-affiliate Override Rate (%)"
                saving={saving === "sub_affiliate_rate"}
              >
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={subAffiliateRate}
                  onChange={(e) => setSubAffiliateRate(Number(e.target.value))}
                  className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[13px] text-white outline-none focus:border-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <SaveButton
                  disabled={subAffiliateRate === affiliate.sub_affiliate_rate}
                  loading={saving === "sub_affiliate_rate"}
                  onClick={() => saveField("sub_affiliate_rate", subAffiliateRate)}
                />
              </EditField>

              <EditField
                label="Sub-affiliate Override Duration (months)"
                saving={saving === "sub_affiliate_duration_months"}
              >
                <input
                  type="number"
                  min={1}
                  max={36}
                  value={subAffiliateDuration}
                  onChange={(e) => setSubAffiliateDuration(Number(e.target.value))}
                  className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[13px] text-white outline-none focus:border-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <SaveButton
                  disabled={subAffiliateDuration === affiliate.sub_affiliate_duration_months}
                  loading={saving === "sub_affiliate_duration_months"}
                  onClick={() => saveField("sub_affiliate_duration_months", subAffiliateDuration)}
                />
              </EditField>
            </>
          )}
        </div>
      </div>

      <AdminPayoutMethods affiliateId={affiliate.id} />
      <AdminTaxDocuments affiliateId={affiliate.id} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Performance Section — funnel + financials in one block
// ---------------------------------------------------------------------------

function PerformanceSection({
  label,
  stats,
  commissionRate,
  dropdown,
}: {
  label: string;
  stats: FunnelStats;
  commissionRate: number;
  dropdown?: React.ReactNode;
}) {
  const pct = (num: number, den: number) =>
    den > 0 ? ((num / den) * 100).toFixed(1) : "—";

  const clickToLead = pct(stats.leads, stats.clicks);
  const leadToTrial = pct(stats.trialing, stats.leads);
  const trialToCustomer = pct(stats.customers, stats.trialing);
  const overallConversion = pct(stats.customers, stats.clicks);

  const stages = [
    { icon: MousePointerClick, label: "Clicks", value: stats.clicks, convPct: clickToLead },
    { icon: Users, label: "Leads", value: stats.leads, convPct: leadToTrial },
    { icon: Clock, label: "Trialing", value: stats.trialing, convPct: trialToCustomer },
    { icon: UserCheck, label: "Customers", value: stats.customers, convPct: null },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">{label}</p>
        {dropdown}
      </div>

      {/* Funnel cards */}
      <div className="flex flex-col sm:flex-row items-stretch gap-0">
        {stages.map((stage, i, arr) => (
          <div key={stage.label} className="flex items-stretch flex-1 min-w-0">
            <div className="flex-1 text-center p-4 sm:p-5 rounded-xl border border-zinc-700 bg-black">
              <stage.icon size={20} strokeWidth={ICON_STROKE_WIDTH} className="mx-auto mb-2 text-zinc-400" />
              <p className="text-[24px] sm:text-[28px] font-semibold tracking-tight leading-none text-white">
                {stage.value.toLocaleString()}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1.5">{stage.label}</p>
            </div>

            {i < arr.length - 1 && (
              <>
                <div className="hidden sm:flex flex-col items-center justify-center px-2.5 shrink-0">
                  <ArrowRight size={14} className="text-zinc-500" />
                  <span className={`text-[11px] font-bold mt-1 ${stage.convPct === "—" ? "text-zinc-500" : "text-emerald-400"}`}>
                    {stage.convPct === "—" ? "—" : `${stage.convPct}%`}
                  </span>
                </div>
                <div className="flex sm:hidden items-center justify-center py-1">
                  <span className={`text-[10px] font-bold ${stage.convPct === "—" ? "text-zinc-500" : "text-emerald-400"}`}>
                    {stage.convPct === "—" ? "↓ —" : `↓ ${stage.convPct}%`}
                  </span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Summary row: conversion ring + status counts + financials */}
      <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-zinc-700/50">
        <div className="flex items-center gap-3">
          <ConversionRing
            value={overallConversion === "—" ? 0 : Number(overallConversion)}
            size={44}
            strokeWidth={3.5}
            color="#ffffff"
          />
          <div>
            <p className="text-[16px] font-semibold text-white">
              {overallConversion === "—" ? "—" : `${overallConversion}%`}
            </p>
            <p className="text-[10px] text-zinc-400">Overall</p>
          </div>
        </div>
        <div className="flex gap-4 text-[12px]">
          <div>
            <span className="text-emerald-400 font-semibold">{stats.activeSubs}</span>
            <span className="text-zinc-400 ml-1">active</span>
          </div>
          <div>
            <span className="text-amber-400 font-semibold">{stats.trialing}</span>
            <span className="text-zinc-400 ml-1">trialing</span>
          </div>
          <div>
            <span className="text-rose-500 font-semibold">{stats.canceled}</span>
            <span className="text-zinc-400 ml-1">churned</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-5 text-right">
          <div>
            <p className="text-[16px] font-semibold text-white">{formatCurrency(stats.totalEarned)}</p>
            <p className="text-[10px] text-zinc-400">Earned</p>
          </div>
          <div>
            <p className="text-[16px] font-semibold text-white">{formatCurrency(stats.pendingAmount)}</p>
            <p className="text-[10px] text-zinc-400">Pending</p>
          </div>
          <div>
            <p className="text-[16px] font-semibold text-white">{formatCurrency(stats.paidAmount)}</p>
            <p className="text-[10px] text-zinc-400">Paid</p>
          </div>
          <div>
            <p className="text-[16px] font-semibold text-white">
              {formatCurrency((stats.activeMonthly + stats.activeAnnual) * (commissionRate / 100))}
            </p>
            <p className="text-[10px] text-zinc-400">MRR</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin Payout Methods
// ---------------------------------------------------------------------------

function AdminPayoutMethods({ affiliateId }: { affiliateId: string }) {
  const [methods, setMethods] = useState<PayoutMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/affiliates/${affiliateId}/payout-methods`)
      .then((r) => r.json())
      .then(setMethods)
      .finally(() => setLoading(false));
  }, [affiliateId]);

  async function addMethod() {
    setAdding(true);
    const res = await fetch(`/api/admin/affiliates/${affiliateId}/payout-methods`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ details: { email: paypalEmail } }),
    });
    setAdding(false);
    if (!res.ok) {
      toast.error("Failed to add PayPal");
      return;
    }
    const created = await res.json();
    setMethods((prev) => [...prev, created]);
    setShowAdd(false);
    setPaypalEmail("");
    toast.success("PayPal account linked");
  }

  async function deleteMethod(methodId: string) {
    const res = await fetch(
      `/api/admin/affiliates/${affiliateId}/payout-methods?method_id=${methodId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      toast.error("Failed to remove method");
      return;
    }
    setMethods((prev) => prev.filter((m) => m.id !== methodId));
    toast.success("PayPal account removed");
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-medium text-white">PayPal Payouts</h2>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 text-[12px] text-zinc-400 hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-[13px] text-zinc-400">Loading...</p>
      ) : methods.length === 0 && !showAdd ? (
        <p className="text-[13px] text-zinc-400">No PayPal account linked for this affiliate.</p>
      ) : (
        <div className="space-y-2">
          {methods.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 border-b border-zinc-700 last:border-0">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-zinc-400" />
                <span className="text-[13px] text-white">PayPal</span>
                {m.details?.email && <span className="text-[12px] text-zinc-400">{m.details.email}</span>}
                {m.is_primary && <span className="text-[10px] text-zinc-400 border border-zinc-700 rounded px-1.5 py-0.5">Active</span>}
              </div>
              <button onClick={() => deleteMethod(m.id)} className="text-zinc-400 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="space-y-3 border-t border-zinc-700 pt-4">
          <input
            type="email"
            placeholder="PayPal email address"
            value={paypalEmail}
            onChange={(e) => setPaypalEmail(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[13px] text-white outline-none focus:border-zinc-600"
          />
          <div className="flex gap-2">
            <button
              onClick={addMethod}
              disabled={adding || !paypalEmail}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/80 disabled:opacity-40"
            >
              {adding ? "Linking..." : "Link PayPal"}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 rounded-md border border-zinc-700 text-[12px] text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin Tax Documents
// ---------------------------------------------------------------------------

function AdminTaxDocuments({ affiliateId }: { affiliateId: string }) {
  const [loading, setLoading] = useState(true);
  const [taxData, setTaxData] = useState<{
    onFile: boolean;
    documentType?: string;
    uploadedAt?: string;
    downloadUrl?: string | null;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/admin/tax/${affiliateId}`)
      .then((r) => r.json())
      .then(setTaxData)
      .finally(() => setLoading(false));
  }, [affiliateId]);

  async function handleDownload() {
    const res = await fetch(`/api/admin/tax/${affiliateId}`);
    const data = await res.json();
    if (data.downloadUrl) {
      window.open(data.downloadUrl, "_blank");
    } else {
      toast.error("Could not generate download link");
    }
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-400" />
          <h2 className="text-[15px] font-medium text-white">Tax Documents</h2>
        </div>
        {!loading && taxData?.onFile && (
          <span className="text-[10px] font-medium text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 rounded px-1.5 py-0.5">
            On File
          </span>
        )}
        {!loading && !taxData?.onFile && (
          <span className="text-[10px] font-medium text-amber-400 border border-amber-500/20 bg-amber-500/10 rounded px-1.5 py-0.5">
            Missing
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-[13px] text-zinc-400">Loading...</p>
      ) : taxData?.onFile ? (
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-zinc-400" />
            <div>
              <span className="text-[13px] text-white">
                {taxData.documentType === "w9" ? "Form W-9" : "Form W-8BEN"}
              </span>
              <p className="text-[11px] text-zinc-400">
                Submitted{" "}
                {new Date(taxData.uploadedAt!).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-[12px] text-zinc-400 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 py-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <p className="text-[13px] text-zinc-400">
            No tax form submitted by this affiliate.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function InfoRow({
  label,
  value,
  mono,
  capitalize: cap,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px] text-zinc-400">{label}</span>
      <span
        className={`text-[13px] text-white ${mono ? "font-mono text-zinc-400" : ""} ${cap ? "capitalize" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function EditField({
  label,
  saving,
  children,
}: {
  label: string;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={saving ? "opacity-60 pointer-events-none" : ""}>
      <label className="block text-[12px] text-zinc-400 mb-1.5">{label}</label>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function SaveButton({
  disabled,
  loading,
  onClick,
}: {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Check className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
