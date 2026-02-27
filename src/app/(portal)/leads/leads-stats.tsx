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
    <div className="grid grid-cols-12 gap-4 mt-6">
      <FeatureCard
        className="col-span-12 sm:col-span-6 lg:col-span-4"
        title="Total Leads"
        value={total.toLocaleString()}
        icon={Users}
        subtitle="All time"
      />
      <FeatureCard
        className="col-span-12 sm:col-span-6 lg:col-span-4"
        title="This Month"
        value={thisMonth.toLocaleString()}
        icon={CalendarDays}
        subtitle="Leads generated"
      />
      <FeatureCard
        className="col-span-12 sm:col-span-12 lg:col-span-4"
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
