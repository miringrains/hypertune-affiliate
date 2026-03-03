"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";

export default function MFAVerifyPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const router = useRouter();

  const handleVerify = useCallback(
    async (otpCode: string) => {
      if (otpCode.length !== 6 || verifying) return;
      setError("");
      setVerifying(true);

      const supabase = createClient();
      const { data: factors, error: listErr } =
        await supabase.auth.mfa.listFactors();

      if (listErr || !factors?.totp?.length) {
        setError("No authenticator found. Please contact support.");
        setVerifying(false);
        return;
      }

      const factorId = factors.totp[0].id;

      const { data: challenge, error: challengeErr } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeErr) {
        setError(challengeErr.message);
        setVerifying(false);
        return;
      }

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: otpCode,
      });

      if (verifyErr) {
        setError("Invalid code. Please try again.");
        setCode("");
        setVerifying(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    },
    [verifying, router],
  );

  function handleCodeChange(value: string) {
    setCode(value);
    if (value.length === 6) {
      handleVerify(value);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-xl bg-zinc-800/60 border border-zinc-700 flex items-center justify-center">
          <ShieldCheck
            size={24}
            strokeWidth={ICON_STROKE_WIDTH}
            className="text-zinc-300"
          />
        </div>
        <h2
          style={{
            fontSize: "1.8rem",
            letterSpacing: "-0.04em",
            fontWeight: 600,
            lineHeight: 1.1,
          }}
        >
          Two-Factor Authentication
        </h2>
        <p className="text-[14px] text-zinc-400">
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={handleCodeChange}
          disabled={verifying}
          autoFocus
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

        {error && (
          <p className="text-[13px] text-rose-500 text-center">{error}</p>
        )}

        <Button
          variant="chrome"
          className="w-full"
          disabled={code.length !== 6 || verifying}
          onClick={() => handleVerify(code)}
        >
          {verifying ? (
            <>
              <Loader2
                size={16}
                strokeWidth={ICON_STROKE_WIDTH}
                className="animate-spin"
              />
              Verifying...
            </>
          ) : (
            <>
              <ShieldCheck size={16} strokeWidth={ICON_STROKE_WIDTH} />
              Verify
            </>
          )}
        </Button>

        <a
          href="/login"
          className="text-[13px] text-zinc-400 hover:text-zinc-300 transition-colors"
        >
          Use a different account
        </a>
      </div>
    </div>
  );
}
