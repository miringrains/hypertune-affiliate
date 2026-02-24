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
          className="rounded-2xl p-10 backdrop-blur-xl"
          style={{
            backgroundColor: "rgba(10, 10, 12, 0.92)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 0 80px 20px rgba(200,30,15,0.06), 0 24px 48px -12px rgba(0,0,0,0.6)",
          }}
        >
          <div className="mb-10 flex justify-center">
            <Logo size={120} variant="alt" />
          </div>
          {children}
        </div>
      </div>

      <p className="relative z-10 mt-8 text-[12px]" style={{ color: "#444" }}>
        &copy; {new Date().getFullYear()} Hypertune. All rights reserved.
      </p>
    </div>
  );
}
