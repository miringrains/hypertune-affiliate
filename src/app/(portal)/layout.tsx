import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { AuroraBackdrop } from "@/components/shared/aurora";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";

async function tryRecoverAffiliate(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, string>;
}) {
  const meta = user.user_metadata ?? {};
  const inviteCode = meta.invite_code;
  const displayName = meta.display_name;
  const affiliateSlug = meta.affiliate_slug;

  if (!inviteCode || !displayName || !affiliateSlug) return null;

  const service = await createServiceClient();

  const { data: existing } = await service
    .from("affiliates")
    .select("name, email, role, tier_level")
    .eq("user_id", user.id)
    .single();

  if (existing) return existing;

  const { data: inviteRows } = await service
    .from("invite_links")
    .select("*")
    .eq("code", inviteCode);

  const invite =
    inviteRows?.find((i: any) => i.is_reusable) ??
    inviteRows?.find((i: any) => !i.used_by_affiliate_id) ??
    null;

  if (!invite) return null;

  const parentId = invite.parent_affiliate_id;
  let tierLevel = 1;

  if (parentId) {
    const { data: parent } = await service
      .from("affiliates")
      .select("tier_level")
      .eq("id", parentId)
      .single();
    if (parent) tierLevel = Math.min(parent.tier_level + 1, 3);
  }

  const commissionRate = tierLevel === 1 ? 70 : invite.commission_rate;

  const { data: created, error } = await service
    .from("affiliates")
    .insert({
      user_id: user.id,
      name: displayName,
      email: user.email!,
      slug: affiliateSlug,
      parent_id: parentId,
      tier_level: tierLevel,
      commission_rate: commissionRate,
      status: "active",
    })
    .select("name, email, role, tier_level")
    .single();

  if (error) {
    console.error("[layout recovery] Failed to create affiliate:", error.message);
    return null;
  }

  if (created && !invite.is_reusable) {
    await service
      .from("invite_links")
      .update({ used_by_affiliate_id: user.id })
      .eq("id", invite.id);
  }

  return created;
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let { data: affiliate } = await supabase
    .from("affiliates")
    .select("name, email, role, tier_level")
    .eq("user_id", user.id)
    .single();

  if (!affiliate) {
    affiliate = await tryRecoverAffiliate(user);
  }

  if (!affiliate) {
    redirect("/login?error=no_account");
  }

  const isAdmin = affiliate.role === "admin";
  const tierLevel = affiliate.tier_level ?? 2;

  return (
    <div className="h-screen overflow-hidden" style={{ backgroundColor: "#0a0a0a" }}>
      <AuroraBackdrop subtle />

      <div className="hidden lg:block">
        <AppSidebar isAdmin={isAdmin} tierLevel={tierLevel} />
      </div>

      <div className="relative z-[1] flex flex-col lg:pl-[var(--sidebar-width)] h-screen p-2 lg:p-3">
        <div
          className="light-panel flex-1 min-h-0 overflow-hidden"
          style={{
            borderRadius: "16px",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.12), 0 16px 48px -8px rgba(0,0,0,0.4)",
          }}
        >
          <div className="h-full overflow-y-auto overflow-x-hidden light-scroll">
            <TopBar
              isAdmin={isAdmin}
              tierLevel={tierLevel}
              userName={affiliate?.name}
              userEmail={affiliate?.email}
            />
            <main className="mx-auto max-w-[var(--content-max-width)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
