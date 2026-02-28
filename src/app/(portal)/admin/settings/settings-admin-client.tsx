"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

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
    <div className="flex flex-col gap-1.5 border-b border-zinc-700 pb-4 last:border-0 last:pb-0">
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
          className="h-8 w-40 text-[13px] bg-zinc-900 border-zinc-700 text-white"
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
      <span className="text-[11px] text-zinc-400">
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

function PayPalConfig({ isConnected, mode }: { isConnected: boolean; mode: string }) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [paypalMode, setPaypalMode] = useState<"sandbox" | "live">(mode === "live" ? "live" : "sandbox");
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  async function saveCredentials() {
    if (!clientId || !clientSecret) {
      toast.error("Both Client ID and Secret are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/paypal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          mode: paypalMode,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error("Failed to save", { description: err.error });
        return;
      }

      toast.success("PayPal credentials saved");
      setClientId("");
      setClientSecret("");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-heading-3">PayPal Payouts</h2>
            <Image
              src="/paypal-logo.png"
              alt="PayPal"
              width={70}
              height={18}
              className="opacity-70"
            />
          </div>
          {isConnected ? (
            <span className="flex items-center gap-1.5 text-[12px] text-emerald-400">
              <CheckCircle2 size={14} />
              Connected ({mode})
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[12px] text-amber-400">
              <AlertCircle size={14} />
              Not configured
            </span>
          )}
        </div>

        <p className="text-[13px] text-zinc-400">
          Connect your PayPal Business account to send payouts directly to affiliates.
          You need a PayPal Business account with the{" "}
          <a
            href="https://developer.paypal.com/docs/api/payments.payouts-batch/v1/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-300 underline underline-offset-2"
          >
            Payouts API
          </a>{" "}
          enabled.
        </p>

        {isConnected && (
          <div className="rounded-lg border border-zinc-700 bg-black px-4 py-3">
            <p className="text-[12px] text-zinc-400">
              PayPal is connected and ready to process payouts. To update credentials, enter new ones below.
            </p>
          </div>
        )}

        <div className="space-y-4 max-w-md">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPaypalMode("sandbox")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium border transition-colors ${
                paypalMode === "sandbox"
                  ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                  : "border-zinc-700 text-zinc-400 hover:text-zinc-300"
              }`}
            >
              Sandbox (testing)
            </button>
            <button
              type="button"
              onClick={() => setPaypalMode("live")}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium border transition-colors ${
                paypalMode === "live"
                  ? "border-zinc-600 bg-zinc-800 text-zinc-100"
                  : "border-zinc-700 text-zinc-400 hover:text-zinc-300"
              }`}
            >
              Live (production)
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pp-client-id" className="text-[12px]">Client ID</Label>
            <Input
              id="pp-client-id"
              type="text"
              placeholder={isConnected ? "••••••••••••••••" : "PayPal Client ID"}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="h-9 font-mono text-[12px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pp-secret" className="text-[12px]">Client Secret</Label>
            <div className="relative">
              <Input
                id="pp-secret"
                type={showSecret ? "text" : "password"}
                placeholder={isConnected ? "••••••••••••••••" : "PayPal Client Secret"}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="h-9 font-mono text-[12px] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
              >
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <Button
            size="sm"
            onClick={saveCredentials}
            disabled={saving || !clientId || !clientSecret}
          >
            {saving ? "Saving..." : isConnected ? "Update Credentials" : "Connect PayPal"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsAdminClient({
  settings,
  paypalConnected,
  paypalMode,
}: {
  settings: Setting[];
  paypalConnected: boolean;
  paypalMode: string;
}) {
  return (
    <div className="space-y-8">
      <PayPalConfig isConnected={paypalConnected} mode={paypalMode} />

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
    </div>
  );
}
