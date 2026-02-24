"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
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
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-heading-2">Welcome back</h2>
        <p className="text-body-sm text-muted-foreground">
          Sign in to your affiliate dashboard
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
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
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending..." : "Send magic link"}
        </Button>
      </form>
    </div>
  );
}
