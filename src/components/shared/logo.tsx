import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className }: LogoProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-black",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/hypertune-logo.svg"
        alt="Hypertune"
        width={Math.round(size * 0.55)}
        height={Math.round(size * 0.55)}
        priority
      />
    </div>
  );
}

export function LogoWithText({ size = 32, className }: LogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <Logo size={size} />
    </div>
  );
}
