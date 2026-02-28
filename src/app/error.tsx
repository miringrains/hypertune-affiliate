"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Uncaught error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <h1 className="text-[2rem] font-semibold tracking-tight text-white">
        Something went wrong
      </h1>
      <p className="text-[14px] text-zinc-400 mt-2 max-w-md">
        An unexpected error occurred. If this keeps happening, contact support.
      </p>
      <Button onClick={reset} className="mt-6" variant="outline">
        Try again
      </Button>
    </div>
  );
}
