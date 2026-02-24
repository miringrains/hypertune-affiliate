import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className }: LogoProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-black border border-white/[0.08]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        style={{ width: size * 0.6, height: size * 0.6 }}
      >
        <path
          d="M30 20h15v35h30V20h15v80H75V70H45v30H30V20Z"
          fill="white"
        />
      </svg>
    </div>
  );
}

interface LogoWithTextProps {
  size?: number;
  className?: string;
}

export function LogoWithText({ size = 32, className }: LogoWithTextProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size={size} />
      <span
        className="font-semibold text-white tracking-tight"
        style={{ fontSize: size * 0.47 }}
      >
        Hypertune
      </span>
    </div>
  );
}
