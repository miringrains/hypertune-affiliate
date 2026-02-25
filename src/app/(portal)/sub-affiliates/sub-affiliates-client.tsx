"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Trash2,
  Plus,
  Link2,
  Users,
  Loader2,
} from "lucide-react";
import { ICON_STROKE_WIDTH, COMMISSION_RATES } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Tables } from "@/lib/supabase/types";

interface InviteLink {
  id: string;
  code: string;
  commission_rate: number;
  label: string | null;
  is_reusable: boolean;
  created_at: string;
}

interface SubAffiliate {
  id: string;
  name: string;
  slug: string;
  email: string;
  status: string;
  created_at: string;
  commission_rate: number;
  tier_level: number;
}

interface Props {
  affiliate: Tables<"affiliates">;
  subAffiliates: SubAffiliate[];
}

export function SubAffiliatesClient({ affiliate, subAffiliates }: Props) {
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedRate, setSelectedRate] = useState<number>(COMMISSION_RATES[0]);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const fetchLinks = useCallback(async () => {
    const res = await fetch("/api/affiliates/invite-links");
    if (res.ok) {
      setLinks(await res.json());
    }
    setLoadingLinks(false);
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  async function createLink() {
    setCreating(true);
    const res = await fetch("/api/affiliates/invite-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commission_rate: selectedRate }),
    });

    setCreating(false);

    if (res.ok) {
      toast.success("Recruit link created");
      fetchLinks();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create link");
    }
  }

  async function deleteLink(id: string) {
    const res = await fetch(`/api/affiliates/invite-links?id=${id}`, {
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
    toast.success("Recruit link copied!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-display-sm">Sub-Affiliates</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Recruit sub-affiliates and manage your team
        </p>
      </div>

      {/* Recruit Links Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-heading-3">Recruit Links</h2>
          <div className="flex items-center gap-2">
            <select
              value={selectedRate}
              onChange={(e) => setSelectedRate(Number(e.target.value))}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              {COMMISSION_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}%
                </option>
              ))}
            </select>
            <Button onClick={createLink} disabled={creating} size="sm">
              <Plus size={14} strokeWidth={ICON_STROKE_WIDTH} />
              {creating ? "Creating..." : "Create Link"}
            </Button>
          </div>
        </div>

        {loadingLinks ? (
          <div className="flex justify-center py-8">
            <Loader2
              size={20}
              strokeWidth={ICON_STROKE_WIDTH}
              className="animate-spin text-muted-foreground"
            />
          </div>
        ) : links.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Link2
                size={28}
                strokeWidth={ICON_STROKE_WIDTH}
                className="mx-auto mb-2 text-muted-foreground"
              />
              <p className="text-[13px] text-muted-foreground">
                Create a recruit link to start building your team.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <Card key={link.id}>
                <CardContent className="py-3 px-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[13px] font-semibold">
                          {link.commission_rate}% Commission
                        </span>
                        {link.label && (
                          <span className="text-[11px] text-muted-foreground">
                            {link.label}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] font-mono text-muted-foreground truncate">
                        {appUrl}/accept-invite/{link.code}
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

      {/* Sub-Affiliates Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-heading-3">Your Sub-Affiliates</h2>
          <span className="text-[12px] text-muted-foreground">
            {subAffiliates.length} recruited
          </span>
        </div>

        {subAffiliates.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users
                size={28}
                strokeWidth={ICON_STROKE_WIDTH}
                className="mx-auto mb-2 text-muted-foreground"
              />
              <p className="text-[13px] text-muted-foreground">
                No sub-affiliates yet. Share your recruit links to build your
                team.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                      Name
                    </th>
                    <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                      Gamer Tag
                    </th>
                    <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                      Rate
                    </th>
                    <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                      Status
                    </th>
                    <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subAffiliates.map((sub) => (
                    <tr
                      key={sub.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-5 py-3">
                        <div>
                          <p className="text-[13px] font-medium">{sub.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {sub.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[12px] font-mono text-muted-foreground">
                          {sub.slug}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[13px]">
                          {sub.commission_rate}%
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[12px] text-muted-foreground">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
