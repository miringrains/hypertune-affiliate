import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusVariant = "success" | "warning" | "destructive" | "default" | "muted";

const statusMap: Record<string, StatusVariant> = {
  active: "success",
  active_monthly: "success",
  active_annual: "success",
  trialing: "warning",
  invited: "warning",
  pending: "warning",
  processing: "warning",
  signed_up: "default",
  dormant: "muted",
  canceled: "destructive",
  inactive: "destructive",
  voided: "destructive",
  paid: "success",
  approved: "success",
  completed: "success",
};

const variantStyles: Record<StatusVariant, string> = {
  success:
    "bg-transparent text-emerald-400 border-zinc-800 hover:border-zinc-700",
  warning:
    "bg-transparent text-amber-400 border-zinc-800 hover:border-zinc-700",
  destructive:
    "bg-transparent text-rose-500 border-zinc-800 hover:border-zinc-700",
  default:
    "bg-transparent text-zinc-300 border-zinc-800 hover:border-zinc-700",
  muted:
    "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-700",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = statusMap[status] ?? "muted";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Badge
      variant="outline"
      className={cn("text-caption font-medium", variantStyles[variant], className)}
    >
      {label}
    </Badge>
  );
}
