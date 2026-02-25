"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [invite, setInvite] = useState<{
    commission_rate: number;
    parent_affiliate_id: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [gamerTag, setGamerTag] = useState("");
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supabase = createClient();

  const slug = gamerTag.toLowerCase().replace(/[^a-z0-9-]/g, "");

  const checkSlugAvailability = useCallback(async (s: string) => {
    if (s.length < 2) {
      setSlugAvailable(null);
      return;
    }
    setCheckingSlug(true);
    try {
      const res = await fetch("/api/affiliates/check-slug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: s }),
      });
      if (res.ok) {
        const data = await res.json();
        setSlugAvailable(data.available);
      }
    } finally {
      setCheckingSlug(false);
    }
  }, []);

  function handleGamerTagChange(value: string) {
    setGamerTag(value);
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlugAvailable(null);

    if (slugTimer.current) clearTimeout(slugTimer.current);
    if (normalized.length >= 2) {
      slugTimer.current = setTimeout(
        () => checkSlugAvailability(normalized),
        400,
      );
    }
  }

  useEffect(() => {
    async function checkInvite() {
      const res = await fetch(`/api/auth/check-invite?code=${code}`);
      if (res.ok) {
        const data = await res.json();
        setInvite(data);
      } else {
        toast.error("Invalid or expired invite link");
      }
      setLoading(false);
    }
    checkInvite();
  }, [code]);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();

    if (slugAvailable === false) {
      toast.error("That gamer tag is already taken. Please choose another.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback?invite_code=${code}&name=${encodeURIComponent(name)}&slug=${encodeURIComponent(slug)}`,
      },
    });

    setSubmitting(false);

    if (error) {
      toast.error("Signup failed", { description: error.message });
      return;
    }

    setStep("confirm");
    toast.success("Check your email!", {
      description: "Click the confirmation link to activate your account.",
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2
          size={24}
          strokeWidth={ICON_STROKE_WIDTH}
          className="animate-spin text-muted-foreground"
        />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-heading-2">Invalid Invite</h2>
        <p className="text-body-sm text-muted-foreground">
          This invite link is invalid or has already been used.
        </p>
        <Button variant="ghost" onClick={() => router.push("/login")}>
          Go to login
        </Button>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-heading-2">Confirm your email</h2>
        <p className="text-body-sm text-muted-foreground">
          We sent a confirmation link to <strong>{email}</strong>. Click it to
          activate your affiliate account, then sign in with your password.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-heading-2">Join as an Affiliate</h2>
        <p className="text-body-sm text-muted-foreground">
          You&apos;ve been invited to the Hypertune affiliate program at{" "}
          <strong>70%</strong> commission.
        </p>
      </div>

      <form onSubmit={handleSignUp} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="gamertag">Gamer Tag</Label>
          <div className="relative">
            <Input
              id="gamertag"
              placeholder="kuz2stronk"
              value={gamerTag}
              onChange={(e) => handleGamerTagChange(e.target.value)}
              required
            />
            {slug.length >= 2 && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {checkingSlug ? (
                  <Loader2
                    size={14}
                    strokeWidth={ICON_STROKE_WIDTH}
                    className="animate-spin text-muted-foreground"
                  />
                ) : slugAvailable === true ? (
                  <CheckCircle2
                    size={14}
                    strokeWidth={ICON_STROKE_WIDTH}
                    className="text-emerald-500"
                  />
                ) : slugAvailable === false ? (
                  <XCircle
                    size={14}
                    strokeWidth={ICON_STROKE_WIDTH}
                    className="text-destructive"
                  />
                ) : null}
              </div>
            )}
          </div>
          <p className="text-caption text-muted-foreground">
            Your referral link: hypertune.gg/?am_id=
            <strong>{slug || "your-tag"}</strong>
          </p>
          {slugAvailable === false && (
            <p className="text-caption text-destructive">
              This gamer tag is already taken
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-password">Password</Label>
          <div className="relative">
            <Input
              id="invite-password"
              type={showPassword ? "text" : "password"}
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff size={14} strokeWidth={ICON_STROKE_WIDTH} />
              ) : (
                <Eye size={14} strokeWidth={ICON_STROKE_WIDTH} />
              )}
            </button>
          </div>
        </div>
        <Button
          type="submit"
          variant="chrome"
          className="w-full"
          disabled={submitting || slugAvailable === false}
        >
          {submitting ? "Creating account..." : "Sign Up"}
        </Button>
      </form>
    </div>
  );
}
