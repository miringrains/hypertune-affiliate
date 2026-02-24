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
        <div
          className="rounded-2xl border p-8 shadow-2xl backdrop-blur-sm"
          style={{
            backgroundColor: "rgba(17, 17, 19, 0.9)",
            borderColor: "rgba(255, 255, 255, 0.06)",
          }}
        >
          <div className="mb-8 flex justify-center">
            <Logo size={40} />
          </div>
          {children}
        </div>
      </div>

      <p className="relative z-10 mt-8 text-[12px] text-white/30">
        &copy; {new Date().getFullYear()} Hypertune. All rights reserved.
      </p>
    </div>
  );
}
