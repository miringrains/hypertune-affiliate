"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LogoWithText } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import { affiliateNav, adminNav } from "@/lib/navigation";
import type { NavGroup } from "@/lib/navigation";

function NavGroupSection({ group }: { group: NavGroup }) {
  const pathname = usePathname();

  return (
    <div>
      {group.label && (
        <p className="text-overline text-[rgba(255,255,255,0.3)] mb-1.5 px-2">
          {group.label}
        </p>
      )}
      <div className="flex flex-col gap-px">
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
                "flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors",
                isActive
                  ? "bg-white/[0.08] text-white"
                  : "text-[rgba(255,255,255,0.5)] hover:bg-white/[0.04] hover:text-[rgba(255,255,255,0.75)]",
              )}
            >
              <item.icon size={16} strokeWidth={ICON_STROKE_WIDTH} />
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
      <div className="flex items-center px-4 py-5">
        <LogoWithText size={30} />
      </div>

      <ScrollArea className="flex-1 px-2.5">
        <nav className="flex flex-col gap-4">
          {allNavGroups.map((group, i) => (
            <div key={group.label || i}>
              {i > 0 && !group.label && (
                <Separator className="mb-3 bg-white/[0.06]" />
              )}
              <NavGroupSection group={group} />
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="px-2.5 pb-4">
        <Separator className="mb-3 bg-white/[0.06]" />
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] text-[rgba(255,255,255,0.4)] hover:bg-white/[0.04] hover:text-[rgba(255,255,255,0.6)] transition-colors"
          >
            <LogOut size={16} strokeWidth={ICON_STROKE_WIDTH} />
            <span>Log out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
