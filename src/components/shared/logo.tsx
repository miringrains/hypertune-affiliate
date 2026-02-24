import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  variant?: "default" | "alt";
  className?: string;
}

export function Logo({ size = 32, variant = "default", className }: LogoProps) {
  if (variant === "alt") {
    return (
      <Image
        src="/hypertunealt.svg"
        alt="Hypertune"
        width={size}
        height={size}
        className={cn("rounded-xl", className)}
        priority
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl bg-black",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/hypertune-logo.svg"
        alt="Hypertune"
        width={Math.round(size * 0.7)}
        height={Math.round(size * 0.7)}
        priority
      />
    </div>
  );
}
