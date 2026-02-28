"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const NUMERIC_KEYS = new Set([
  "cookie_duration_days",
  "default_commission_rate",
  "default_commission_duration_months",
  "default_sub_affiliate_rate",
  "minimum_payout_amount",
]);

interface Setting {
  key: string;
  value: unknown;
  updated_at: string;
}

function formatLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function SettingRow({ setting }: { setting: Setting }) {
  const router = useRouter();
  const isNumeric = NUMERIC_KEYS.has(setting.key);
  const [value, setValue] = useState<string>(String(setting.value ?? ""));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const parsed = isNumeric ? Number(value) : value;

      if (isNumeric && isNaN(parsed as number)) {
        toast.error("Value must be a number");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: setting.key, value: parsed }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error("Failed to save", { description: err.error });
        return;
      }

      toast.success(`${formatLabel(setting.key)} updated`);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 border-b border-zinc-800 pb-4 last:border-0 last:pb-0">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium text-white">
            {formatLabel(setting.key)}
          </span>
        </div>
        <Input
          type={isNumeric ? "number" : "text"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-8 w-40 text-[13px] bg-zinc-900 border-zinc-800 text-white"
          step={isNumeric ? "any" : undefined}
        />
        <Button
          size="sm"
          onClick={save}
          disabled={saving || value === String(setting.value ?? "")}
          className="h-8 text-[12px]"
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      <span className="text-[11px] text-zinc-500">
        Last updated: {new Date(setting.updated_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}

export function SettingsAdminClient({ settings }: { settings: Setting[] }) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h2 className="text-heading-3">System Defaults</h2>
        {settings.length === 0 ? (
          <p className="text-[14px] text-zinc-400 text-center py-6">
            No settings configured yet.
          </p>
        ) : (
          <div className="space-y-4">
            {settings.map((s) => (
              <SettingRow key={s.key} setting={s} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
