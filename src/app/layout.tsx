import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import "@/lib/env";
import "./globals.css";

const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hypertune Affiliates",
  description: "Hypertune affiliate tracking and management platform",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://affiliates.hypertune.gg"),
  openGraph: {
    title: "Hypertune Affiliates",
    description: "Hypertune affiliate tracking and management platform",
    siteName: "Hypertune Affiliates",
    type: "website",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${sans.variable} ${mono.variable} font-sans antialiased`}
      >
        <QueryProvider>
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster position="bottom-right" richColors closeButton />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
