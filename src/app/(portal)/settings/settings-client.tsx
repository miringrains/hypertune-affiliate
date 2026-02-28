"use client";

import { useState } from "react";
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
  Wallet,
  CheckCircle2,
  Lock,
  Trash2,
  Plus,
  Star,
  Users,
} from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import { createClient } from "@/lib/supabase/client";
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMethodType, setNewMethodType] = useState<"paypal" | "bank_transfer">("paypal");
  const [newPaypalEmail, setNewPaypalEmail] = useState("");
  const [newAccountHolder, setNewAccountHolder] = useState("");
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newRoutingNumber, setNewRoutingNumber] = useState("");
  const [addingMethod, setAddingMethod] = useState(false);

  // Change password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

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
    setAddingMethod(true);
    const details =
      newMethodType === "paypal"
        ? { email: newPaypalEmail }
        : { account_holder: newAccountHolder, account_number: newAccountNumber, routing_number: newRoutingNumber };

    const res = await fetch("/api/affiliates/payout-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method_type: newMethodType, details }),
    });

    setAddingMethod(false);

    if (!res.ok) {
      const { error } = await res.json();
      toast.error("Failed to add payout method", { description: error });
      return;
    }

    const created = await res.json();
    setMethods((prev) => [
      ...prev,
      { id: created.id, type: created.method_type, details: created.details, isPrimary: created.is_primary },
    ]);
    setShowAddForm(false);
    setNewPaypalEmail("");
    setNewAccountHolder("");
    setNewAccountNumber("");
    setNewRoutingNumber("");
    toast.success("Payout method added");
  }

  async function deleteMethod(id: string) {
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
    toast.success("Payout method removed");
  }

  async function setPrimary(id: string) {
    const res = await fetch("/api/affiliates/payout-methods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      toast.error("Failed to update primary method");
      return;
    }
    setMethods((prev) =>
      prev.map((m) => ({ ...m, isPrimary: m.id === id })),
    );
    toast.success("Primary payout method updated");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);

    if (error) {
      toast.error("Failed to update password", { description: error.message });
      return;
    }

    toast.success("Password updated successfully");
    setNewPassword("");
    setConfirmPassword("");
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
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="text-heading-3">Security</h2>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label htmlFor="new-pw" className="text-[12px]">New password</Label>
              <Input
                id="new-pw"
                type="password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw" className="text-[12px]">Confirm new password</Label>
              <Input
                id="confirm-pw"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-9"
              />
            </div>
            <Button type="submit" size="sm" disabled={changingPassword || !newPassword}>
              {changingPassword ? (
                "Updating..."
              ) : (
                <>
                  <Lock size={14} strokeWidth={ICON_STROKE_WIDTH} />
                  Update password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

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
                {affiliate.tier_level === 1 && (
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

      {/* Payout Method */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-heading-3">Payout Method</h2>
            {!showAddForm && (
              <Button size="xs" variant="ghost" onClick={() => setShowAddForm(true)}>
                <Plus size={14} strokeWidth={ICON_STROKE_WIDTH} />
                Add
              </Button>
            )}
          </div>

          {methods.length === 0 && !showAddForm && (
            <p className="text-[13px] text-muted-foreground">
              No payout method configured. Add one to receive payouts.
            </p>
          )}

          {methods.length > 0 && (
            <div className="space-y-3">
              {methods.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <Wallet size={15} strokeWidth={ICON_STROKE_WIDTH} className="text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-[13px] font-medium capitalize">
                        {m.type.replace(/_/g, " ")}
                      </span>
                      {m.type === "paypal" && m.details?.email && (
                        <span className="text-[12px] text-muted-foreground ml-2">{m.details.email}</span>
                      )}
                      {m.type === "bank_transfer" && m.details?.account_holder && (
                        <span className="text-[12px] text-muted-foreground ml-2">{m.details.account_holder}</span>
                      )}
                    </div>
                    {m.isPrimary && (
                      <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <CheckCircle2 size={12} />
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!m.isPrimary && (
                      <Button size="xs" variant="ghost" onClick={() => setPrimary(m.id)} title="Set as primary">
                        <Star size={12} strokeWidth={ICON_STROKE_WIDTH} />
                      </Button>
                    )}
                    <Button size="xs" variant="ghost" onClick={() => deleteMethod(m.id)} title="Remove">
                      <Trash2 size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-zinc-500 hover:text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAddForm && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="space-y-2">
                <Label className="text-[12px]">Method type</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewMethodType("paypal")}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-medium border transition-colors ${
                      newMethodType === "paypal"
                        ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                        : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    PayPal
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewMethodType("bank_transfer")}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-medium border transition-colors ${
                      newMethodType === "bank_transfer"
                        ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                        : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Bank Transfer
                  </button>
                </div>
              </div>

              {newMethodType === "paypal" ? (
                <div className="space-y-2">
                  <Label htmlFor="paypal-email" className="text-[12px]">PayPal email</Label>
                  <Input
                    id="paypal-email"
                    type="email"
                    placeholder="you@example.com"
                    value={newPaypalEmail}
                    onChange={(e) => setNewPaypalEmail(e.target.value)}
                    className="h-9 max-w-sm"
                  />
                </div>
              ) : (
                <div className="space-y-3 max-w-sm">
                  <div className="space-y-2">
                    <Label htmlFor="acct-holder" className="text-[12px]">Account holder name</Label>
                    <Input
                      id="acct-holder"
                      placeholder="Full legal name"
                      value={newAccountHolder}
                      onChange={(e) => setNewAccountHolder(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acct-number" className="text-[12px]">Account number</Label>
                    <Input
                      id="acct-number"
                      placeholder="Account number"
                      value={newAccountNumber}
                      onChange={(e) => setNewAccountNumber(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="routing" className="text-[12px]">Routing number (optional)</Label>
                    <Input
                      id="routing"
                      placeholder="Routing number"
                      value={newRoutingNumber}
                      onChange={(e) => setNewRoutingNumber(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={addPayoutMethod} disabled={addingMethod}>
                  {addingMethod ? "Adding..." : "Save method"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
