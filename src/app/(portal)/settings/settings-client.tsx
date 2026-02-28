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
  Lock,
  Trash2,
  Plus,
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
  const [newPaypalEmail, setNewPaypalEmail] = useState("");
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
    if (!newPaypalEmail) {
      toast.error("Please enter your PayPal email");
      return;
    }
    setAddingMethod(true);

    const res = await fetch("/api/affiliates/payout-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ details: { email: newPaypalEmail } }),
    });

    setAddingMethod(false);

    if (!res.ok) {
      const { error } = await res.json();
      toast.error("Failed to add PayPal", { description: error });
      return;
    }

    const created = await res.json();
    setMethods((prev) => [
      ...prev,
      { id: created.id, type: created.method_type, details: created.details, isPrimary: created.is_primary },
    ]);
    setShowAddForm(false);
    setNewPaypalEmail("");
    toast.success("PayPal account linked");
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
    toast.success("PayPal account removed");
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

      {/* Payout — PayPal Only */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-heading-3">Payout Method</h2>
              <Image
                src="/paypal-logo.png"
                alt="PayPal"
                width={70}
                height={18}
                className="opacity-70"
              />
            </div>
            {!showAddForm && methods.length === 0 && (
              <Button size="xs" variant="ghost" onClick={() => setShowAddForm(true)}>
                <Plus size={14} strokeWidth={ICON_STROKE_WIDTH} />
                Connect PayPal
              </Button>
            )}
          </div>

          {methods.length === 0 && !showAddForm && (
            <div className="rounded-lg border border-zinc-800 bg-black p-4">
              <p className="text-[13px] text-zinc-400">
                Link your PayPal account to receive payouts. You&apos;ll be paid directly to your PayPal email.
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setShowAddForm(true)}
              >
                <Plus size={14} strokeWidth={ICON_STROKE_WIDTH} />
                Add PayPal Email
              </Button>
            </div>
          )}

          {methods.length > 0 && (
            <div className="space-y-3">
              {methods.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-black px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/paypal-logo.png"
                      alt="PayPal"
                      width={50}
                      height={13}
                      className="opacity-60"
                    />
                    <span className="text-[13px] text-zinc-300">{m.details?.email}</span>
                    {m.isPrimary && (
                      <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                        <CheckCircle2 size={11} />
                        Active
                      </span>
                    )}
                  </div>
                  <Button size="xs" variant="ghost" onClick={() => deleteMethod(m.id)} title="Remove">
                    <Trash2 size={12} strokeWidth={ICON_STROKE_WIDTH} className="text-zinc-500 hover:text-red-400" />
                  </Button>
                </div>
              ))}

              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  + Add another PayPal account
                </button>
              )}
            </div>
          )}

          {showAddForm && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="space-y-2">
                <Label htmlFor="paypal-email" className="text-[12px]">PayPal email address</Label>
                <p className="text-[11px] text-zinc-500">
                  Enter the email associated with your PayPal account. Payouts will be sent here.
                </p>
                <Input
                  id="paypal-email"
                  type="email"
                  placeholder="you@example.com"
                  value={newPaypalEmail}
                  onChange={(e) => setNewPaypalEmail(e.target.value)}
                  className="h-9 max-w-sm"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={addPayoutMethod} disabled={addingMethod || !newPaypalEmail}>
                  {addingMethod ? "Linking..." : "Link PayPal"}
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
