"use client";

import { useState } from "react";
import { X, Info } from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";

const STORAGE_KEY = "ht_migration_banner_dismissed";

export function MigrationBanner() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });

  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="relative bg-zinc-900/80 border border-zinc-700/60 rounded-lg px-4 py-3 mb-6">
      <div className="flex items-start gap-3 pr-8">
        <Info
          size={16}
          strokeWidth={ICON_STROKE_WIDTH}
          className="shrink-0 mt-0.5 text-zinc-400"
        />
        <div className="space-y-1">
          <p className="text-[13px] font-medium text-zinc-200">
            Welcome to Your New Affiliate Dashboard
          </p>
          <p className="text-[12px] text-zinc-400 leading-relaxed">
            We&apos;ve migrated your historical data from our previous system.
            While we&apos;ve done our best to ensure accuracy, you may notice
            minor discrepancies in legacy stats. Rest assured — this is purely
            cosmetic for historical continuity. All new activity from this point
            forward is tracked with full precision.
          </p>
        </div>
      </div>
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} strokeWidth={ICON_STROKE_WIDTH} />
      </button>
    </div>
  );
}
