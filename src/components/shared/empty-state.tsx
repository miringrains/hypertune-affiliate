"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="mb-4 rounded-xl bg-muted p-4">
        <Icon
          size={32}
          strokeWidth={ICON_STROKE_WIDTH}
          className="text-muted-foreground"
        />
      </div>
      <h3 className="text-heading-3 mb-1">{title}</h3>
      <p className="text-body-sm text-muted-foreground max-w-sm">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-6" size="lg">
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
