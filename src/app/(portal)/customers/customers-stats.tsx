"use client";

import { UserCheck, Clock, UserX, DollarSign } from "lucide-react";
import { FeatureCard } from "@/components/shared/feature-card";

interface CustomersStatsProps {
  active: number;
  trialing: number;
  churned: number;
  mrr: number;
  total: number;
}

function formatMRR(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function CustomersStats({
  active,
  trialing,
  churned,
  mrr,
  total,
}: CustomersStatsProps) {
  const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
      <FeatureCard
        title="Active"
        value={active.toLocaleString()}
        icon={UserCheck}
        subtitle="Paying customers"
        ringValue={activeRate}
        ringLabel={`${activeRate}%`}
      />
      <FeatureCard
        title="Trialing"
        value={trialing.toLocaleString()}
        icon={Clock}
        subtitle="In trial period"
      />
      <FeatureCard
        title="Churned"
        value={churned.toLocaleString()}
        icon={UserX}
        subtitle="Canceled or dormant"
      />
      <FeatureCard
        title="Est. MRR"
        value={formatMRR(mrr)}
        icon={DollarSign}
        subtitle="Monthly recurring revenue"
      />
    </div>
  );
}
