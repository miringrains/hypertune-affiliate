import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/accept-invite",
  "/reset-password",
  "/mfa-verify",
  "/api/auth",
  "/api/track",
  "/api/webhooks",
  "/api/affiliates/check-slug",
];

const PORTAL_HOSTS = new Set([
  "affiliate.hypertune.gg",
  "localhost",
  "127.0.0.1",
]);
const PORTAL_URL = "https://affiliate.hypertune.gg";

function isPortalHost(host: string | null | undefined): boolean {
  if (!host) return true;
  const hostname = host.split(":")[0];
  return PORTAL_HOSTS.has(hostname) || hostname.endsWith(".vercel.app");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");

  if (!isPortalHost(host)) {
    if (pathname.startsWith("/api/track") || pathname.startsWith("/_next")) {
      return NextResponse.next();
    }
    const slug = pathname.slice(1);
    if (slug && !slug.includes("/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/api/track/click";
      url.searchParams.set("am_id", slug);
      return NextResponse.rewrite(url);
    }
    return NextResponse.redirect("https://hypertune.gg");
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic || pathname === "/") {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !pathname.startsWith("/login") && !pathname.startsWith("/accept-invite")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (
      aal?.nextLevel === "aal2" &&
      aal.currentLevel !== aal.nextLevel &&
      !pathname.startsWith("/mfa-verify") &&
      !pathname.startsWith("/api/")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/mfa-verify";
      return NextResponse.redirect(url);
    }
  }

  if (user && pathname.startsWith("/admin")) {
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!affiliate || affiliate.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|hypertune-logo.svg|tracking-snippet.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
