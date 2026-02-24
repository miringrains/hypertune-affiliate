"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Lock } from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import { useRouter } from "next/navigation";

type LoginMode = "password" | "magic-link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [mode, setMode] = useState<LoginMode>("password");
  const router = useRouter();

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast.error("Login failed", { description: error.message });
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to send magic link", {
        description: error.message,
      });
      return;
    }

    setSent(true);
    toast.success("Magic link sent!", {
      description: "Check your email for the login link.",
    });
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
          <Mail size={24} strokeWidth={ICON_STROKE_WIDTH} className="text-muted-foreground" />
        </div>
        <h2 className="text-heading-2">Check your email</h2>
        <p className="text-body-sm text-muted-foreground">
          We sent a magic link to <strong>{email}</strong>. Click the link in
          the email to sign in.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSent(false)}
          className="mt-4"
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 style={{ fontSize: "2.45rem", letterSpacing: "-0.05em", fontWeight: 600, lineHeight: 1.1 }}>
          Welcome back
        </h2>
        <p className="text-[15px] text-white/50">
          Sign in to your affiliate dashboard
        </p>
      </div>

      {mode === "password" ? (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              "Signing in..."
            ) : (
              <>
                <Lock size={16} strokeWidth={ICON_STROKE_WIDTH} />
                Sign in
              </>
            )}
          </Button>
          <button
            type="button"
            onClick={() => setMode("magic-link")}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Use magic link instead
          </button>
        </form>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-ml">Email address</Label>
            <Input
              id="email-ml"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              "Sending..."
            ) : (
              <>
                <Mail size={16} strokeWidth={ICON_STROKE_WIDTH} />
                Send magic link
              </>
            )}
          </Button>
          <button
            type="button"
            onClick={() => setMode("password")}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Use password instead
          </button>
        </form>
      )}
    </div>
  );
}
