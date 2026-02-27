"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";

interface PayoutMethod {
  id: string;
  type: string;
  isPrimary: boolean;
}

interface SettingsClientProps {
  affiliate: Tables<"affiliates">;
  userEmail: string;
  payoutMethods: PayoutMethod[];
}

export function SettingsClient({ affiliate, userEmail, payoutMethods }: SettingsClientProps) {
  const [editingSlug, setEditingSlug] = useState(false);
  const [slug, setSlug] = useState(affiliate.slug);
  const [saving, setSaving] = useState(false);

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
          </div>
        </CardContent>
      </Card>

      {/* Payout Method */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-heading-3">Payout Method</h2>
          </div>

          {payoutMethods.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              No payout method configured. Contact admin to set up your payment method.
            </p>
          ) : (
            <div className="space-y-3">
              {payoutMethods.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <Wallet size={15} strokeWidth={ICON_STROKE_WIDTH} className="text-muted-foreground shrink-0" />
                  <span className="text-[13px] font-medium capitalize">
                    {m.type.replace(/_/g, " ")}
                  </span>
                  {m.isPrimary && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                      <CheckCircle2 size={12} />
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
