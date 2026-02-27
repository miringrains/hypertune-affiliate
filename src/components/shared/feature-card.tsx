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
        "relative overflow-hidden rounded-xl border border-white/[0.06] p-5",
        className,
      )}
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(225,38,27,0.07) 0%, transparent 60%), linear-gradient(135deg, #111 0%, #1a1a1a 100%)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {Icon && (
              <Icon
                size={14}
                strokeWidth={ICON_STROKE_WIDTH}
                className="text-white/40 shrink-0"
              />
            )}
            <span className="text-[12px] font-medium text-white/50 truncate">
              {title}
            </span>
          </div>

          <div className="flex items-end gap-2.5">
            <span className="text-[1.625rem] font-semibold tracking-tight leading-none text-white">
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-[11px] font-medium pb-0.5",
                  trend.positive ? "text-emerald-400" : "text-red-400",
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
            <p className="text-[11px] text-white/40 mt-1.5">{subtitle}</p>
          )}
        </div>

        {hasRing && (
          <div className="shrink-0">
            <ConversionRing value={ringValue!} label={ringLabel} />
          </div>
        )}
      </div>

      {/* Sparkline */}
      {hasChart && (
        <div className="mt-3 -mx-1">
          <MiniSparkline data={sparklineData!} color={sparklineColor} />
        </div>
      )}

      {/* Custom content slot */}
      {children}
    </div>
  );
}
