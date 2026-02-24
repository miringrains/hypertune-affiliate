import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  height?: number;
  dark?: boolean;
  className?: string;
}

export function Logo({ height = 30, dark = false, className }: LogoProps) {
  return (
    <Image
      src="/hypertune-logo.svg"
      alt="Hypertune"
      width={Math.round(height * 4)}
      height={height}
      className={cn(dark ? "brightness-0 invert" : "", className)}
      priority
    />
  );
}
