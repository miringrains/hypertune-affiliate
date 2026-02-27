"use client";

import { Wallet, Clock, Receipt } from "lucide-react";
import { FeatureCard } from "@/components/shared/feature-card";

interface PayoutsStatsProps {
  lifetimePaid: number;
  pendingEstimate: number;
  totalPayouts: number;
}

function fmt(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PayoutsStats({
  lifetimePaid,
  pendingEstimate,
  totalPayouts,
}: PayoutsStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
      <FeatureCard
        title="Lifetime Paid"
        value={fmt(lifetimePaid)}
        icon={Wallet}
        subtitle="Total payouts completed"
      />
      <FeatureCard
        title="Next Estimate"
        value={fmt(pendingEstimate)}
        icon={Clock}
        subtitle="Pending commissions"
      />
      <FeatureCard
        title="Total Payouts"
        value={totalPayouts.toLocaleString()}
        icon={Receipt}
        subtitle="Payout transactions"
      />
    </div>
  );
}
