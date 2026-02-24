"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, ChevronRight } from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .filter((s) => !UUID_REGEX.test(s));

  return (
    <nav className="flex items-center gap-1 text-body-sm text-muted-foreground">
      <Link
        href="/dashboard"
        className="hover:text-foreground transition-colors"
      >
        <Home size={16} strokeWidth={ICON_STROKE_WIDTH} />
      </Link>

      {segments.map((segment, i) => {
        const href = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        const label = segment
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        return (
          <span
            key={href}
            className={`flex items-center gap-1 ${i > 0 && !isLast ? "hidden sm:flex" : ""}`}
          >
            <ChevronRight size={12} strokeWidth={ICON_STROKE_WIDTH} />
            {isLast ? (
              <span className="max-w-[160px] sm:max-w-[200px] truncate text-foreground">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
