"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Lock,
  ShieldCheck,
  ShieldOff,
  Copy,
  Loader2,
} from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";

export function SecuritySection() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollQR, setEnrollQR] = useState("");
  const [enrollSecret, setEnrollSecret] = useState("");
  const [enrollFactorId, setEnrollFactorId] = useState("");
  const [enrollCode, setEnrollCode] = useState("");
  const [enrollError, setEnrollError] = useState("");
  const [enrollVerifying, setEnrollVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const loadMfaFactors = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp?.find((f) => f.status === "verified");
    setMfaFactorId(totp?.id ?? null);
    setMfaLoading(false);
  }, []);

  useEffect(() => {
    loadMfaFactors();
  }, [loadMfaFactors]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);

    if (error) {
      toast.error("Failed to update password", { description: error.message });
      return;
    }

    toast.success("Password updated successfully");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function startMfaEnroll() {
    setEnrolling(true);
    setEnrollError("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });
    if (error || !data) {
      toast.error("Failed to start 2FA setup", {
        description: error?.message,
      });
      setEnrolling(false);
      return;
    }
    setEnrollFactorId(data.id);
    setEnrollQR(data.totp.qr_code);
    setEnrollSecret(data.totp.secret);
  }

  async function confirmMfaEnroll(otpCode: string) {
    if (otpCode.length !== 6 || enrollVerifying) return;
    setEnrollError("");
    setEnrollVerifying(true);

    const supabase = createClient();
    const { data: challenge, error: challengeErr } =
      await supabase.auth.mfa.challenge({ factorId: enrollFactorId });

    if (challengeErr) {
      setEnrollError(challengeErr.message);
      setEnrollVerifying(false);
      return;
    }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: enrollFactorId,
      challengeId: challenge.id,
      code: otpCode,
    });

    if (verifyErr) {
      setEnrollError("Invalid code. Please try again.");
      setEnrollCode("");
      setEnrollVerifying(false);
      return;
    }

    toast.success("Two-factor authentication enabled!");
    setEnrolling(false);
    setEnrollQR("");
    setEnrollSecret("");
    setEnrollFactorId("");
    setEnrollCode("");
    setEnrollVerifying(false);
    loadMfaFactors();
  }

  async function disableMfa() {
    if (!mfaFactorId) return;
    setDisabling(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
    setDisabling(false);
    if (error) {
      toast.error("Failed to disable 2FA", { description: error.message });
      return;
    }
    toast.success("Two-factor authentication disabled");
    setMfaFactorId(null);
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <h2 className="text-heading-3">Security</h2>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="new-pw" className="text-[12px]">New password</Label>
            <Input
              id="new-pw"
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pw" className="text-[12px]">Confirm new password</Label>
            <Input
              id="confirm-pw"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-9"
            />
          </div>
          <Button type="submit" size="sm" disabled={changingPassword || !newPassword}>
            {changingPassword ? (
              "Updating..."
            ) : (
              <>
                <Lock size={14} strokeWidth={ICON_STROKE_WIDTH} />
                Update password
              </>
            )}
          </Button>
        </form>

        {/* Two-Factor Authentication */}
        <div className="border-t border-border pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} strokeWidth={ICON_STROKE_WIDTH} className="text-muted-foreground" />
              <h3 className="text-[13px] font-medium">Two-Factor Authentication</h3>
            </div>
            {!mfaLoading && mfaFactorId && (
              <span className="text-[11px] font-medium text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10">
                Enabled
              </span>
            )}
          </div>

          {mfaLoading ? (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Loading...
            </div>
          ) : mfaFactorId ? (
            <div className="space-y-3">
              <p className="text-[13px] text-muted-foreground">
                Your account is protected with an authenticator app.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={disableMfa}
                disabled={disabling}
                className="text-rose-500 hover:text-rose-400 border-rose-500/20"
              >
                {disabling ? (
                  "Disabling..."
                ) : (
                  <>
                    <ShieldOff size={14} strokeWidth={ICON_STROKE_WIDTH} />
                    Disable 2FA
                  </>
                )}
              </Button>
            </div>
          ) : enrolling ? (
            <div className="space-y-4 max-w-sm">
              <p className="text-[13px] text-muted-foreground">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
              </p>
              {enrollQR && (
                <div className="flex justify-center">
                  <div className="rounded-lg border border-zinc-700 bg-white p-3">
                    <img src={enrollQR} alt="QR Code" width={180} height={180} />
                  </div>
                </div>
              )}
              {enrollSecret && (
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">
                    Or enter this secret manually:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[12px] font-mono bg-black border border-zinc-700 rounded px-2 py-1.5 text-zinc-300 break-all select-all">
                      {enrollSecret}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-8 w-8 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(enrollSecret);
                        toast.success("Secret copied!");
                      }}
                    >
                      <Copy size={13} strokeWidth={ICON_STROKE_WIDTH} />
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-[12px]">Enter verification code</Label>
                <InputOTP
                  maxLength={6}
                  value={enrollCode}
                  onChange={(val) => {
                    setEnrollCode(val);
                    if (val.length === 6) confirmMfaEnroll(val);
                  }}
                  disabled={enrollVerifying}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                {enrollError && (
                  <p className="text-[12px] text-rose-500">{enrollError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={enrollCode.length !== 6 || enrollVerifying}
                  onClick={() => confirmMfaEnroll(enrollCode)}
                >
                  {enrollVerifying ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} strokeWidth={ICON_STROKE_WIDTH} />
                      Enable 2FA
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEnrolling(false);
                    setEnrollQR("");
                    setEnrollSecret("");
                    setEnrollCode("");
                    setEnrollError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] text-muted-foreground">
                Add an extra layer of security by requiring a code from your authenticator app when signing in.
              </p>
              <Button variant="outline" size="sm" onClick={startMfaEnroll}>
                <ShieldCheck size={14} strokeWidth={ICON_STROKE_WIDTH} />
                Enable 2FA
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
