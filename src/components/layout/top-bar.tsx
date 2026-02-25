"use client";

import { Breadcrumbs } from "./breadcrumbs";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

interface TopBarProps {
  isAdmin?: boolean;
  tierLevel?: number;
  userName?: string;
  userEmail?: string;
}

export function TopBar({
  isAdmin = false,
  tierLevel = 1,
  userName,
  userEmail,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] flex h-[var(--topbar-height)] items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="flex items-center gap-2">
        <div className="lg:hidden">
          <MobileNav isAdmin={isAdmin} tierLevel={tierLevel} />
        </div>
        <Breadcrumbs />
      </div>
      <UserMenu name={userName} email={userEmail} />
    </header>
  );
}
