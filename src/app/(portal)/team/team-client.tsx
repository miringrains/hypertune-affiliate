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
  UserPlus,
  DollarSign,
  Trophy,
  Crown,
  ArrowUpRight,
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

interface TeamMember {
  id: string;
  name: string;
  slug: string;
  email: string;
  status: string;
  created_at: string;
  commission_rate: number;
  tier_level: number;
  leads: number;
  customers: number;
  earned: number;
}

interface TeamSummary {
  recruited: number;
  active: number;
  combinedRevenue: number;
  teamEarnings: number;
}

interface Props {
  affiliate: Tables<"affiliates">;
  summary: TeamSummary;
  members: TeamMember[];
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function TeamClient({ affiliate, summary, members }: Props) {
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedRate, setSelectedRate] = useState<number>(COMMISSION_RATES[0]);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const fetchLinks = useCallback(async () => {
    const res = await fetch("/api/affiliates/invite-links");
    if (res.ok) setLinks(await res.json());
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
    const res = await fetch(`/api/affiliates/invite-links?id=${id}`, { method: "DELETE" });
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

  // Sorted by earned desc for leaderboard
  const leaderboard = [...members]
    .filter((m) => m.status === "active")
    .sort((a, b) => b.earned - a.earned);

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-sm">Team</h1>
        <p className="text-[14px] text-muted-foreground mt-1">
          Recruit sub-affiliates and track your team&apos;s performance.
        </p>
      </div>

      {/* ── Summary Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: UserPlus,
            label: "Recruited",
            value: summary.recruited.toString(),
            sub: "sub-affiliates",
            iconColor: "text-blue-400",
          },
          {
            icon: Users,
            label: "Active",
            value: summary.active.toString(),
            sub: "producing",
            iconColor: "text-emerald-400",
          },
          {
            icon: DollarSign,
            label: "Their Revenue",
            value: fmtCurrency(summary.combinedRevenue),
            sub: "combined",
            iconColor: "text-white/50",
          },
          {
            icon: ArrowUpRight,
            label: "Your Earnings",
            value: fmtCurrency(summary.teamEarnings),
            sub: "from team",
            iconColor: "text-emerald-400",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl p-4"
            style={{
              background: "linear-gradient(135deg, #111, #1a1a1a)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <item.icon size={14} strokeWidth={ICON_STROKE_WIDTH} className={`mb-2 ${item.iconColor}`} />
            <p className="text-[20px] sm:text-[22px] font-semibold tracking-tight leading-none text-white">
              {item.value}
            </p>
            <p className="text-[11px] text-white/35 mt-1">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Leaderboard ── */}
      {top3.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(234,179,8,0.08) 0%, transparent 50%), linear-gradient(135deg, #111, #1a1a1a)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Trophy size={15} strokeWidth={ICON_STROKE_WIDTH} className="text-amber-400/60" />
            <h3 className="text-[13px] font-medium text-white/50">Top Performers</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {top3.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-lg p-3"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div
                  className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold"
                  style={{
                    background:
                      i === 0
                        ? "rgba(234,179,8,0.2)"
                        : i === 1
                          ? "rgba(192,192,192,0.15)"
                          : "rgba(205,127,50,0.15)",
                    color: i === 0 ? "#eab308" : i === 1 ? "#c0c0c0" : "#cd7f32",
                  }}
                >
                  {i === 0 ? <Crown size={16} /> : `#${i + 1}`}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white truncate">{m.name}</p>
                  <div className="flex items-center gap-3 text-[11px] text-white/35 mt-0.5">
                    <span>{m.customers} customers</span>
                    <span className="font-medium text-emerald-400/70">{fmtCurrency(m.earned)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recruit Links ── */}
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
          <div className="flex justify-center py-6">
            <Loader2 size={20} strokeWidth={ICON_STROKE_WIDTH} className="animate-spin text-muted-foreground" />
          </div>
        ) : links.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Link2 size={28} strokeWidth={ICON_STROKE_WIDTH} className="mx-auto mb-2 text-muted-foreground" />
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
                          <span className="text-[11px] text-muted-foreground">{link.label}</span>
                        )}
                      </div>
                      <p className="text-[12px] font-mono text-muted-foreground truncate">
                        {appUrl}/accept-invite/{link.code}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => copyLink(link)}>
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

      {/* ── Full Roster ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-heading-3">All Members</h2>
          <span className="text-[12px] text-muted-foreground">{members.length} total</span>
        </div>

        {members.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users size={28} strokeWidth={ICON_STROKE_WIDTH} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-[13px] text-muted-foreground">
                No sub-affiliates yet. Share your recruit links to build your team.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Name", "Tag", "Rate", "Leads", "Customers", "Earned", "Status", "Joined"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 py-3"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">
                        <div>
                          <p className="text-[13px] font-medium">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground">{m.email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[12px] font-mono text-muted-foreground">
                        {m.slug}
                      </td>
                      <td className="px-5 py-3 text-[13px]">{m.commission_rate}%</td>
                      <td className="px-5 py-3 text-[13px] tabular-nums">{m.leads}</td>
                      <td className="px-5 py-3 text-[13px] tabular-nums">{m.customers}</td>
                      <td className="px-5 py-3 text-[13px] font-medium tabular-nums">
                        {fmtCurrency(m.earned)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-5 py-3 text-[12px] text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString()}
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
