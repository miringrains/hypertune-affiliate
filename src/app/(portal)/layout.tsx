import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuroraBackdrop } from "@/components/shared/aurora";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";

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

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("name, email, role, tier_level")
    .eq("user_id", user.id)
    .single();

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
          className="flex-1 min-h-0 overflow-hidden"
          style={{
            borderRadius: "16px",
            backgroundColor: "#0e0e0e",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 16px 48px -8px rgba(0,0,0,0.4)",
          }}
        >
          <div className="h-full overflow-y-auto overflow-x-hidden">
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
