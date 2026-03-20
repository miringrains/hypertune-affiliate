"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  User,
  Mail,
  Hash,
  Pencil,
  Percent,
  Layers,
  Clock,
  CheckCircle2,
  Trash2,
  Plus,
  Users,
} from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import { createClient } from "@/lib/supabase/client";
import { SecuritySection } from "@/components/shared/security-section";
import { TaxFormSection } from "@/components/shared/tax-form-section";
import type { Tables } from "@/lib/supabase/types";

interface PayoutMethod {
  id: string;
  type: string;
  details: Record<string, string>;
  isPrimary: boolean;
}

interface SettingsClientProps {
  affiliate: Tables<"affiliates">;
  userEmail: string;
  payoutMethods: PayoutMethod[];
  parentName?: string | null;
}

export function SettingsClient({ affiliate, userEmail, payoutMethods: initialMethods, parentName }: SettingsClientProps) {
  const [editingSlug, setEditingSlug] = useState(false);
  const [slug, setSlug] = useState(affiliate.slug);
  const [saving, setSaving] = useState(false);

  // Payout methods
  const [methods, setMethods] = useState<PayoutMethod[]>(initialMethods);
  const [showAddForm, setShowAddForm] = useState<"paypal" | "wise" | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [addingMethod, setAddingMethod] = useState(false);


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

  async function addPayoutMethod() {
    if (!newEmail || !showAddForm) return;
    const methodType = showAddForm;
    const label = methodType === "wise" ? "Wise" : "PayPal";
    setAddingMethod(true);

    const res = await fetch("/api/affiliates/payout-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method_type: methodType, details: { email: newEmail } }),
    });

    setAddingMethod(false);

    if (!res.ok) {
      const { error } = await res.json();
      toast.error(`Failed to add ${label}`, { description: error });
      return;
    }

    const created = await res.json();
    setMethods((prev) => [
      ...prev,
      { id: created.id, type: created.method_type, details: created.details, isPrimary: created.is_primary },
    ]);
    setShowAddForm(null);
    setNewEmail("");
    toast.success(`${label} account linked`);
  }

  async function deleteMethod(id: string) {
    const method = methods.find((m) => m.id === id);
    const label = method?.type === "wise" ? "Wise" : "PayPal";
    const res = await fetch(`/api/affiliates/payout-methods?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to remove payout method");
      return;
    }
    setMethods((prev) => {
      const remaining = prev.filter((m) => m.id !== id);
      if (remaining.length > 0 && !remaining.some((m) => m.isPrimary)) {
        remaining[0].isPrimary = true;
      }
      return remaining;
    });
    toast.success(`${label} account removed`);
  }


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">Settings</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Your account details and affiliate configuration.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-heading-3">Profile</h2>
            <StatusBadge status={affiliate.status} />
          </div>

          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <User size={15} strokeWidth={ICON_STROKE_WIDTH} className="text-muted-foreground shrink-0" />
              <div className="flex items-center gap-3 flex-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-28 shrink-0">
                  Name
                </span>
                <span className="text-[13px]">{affiliate.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail size={15} strokeWidth={ICON_STROKE_WIDTH} className="text-muted-foreground shrink-0" />
              <div className="flex items-center gap-3 flex-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-28 shrink-0">
                  Email
                </span>
                <span className="text-[13px]">{userEmail}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Hash size={15} strokeWidth={ICON_STROKE_WIDTH} className="text-muted-foreground shrink-0" />
              <div className="flex items-center gap-3 flex-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-28 shrink-0">
                  Gamer Tag
                </span>
                {editingSlug ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={slug}
                      onChange={(e) =>
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                      }
                      className="h-8 w-40 font-mono text-[12px]"
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
                    className="flex items-center gap-1.5 text-[13px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {affiliate.slug}
                    <Pencil size={12} strokeWidth={ICON_STROKE_WIDTH} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <SecuritySection />

      {/* Commission Terms */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-heading-3">Commission Terms</h2>

          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <Percent size={15} strokeWidth={ICON_STROKE_WIDTH} className="text-muted-foreground shrink-0" />
              <div className="flex items-center gap-3 flex-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-28 shrink-0">
                  Rate
                </span>
                <span className="text-[13px] font-medium">{affiliate.commission_rate}%</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock size={15} strokeWidth={ICON_STROKE_WIDTH} className="text-muted-foreground shrink-0" />
              <div className="flex items-center gap-3 flex-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-28 shrink-0">
                  Duration
                </span>
                <span className="text-[13px]">{affiliate.commission_duration_months} months</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Layers size={15} strokeWidth={ICON_STROKE_WIDTH} className="text-muted-foreground shrink-0" />
              <div className="flex items-center gap-3 flex-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-28 shrink-0">
                  Tier
                </span>
                <span className="text-[13px]">Tier {affiliate.tier_level}</span>
                {affiliate.tier_level <= 2 && (
                  <span className="text-[11px] text-muted-foreground">
                    ({affiliate.sub_affiliate_rate}% from sub-affiliates)
                  </span>
                )}
              </div>
            </div>

            {parentName && (
              <div className="flex items-center gap-3">
                <Users size={15} strokeWidth={ICON_STROKE_WIDTH} className="text-muted-foreground shrink-0" />
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-28 shrink-0">
                    Recruited by
                  </span>
                  <span className="text-[13px]">{parentName}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payout Methods */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-heading-3">Payout Method</h2>

          {methods.length === 0 && !showAddForm && (
            <div className="rounded-lg border border-zinc-700 bg-black p-4">
              <p className="text-[13px] text-zinc-400">
                Link a payout account to receive your earnings. Choose one of the options below.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={() => setShowAddForm("paypal")}
                  className="flex items-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 hover:border-zinc-500 transition-colors"
                >
                  <Image src="/paypal-logo.png" alt="PayPal" width={60} height={15} className="opacity-80" />
                </button>
                <button
                  onClick={() => setShowAddForm("wise")}
                  className="flex items-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 hover:border-zinc-500 transition-colors"
                >
                  <Image src="/Wise_logo_light-on-dark.png" alt="Wise" width={60} height={15} className="opacity-80" />
                </button>
              </div>
            </div>
          )}

          {methods.length > 0 && (
            <div className="space-y-3">
              {methods.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-black px-4 py-3">
                  <div className="flex items-center gap-3">
                    {m.type === "wise" ? (
                      <Image src="/Wise_logo_light-on-dark.png" alt="Wise" width={50} height={13} className="opacity-70" />
                    ) : (
                      <Image src="/paypal-logo.png" alt="PayPal" width={50} height={13} className="opacity-60" />
                    )}
                    <span className="text-[13px] text-zinc-300">{m.details?.email}</span>
                    {m.isPrimary && (
                      <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <CheckCircle2 size={11} />
                        Active
                      </span>
                    )}
                  </div>
                  <Button size="xs" variant="ghost" onClick={() => deleteMethod(m.id)} title="Remove">
                    <Trash2 size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-zinc-400 hover:text-red-400" />
                  </Button>
                </div>
              ))}

              {!showAddForm && (
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setShowAddForm("paypal")}
                    className="text-[11px] text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    + Add PayPal
                  </button>
                  <button
                    onClick={() => setShowAddForm("wise")}
                    className="text-[11px] text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    + Add Wise
                  </button>
                </div>
              )}
            </div>
          )}

          {showAddForm && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="flex items-center gap-2 mb-1">
                {showAddForm === "wise" ? (
                  <Image src="/Wise_logo_light-on-dark.png" alt="Wise" width={55} height={14} className="opacity-80" />
                ) : (
                  <Image src="/paypal-logo.png" alt="PayPal" width={55} height={14} className="opacity-80" />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="payout-email" className="text-[12px]">
                  {showAddForm === "wise" ? "Wise email address" : "PayPal email address"}
                </Label>
                <p className="text-[11px] text-zinc-400">
                  {showAddForm === "wise"
                    ? "Enter the email associated with your Wise account. Payouts will be sent here."
                    : "Enter the email associated with your PayPal account. Payouts will be sent here."}
                </p>
                <Input
                  id="payout-email"
                  type="email"
                  placeholder="you@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-9 max-w-sm"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={addPayoutMethod} disabled={addingMethod || !newEmail}>
                  {addingMethod ? "Linking..." : `Link ${showAddForm === "wise" ? "Wise" : "PayPal"}`}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(null); setNewEmail(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tax Documents */}
      <TaxFormSection />
    </div>
  );
}
