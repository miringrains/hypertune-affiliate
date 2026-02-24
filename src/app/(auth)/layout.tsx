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

      <div className="relative z-10 w-full max-w-[440px]">
        <div
          className="rounded-2xl p-10 backdrop-blur-md"
          style={{
            backgroundColor: "rgba(12, 12, 14, 0.88)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 24px 48px -12px rgba(0,0,0,0.5)",
          }}
        >
          <div className="mb-10 flex justify-center">
            <Logo size={120} variant="alt" />
          </div>
          {children}
        </div>
      </div>

      <p className="relative z-10 mt-8 text-[12px] text-white/25">
        &copy; {new Date().getFullYear()} Hypertune. All rights reserved.
      </p>
    </div>
  );
}
