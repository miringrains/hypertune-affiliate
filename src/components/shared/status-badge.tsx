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
    "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15",
  warning:
    "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/15",
  destructive:
    "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/15",
  default:
    "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/15",
  muted:
    "bg-muted text-muted-foreground border-border hover:bg-muted/80",
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
