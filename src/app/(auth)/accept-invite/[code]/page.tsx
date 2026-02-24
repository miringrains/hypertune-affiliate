"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
  const [step, setStep] = useState<"verify" | "setup">("verify");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

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

  async function handleSendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback?invite_code=${code}&name=${encodeURIComponent(name)}&slug=${encodeURIComponent(slug)}`,
      },
    });

    setSubmitting(false);

    if (error) {
      toast.error("Failed to send verification email", {
        description: error.message,
      });
      return;
    }

    setStep("setup");
    toast.success("Check your email!", {
      description: "Click the link to complete your registration.",
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

  if (step === "setup") {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-heading-2">Check your email</h2>
        <p className="text-body-sm text-muted-foreground">
          We sent a verification link to <strong>{email}</strong>. Click it to
          activate your affiliate account.
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
          <strong>{invite.commission_rate}%</strong> commission.
        </p>
      </div>

      <form onSubmit={handleSendMagicLink} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email address</Label>
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
          <Label htmlFor="slug">Referral ID</Label>
          <Input
            id="slug"
            placeholder="your-unique-id"
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
            }
            required
          />
          <p className="text-caption text-muted-foreground">
            Your links will look like: hypertune.gg/?am_id=
            <strong>{slug || "your-id"}</strong>
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Setting up..." : "Create affiliate account"}
        </Button>
      </form>
    </div>
  );
}
