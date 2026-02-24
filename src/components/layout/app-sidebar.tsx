"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import { affiliateNav, adminNav } from "@/lib/navigation";
import type { NavGroup } from "@/lib/navigation";

function NavGroupSection({ group }: { group: NavGroup }) {
  const pathname = usePathname();

  return (
    <div>
      <p className="text-overline text-muted-foreground mb-2 px-2">
        {group.label}
      </p>
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
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-body-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
              )}
            >
              <item.icon size={18} strokeWidth={ICON_STROKE_WIDTH} />
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
    <aside className="fixed inset-y-0 left-0 z-[var(--z-sticky)] flex w-[var(--sidebar-width)] flex-col pt-5 lg:pt-6">
      <div className="flex items-center px-5 pb-6">
        <Logo height={30} />
      </div>

      <ScrollArea className="flex-1 px-3">
        <nav className="flex flex-col gap-6">
          {allNavGroups.map((group) => (
            <NavGroupSection key={group.label} group={group} />
          ))}
        </nav>
      </ScrollArea>

      <div className="p-3 pb-5">
        <form action="/api/auth/signout" method="POST">
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground"
          >
            <LogOut size={18} strokeWidth={ICON_STROKE_WIDTH} />
            <span className="text-body-sm">Log out</span>
          </Button>
        </form>
      </div>
    </aside>
  );
}
