"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Trash2,
  Plus,
  Link2,
  Loader2,
} from "lucide-react";
import { ICON_STROKE_WIDTH, COMMISSION_RATES } from "@/lib/constants";

interface InviteLink {
  id: string;
  code: string;
  commission_rate: number;
  label: string | null;
  is_reusable: boolean;
  is_tracking_only: boolean;
  parent_affiliate_id: string | null;
  expires_at: string | null;
  created_at: string;
  used_by_affiliate_id: string | null;
  usage_count: number;
}

export default function AdminLinksPage() {
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newRate, setNewRate] = useState<number>(COMMISSION_RATES[0]);
  const [newLabel, setNewLabel] = useState("");

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const fetchLinks = useCallback(async () => {
    const res = await fetch("/api/admin/invite-links");
    if (res.ok) {
      setLinks(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  async function createLink(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    const res = await fetch("/api/admin/invite-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commission_rate: newRate,
        label: newLabel || null,
        is_reusable: true,
      }),
    });

    setCreating(false);

    if (res.ok) {
      toast.success("Invite link created");
      setShowForm(false);
      setNewLabel("");
      fetchLinks();
    } else {
      const data = await res.json();
      toast.error("Failed to create link", { description: data.error });
    }
  }

  async function deleteLink(id: string) {
    const res = await fetch(`/api/admin/invite-links?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("Link deleted");
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } else {
      toast.error("Failed to delete link");
    }
  }

  async function copyLink(link: InviteLink) {
    const url = `${appUrl}/accept-invite/${link.code}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    toast.success("Invite link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2
          size={24}
          strokeWidth={ICON_STROKE_WIDTH}
          className="animate-spin text-muted-foreground"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm">Invite Links</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Generate and manage Tier 1 affiliate invite links
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus size={15} strokeWidth={ICON_STROKE_WIDTH} />
          New Link
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6 pb-6 px-6">
            <form onSubmit={createLink} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rate">Commission Rate</Label>
                  <select
                    id="rate"
                    value={newRate}
                    onChange={(e) => setNewRate(Number(e.target.value))}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    {COMMISSION_RATES.map((rate) => (
                      <option key={rate} value={rate}>
                        {rate}%
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label">Label (optional)</Label>
                  <Input
                    id="label"
                    placeholder="e.g. Main 70% tier"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Invite Link"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {links.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Link2
              size={32}
              strokeWidth={ICON_STROKE_WIDTH}
              className="mx-auto mb-3 text-muted-foreground"
            />
            <p className="text-[14px] text-muted-foreground">
              No invite links yet. Create one to start recruiting affiliates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <Card key={link.id}>
              <CardContent className="py-4 px-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold">
                        {link.commission_rate}% Commission
                      </span>
                      {link.label && (
                        <span className="text-[11px] text-muted-foreground px-2 py-0.5 rounded-full border border-border">
                          {link.label}
                        </span>
                      )}
                      {link.is_reusable ? (
                        <span className="text-[11px] text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50">
                          Reusable
                        </span>
                      ) : (
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full border ${
                            link.used_by_affiliate_id
                              ? "text-muted-foreground border-border"
                              : "text-blue-600 border-blue-200 bg-blue-50"
                          }`}
                        >
                          {link.used_by_affiliate_id ? "Used" : "Available"}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] font-mono text-muted-foreground truncate">
                      {appUrl}/accept-invite/{link.code}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Created{" "}
                      {new Date(link.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyLink(link)}
                    >
                      {copiedId === link.id ? (
                        <Check size={14} strokeWidth={ICON_STROKE_WIDTH} />
                      ) : (
                        <Copy size={14} strokeWidth={ICON_STROKE_WIDTH} />
                      )}
                      {copiedId === link.id ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteLink(link.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 size={14} strokeWidth={ICON_STROKE_WIDTH} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
