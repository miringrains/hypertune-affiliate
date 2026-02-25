"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, LogOut } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import { ICON_STROKE_WIDTH } from "@/lib/constants";
import { affiliateNav, adminNav } from "@/lib/navigation";
import type { NavGroup } from "@/lib/navigation";

function MobileNavGroup({ group }: { group: NavGroup }) {
  const pathname = usePathname();

  return (
    <div>
      <p className="text-overline text-white/40 mb-2 px-2">{group.label}</p>
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
                "flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-body-sm transition-colors",
                isActive
                  ? "bg-white/[0.08] text-white"
                  : "text-white/60 hover:bg-white/[0.04] hover:text-white",
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

interface MobileNavProps {
  isAdmin?: boolean;
  tierLevel?: number;
}

export function MobileNav({ isAdmin = false, tierLevel = 1 }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const filteredAffiliateNav = affiliateNav.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.href === "/sub-affiliates" && tierLevel !== 1) return false;
      return true;
    }),
  }));

  const allNavGroups = isAdmin
    ? [...filteredAffiliateNav, ...adminNav]
    : filteredAffiliateNav;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 -ml-1">
          <Menu size={20} strokeWidth={ICON_STROKE_WIDTH} />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[280px] p-0 border-r-0 bg-[oklch(0.09_0_0)] flex flex-col"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="px-5 pt-6 pb-2 space-y-3">
          <Logo size={38} variant="alt" />
        </div>

        <div className="mx-5 border-t border-white/[0.06]" />

        <ScrollArea className="flex-1 py-3 px-3">
          <nav className="flex flex-col gap-5">
            {allNavGroups.map((group) => (
              <MobileNavGroup key={group.label} group={group} />
            ))}
          </nav>
        </ScrollArea>

        <div className="border-t border-white/[0.06] p-3">
          <form action="/api/auth/signout" method="POST">
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start gap-2.5 text-white/40 hover:text-white hover:bg-white/[0.04]"
            >
              <LogOut size={18} strokeWidth={ICON_STROKE_WIDTH} />
              <span className="text-body-sm">Log out</span>
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
