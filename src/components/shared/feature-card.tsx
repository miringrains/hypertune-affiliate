"use client";

import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { MiniSparkline } from "./mini-sparkline";
import { ConversionRing } from "./conversion-ring";

interface FeatureCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  trend?: { value: number; positive: boolean };
  sparklineData?: number[];
  sparklineColor?: string;
  ringValue?: number;
  ringLabel?: string;
  children?: ReactNode;
  className?: string;
}

export function FeatureCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  sparklineData,
  sparklineColor,
  ringValue,
  ringLabel,
  children,
  className,
}: FeatureCardProps) {
  const hasChart = sparklineData && sparklineData.length > 1;
  const hasRing = ringValue !== undefined;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 p-5 flex flex-col h-full",
        className,
      )}
    >
      <div className="flex justify-between items-start w-full">
        <span className="text-[12px] font-medium text-zinc-400 truncate">
          {title}
        </span>
        {Icon && (
          <Icon
            size={14}
            strokeWidth={ICON_STROKE_WIDTH}
            className="text-zinc-400 shrink-0 ml-2"
          />
        )}
      </div>

      <div className="flex items-end gap-2.5 mt-2">
        <span className="text-[1.625rem] font-semibold tracking-tight leading-none text-white">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-[11px] font-medium pb-0.5",
              trend.positive ? "text-emerald-400" : "text-rose-500",
            )}
          >
            {trend.positive ? (
              <TrendingUp size={12} strokeWidth={2} />
            ) : (
              <TrendingDown size={12} strokeWidth={2} />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-[11px] text-zinc-400 mt-1">{subtitle}</p>
      )}

      {hasChart && !hasRing && (
        <div className="mt-auto pt-3 -mx-1 w-[calc(100%+0.5rem)]">
          <MiniSparkline data={sparklineData!} color={sparklineColor} />
        </div>
      )}

      {hasRing && !hasChart && (
        <div className="flex justify-between items-end mt-auto pt-3">
          <div />
          <ConversionRing value={ringValue!} label={ringLabel} />
        </div>
      )}

      {hasChart && hasRing && (
        <div className="flex justify-between items-end mt-auto pt-3 gap-3">
          <div className="flex-1 min-w-0 -ml-1">
            <MiniSparkline data={sparklineData!} color={sparklineColor} />
          </div>
          <div className="shrink-0">
            <ConversionRing value={ringValue!} label={ringLabel} />
          </div>
        </div>
      )}

      {children && <div className="mt-auto pt-3">{children}</div>}
    </div>
  );
}
