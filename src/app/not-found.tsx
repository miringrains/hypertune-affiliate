import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <p className="text-[13px] font-medium text-zinc-400 uppercase tracking-wider">
        404
      </p>
      <h1 className="text-[2rem] font-semibold tracking-tight text-white mt-2">
        Page not found
      </h1>
      <p className="text-[14px] text-zinc-400 mt-2">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 text-[13px] font-medium text-zinc-300 hover:text-white transition-colors underline underline-offset-4"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
