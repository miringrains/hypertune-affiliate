"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Check, Wallet, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency } from "@/lib/utils";
import { COMMISSION_RATES } from "@/lib/constants";
import type { Tables } from "@/lib/supabase/types";

interface Stats {
  leads: number;
  customers: number;
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

interface AffiliateDetailClientProps {
  affiliate: Tables<"affiliates">;
  stats: Stats;
}

export function AffiliateDetailClient({
  affiliate: initialAffiliate,
  stats,
}: AffiliateDetailClientProps) {
  const [affiliate, setAffiliate] = useState(initialAffiliate);
  const [status, setStatus] = useState(affiliate.status);
  const [commissionRate, setCommissionRate] = useState(affiliate.commission_rate);
  const [durationMonths, setDurationMonths] = useState(
    affiliate.commission_duration_months,
  );
  const [subAffiliateRate, setSubAffiliateRate] = useState(
    affiliate.sub_affiliate_rate,
  );
  const [saving, setSaving] = useState<string | null>(null);

  async function saveField(
    field: string,
    value: string | number,
  ) {
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

  const statCards = [
    { label: "Total Leads", value: stats.leads.toLocaleString() },
    { label: "Total Customers", value: stats.customers.toLocaleString() },
    { label: "Total Earned", value: formatCurrency(stats.totalEarned) },
    { label: "Pending", value: formatCurrency(stats.pendingAmount) },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="flex items-center gap-1 text-[13px] text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      <div>
        <h1 className="text-display-sm">{affiliate.name}</h1>
        <p className="text-[14px] text-zinc-400 mt-1">{affiliate.email}</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-zinc-700 bg-zinc-950 p-5"
          >
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              {card.label}
            </p>
            <p className="text-[22px] font-semibold text-white mt-1">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Info & Editable Fields */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Read-only info */}
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

        {/* Editable fields */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-6 space-y-5">
          <h2 className="text-[15px] font-medium text-white">Settings</h2>

          {/* Status */}
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

          {/* Commission Rate */}
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

          {/* Commission Duration */}
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
              disabled={
                durationMonths === affiliate.commission_duration_months
              }
              loading={saving === "commission_duration_months"}
              onClick={() =>
                saveField("commission_duration_months", durationMonths)
              }
            />
          </EditField>

          {/* Sub-affiliate Rate (Tier 1 only) */}
          {affiliate.tier_level === 1 && (
            <EditField
              label="Sub-affiliate Rate (%)"
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
                onClick={() =>
                  saveField("sub_affiliate_rate", subAffiliateRate)
                }
              />
            </EditField>
          )}
        </div>
      </div>

      {/* Payout Methods */}
      <AdminPayoutMethods affiliateId={affiliate.id} />
    </div>
  );
}

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
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-medium text-white">PayPal Payouts</h2>
        </div>
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
