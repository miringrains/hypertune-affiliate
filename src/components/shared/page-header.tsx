"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 className="text-heading-1">{title}</h1>
        {description && (
          <p className="mt-1 text-body-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="mt-4 flex items-center gap-3 sm:mt-0">{children}</div>
      )}
    </motion.div>
  );
}
