"use client";

import { DollarSign, Clock, CalendarDays, TrendingUp } from "lucide-react";
import { FeatureCard } from "@/components/shared/feature-card";

interface CommissionsStatsProps {
  earned: number;
  pending: number;
  thisMonth: number;
  sparkline: number[];
}

function fmt(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CommissionsStats({
  earned,
  pending,
  thisMonth,
  sparkline,
}: CommissionsStatsProps) {
  return (
    <div className="grid grid-cols-12 gap-4 mt-6">
      <FeatureCard
        className="col-span-12 sm:col-span-6 lg:col-span-3"
        title="Total Earned"
        value={fmt(earned)}
        icon={DollarSign}
        subtitle="Paid out"
      />
      <FeatureCard
        className="col-span-12 sm:col-span-6 lg:col-span-3"
        title="Pending"
        value={fmt(pending)}
        icon={Clock}
        subtitle="Awaiting payout"
      />
      <FeatureCard
        className="col-span-12 sm:col-span-6 lg:col-span-3"
        title="This Month"
        value={fmt(thisMonth)}
        icon={CalendarDays}
        subtitle="Commissions generated"
      />
      <FeatureCard
        className="col-span-12 sm:col-span-6 lg:col-span-3"
        title="Monthly Trend"
        value={fmt(sparkline[sparkline.length - 1] ?? 0)}
        icon={TrendingUp}
        subtitle="Last 6 months"
        sparklineData={sparkline}
        sparklineColor="#22c55e"
      />
    </div>
  );
}
