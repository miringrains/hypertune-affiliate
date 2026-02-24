import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  iconRatio?: number;
  className?: string;
}

export function Logo({ size = 32, iconRatio = 0.7, className }: LogoProps) {
  const iconSize = Math.round(size * iconRatio);

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
        width={iconSize}
        height={iconSize}
        priority
      />
    </div>
  );
}
