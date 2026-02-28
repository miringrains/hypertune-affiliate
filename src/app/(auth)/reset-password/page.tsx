"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error("Failed to reset password", { description: error.message });
      return;
    }

    toast.success("Password updated successfully");
    router.push("/dashboard");
    router.refresh();
  }

  if (!ready) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-heading-2">Verifying reset link&hellip;</h2>
        <p className="text-body-sm text-muted-foreground">
          If nothing happens, the link may have expired.{" "}
          <a href="/login" className="underline underline-offset-4 hover:text-foreground transition-colors">
            Back to login
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2
          style={{
            fontSize: "2.45rem",
            letterSpacing: "-0.05em",
            fontWeight: 600,
            lineHeight: 1.1,
          }}
        >
          Set new password
        </h2>
        <p className="text-[15px]" style={{ color: "#666" }}>
          Enter a new password for your account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Confirm your new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <Button type="submit" variant="chrome" className="w-full" disabled={loading}>
          {loading ? (
            "Updating..."
          ) : (
            <>
              <Lock size={16} strokeWidth={ICON_STROKE_WIDTH} />
              Update password
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
