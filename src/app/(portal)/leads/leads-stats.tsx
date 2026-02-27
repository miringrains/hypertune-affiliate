"use client";

import { Users, CalendarDays, TrendingUp } from "lucide-react";
import { FeatureCard } from "@/components/shared/feature-card";

interface LeadsStatsProps {
  total: number;
  thisMonth: number;
  sparkline: number[];
}

export function LeadsStats({ total, thisMonth, sparkline }: LeadsStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
      <FeatureCard
        title="Total Leads"
        value={total.toLocaleString()}
        icon={Users}
        subtitle="All time"
      />
      <FeatureCard
        title="This Month"
        value={thisMonth.toLocaleString()}
        icon={CalendarDays}
        subtitle="Leads generated"
      />
      <FeatureCard
        title="Weekly Trend"
        value={sparkline[sparkline.length - 1]?.toLocaleString() ?? "0"}
        icon={TrendingUp}
        subtitle="Last 12 weeks"
        sparklineData={sparkline}
        sparklineColor="#22c55e"
      />
    </div>
  );
}
