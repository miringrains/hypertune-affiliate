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
    <div className="grid grid-cols-12 gap-4 mt-6">
      <FeatureCard
        className="col-span-12 sm:col-span-6 lg:col-span-4"
        title="Lifetime Paid"
        value={fmt(lifetimePaid)}
        icon={Wallet}
        subtitle="Total payouts completed"
      />
      <FeatureCard
        className="col-span-12 sm:col-span-6 lg:col-span-4"
        title="Next Estimate"
        value={fmt(pendingEstimate)}
        icon={Clock}
        subtitle="Pending commissions"
      />
      <FeatureCard
        className="col-span-12 sm:col-span-12 lg:col-span-4"
        title="Total Payouts"
        value={totalPayouts.toLocaleString()}
        icon={Receipt}
        subtitle="Payout transactions"
      />
    </div>
  );
}
