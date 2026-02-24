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
    .select("name, email, role")
    .eq("user_id", user.id)
    .single();

  const isAdmin = affiliate?.role === "admin";

  return (
    <div className="h-screen bg-background overflow-hidden">
      <AuroraBackdrop subtle />

      <div className="hidden lg:block">
        <AppSidebar isAdmin={isAdmin} />
      </div>

      <div className="relative z-[1] flex flex-col lg:pl-[var(--sidebar-width)] h-screen p-2 lg:p-3">
        <div className="light-panel flex-1 min-h-0 rounded-2xl bg-background shadow-xl overflow-hidden">
          <div className="h-full overflow-y-auto overflow-x-hidden light-scroll">
            <TopBar
              isAdmin={isAdmin}
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
