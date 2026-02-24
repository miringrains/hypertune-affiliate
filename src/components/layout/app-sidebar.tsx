"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import { affiliateNav, adminNav } from "@/lib/navigation";
import type { NavGroup } from "@/lib/navigation";

function NavGroupSection({ group }: { group: NavGroup }) {
  const pathname = usePathname();

  return (
    <div>
      {group.label && (
        <p className="text-overline text-white/40 mb-2 px-3">
          {group.label}
        </p>
      )}
      <div className="flex flex-col gap-0.5">
        {group.items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              item.href !== "/admin" &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              <item.icon size={17} strokeWidth={ICON_STROKE_WIDTH} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

interface AppSidebarProps {
  isAdmin?: boolean;
}

export function AppSidebar({ isAdmin = false }: AppSidebarProps) {
  const allNavGroups = isAdmin
    ? [...affiliateNav, ...adminNav]
    : affiliateNav;

  return (
    <aside className="fixed inset-y-0 left-0 z-[var(--z-sticky)] flex w-[var(--sidebar-width)] flex-col">
      <div className="flex items-center px-5 py-5">
        <Logo size={38} variant="alt" />
      </div>

      <ScrollArea className="flex-1 px-3">
        <nav className="flex flex-col gap-5">
          {allNavGroups.map((group, i) => (
            <div key={group.label || i}>
              {i > 0 && !group.label && (
                <Separator className="mb-4 bg-white/[0.08]" />
              )}
              <NavGroupSection group={group} />
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="px-3 pb-5">
        <Separator className="mb-4 bg-white/[0.08]" />
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-white/50 hover:bg-white/[0.06] hover:text-white/70 transition-colors"
          >
            <LogOut size={17} strokeWidth={ICON_STROKE_WIDTH} />
            <span>Log out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
