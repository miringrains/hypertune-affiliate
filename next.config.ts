import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const hypertuneUrl = process.env.NEXT_PUBLIC_HYPERTUNE_URL || "https://hypertune.gg";

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/api/track/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: hypertuneUrl },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },
};

export default nextConfig;
