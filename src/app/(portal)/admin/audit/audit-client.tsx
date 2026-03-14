"use client";

import { useState, useMemo } from "react";

export interface AffiliateAuditRow {
  id: string;
  name: string;
  slug: string;
  email: string;
  tierLevel: number;
  commissionRate: number;
  status: string;
  commTotal: number;
  commPaid: number;
  commApproved: number;
  commPending: number;
  commVoided: number;
  commCount: number;
  directCount: number;
  tier2Count: number;
  paidOut: number;
  delta: number;
  custTotal: number;
  custActive: number;
  custTrialing: number;
  custChurned: number;
  churnRate: number;
}

interface Props {
  rows: AffiliateAuditRow[];
  totals: {
    commTotal: number;
    commPaid: number;
    commApproved: number;
    paidOut: number;
    custTotal: number;
    custActive: number;
    custTrialing: number;
    custChurned: number;
  };
}

type SortKey = keyof AffiliateAuditRow;
type SortDir = "asc" | "desc";

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export function AuditClient({ rows, totals }: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("commTotal");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let data = q
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.slug.toLowerCase().includes(q) ||
            r.email.toLowerCase().includes(q),
        )
      : rows;

    data = [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

    return data;
  }, [rows, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-zinc-600 ml-0.5">↕</span>;
    return <span className="text-red-400 ml-0.5">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const platformChurn = totals.custActive + totals.custChurned > 0
    ? totals.custChurned / (totals.custActive + totals.custChurned)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Commissions" value={fmt(totals.commTotal)} />
        <SummaryCard label="Paid Out" value={fmt(totals.paidOut)} sub={`${fmt(totals.commApproved)} outstanding`} />
        <SummaryCard label="Customers" value={String(totals.custTotal)} sub={`${totals.custActive} active · ${totals.custTrialing} trialing · ${totals.custChurned} churned`} />
        <SummaryCard label="Platform Churn Rate" value={pct(platformChurn)} />
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, slug, or email..."
          className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500/40"
        />
        <span className="text-xs text-zinc-500">{filtered.length} affiliates</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-950/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 text-xs">
              <Th onClick={() => toggleSort("name")}>Affiliate<SortIcon col="name" /></Th>
              <Th onClick={() => toggleSort("tierLevel")} className="text-center">Tier<SortIcon col="tierLevel" /></Th>
              <Th onClick={() => toggleSort("custTotal")} className="text-center">Customers<SortIcon col="custTotal" /></Th>
              <Th onClick={() => toggleSort("churnRate")} className="text-center">Churn<SortIcon col="churnRate" /></Th>
              <Th onClick={() => toggleSort("commTotal")} className="text-right">Total Comms<SortIcon col="commTotal" /></Th>
              <Th onClick={() => toggleSort("commPaid")} className="text-right">Comm Paid<SortIcon col="commPaid" /></Th>
              <Th onClick={() => toggleSort("paidOut")} className="text-right">Paid Out<SortIcon col="paidOut" /></Th>
              <Th onClick={() => toggleSort("commApproved")} className="text-right">Outstanding<SortIcon col="commApproved" /></Th>
              <Th onClick={() => toggleSort("delta")} className="text-right">Delta<SortIcon col="delta" /></Th>
            </tr>
          </thead>
          <tbody className="text-zinc-200">
            {filtered.map((r) => (
              <>
                <tr
                  key={r.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900/40 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-white">{r.name}</div>
                    <div className="text-xs text-zinc-500">{r.slug}</div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${r.tierLevel === 1 ? "bg-blue-900/40 text-blue-300" : "bg-zinc-800 text-zinc-400"}`}>
                      T{r.tierLevel}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-white">{r.custTotal}</span>
                    <span className="text-zinc-500 text-xs ml-1">
                      ({r.custActive}a/{r.custTrialing}t/{r.custChurned}c)
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={r.churnRate > 0.5 ? "text-red-400" : r.churnRate > 0.3 ? "text-amber-400" : "text-emerald-400"}>
                      {pct(r.churnRate)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{fmt(r.commTotal)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-emerald-400">{fmt(r.commPaid)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-emerald-400">{fmt(r.paidOut)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-amber-400">{fmt(r.commApproved + r.commPending)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    <span className={Math.abs(r.delta) > 1 ? "text-red-400 font-bold" : "text-zinc-500"}>
                      {r.delta > 0 ? "+" : ""}{fmt(r.delta)}
                    </span>
                  </td>
                </tr>
                {expandedId === r.id && (
                  <tr key={`${r.id}-detail`} className="border-b border-zinc-800/50 bg-zinc-900/30">
                    <td colSpan={9} className="px-6 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
                        <div>
                          <div className="text-zinc-500 mb-1 uppercase tracking-wider font-semibold">Commission Breakdown</div>
                          <div className="space-y-1">
                            <div className="flex justify-between"><span>Paid</span><span className="text-emerald-400 font-mono">{fmt(r.commPaid)}</span></div>
                            <div className="flex justify-between"><span>Approved</span><span className="text-blue-400 font-mono">{fmt(r.commApproved)}</span></div>
                            <div className="flex justify-between"><span>Pending</span><span className="text-amber-400 font-mono">{fmt(r.commPending)}</span></div>
                            <div className="flex justify-between"><span>Voided</span><span className="text-red-400 font-mono">{fmt(r.commVoided)}</span></div>
                            <div className="flex justify-between border-t border-zinc-700 pt-1 font-semibold"><span>Total (non-voided)</span><span className="font-mono">{fmt(r.commTotal)}</span></div>
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-500 mb-1 uppercase tracking-wider font-semibold">Commission Types</div>
                          <div className="space-y-1">
                            <div className="flex justify-between"><span>Direct</span><span className="font-mono">{r.directCount}</span></div>
                            <div className="flex justify-between"><span>Tier 2</span><span className="font-mono">{r.tier2Count}</span></div>
                            <div className="flex justify-between"><span>Total</span><span className="font-mono">{r.commCount}</span></div>
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-500 mb-1 uppercase tracking-wider font-semibold">Customer States</div>
                          <div className="space-y-1">
                            <div className="flex justify-between"><span>Active</span><span className="text-emerald-400 font-mono">{r.custActive}</span></div>
                            <div className="flex justify-between"><span>Trialing</span><span className="text-blue-400 font-mono">{r.custTrialing}</span></div>
                            <div className="flex justify-between"><span>Churned</span><span className="text-red-400 font-mono">{r.custChurned}</span></div>
                            <div className="flex justify-between border-t border-zinc-700 pt-1 font-semibold"><span>Churn Rate</span><span>{pct(r.churnRate)}</span></div>
                          </div>
                        </div>
                        <div>
                          <div className="text-zinc-500 mb-1 uppercase tracking-wider font-semibold">Payout Accuracy</div>
                          <div className="space-y-1">
                            <div className="flex justify-between"><span>Comms marked paid</span><span className="font-mono">{fmt(r.commPaid)}</span></div>
                            <div className="flex justify-between"><span>Payouts completed</span><span className="font-mono">{fmt(r.paidOut)}</span></div>
                            <div className="flex justify-between border-t border-zinc-700 pt-1 font-semibold">
                              <span>Delta</span>
                              <span className={Math.abs(r.delta) > 1 ? "text-red-400" : "text-emerald-400"}>
                                {r.delta > 0 ? "+" : ""}{fmt(r.delta)}
                              </span>
                            </div>
                            <div className="text-zinc-600 mt-1">
                              {Math.abs(r.delta) < 1 ? "Accurate" : "Mismatch — investigate"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">{label}</div>
      <div className="text-xl font-bold text-white mt-1">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

function Th({ children, onClick, className = "" }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return (
    <th
      onClick={onClick}
      className={`px-3 py-2.5 text-left font-semibold select-none cursor-pointer hover:text-zinc-200 transition-colors whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  );
}
