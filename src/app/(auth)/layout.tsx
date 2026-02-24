import { AuroraBackdrop } from "@/components/shared/aurora";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
      <AuroraBackdrop />

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="light-panel rounded-2xl bg-background p-8 shadow-lg">
          <div className="mb-8 flex justify-center">
            <Logo height={34} dark />
          </div>
          {children}
        </div>
      </div>

      <p className="relative z-10 mt-8 text-caption text-white/40">
        &copy; {new Date().getFullYear()} Hypertune. All rights reserved.
      </p>
    </div>
  );
}
