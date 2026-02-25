import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getTrackingCookieOptions } from "@/lib/cookies";
import { createHash } from "crypto";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const amId = searchParams.get("am_id");
  const ref = searchParams.get("ref") || request.headers.get("referer") || null;
  const page = searchParams.get("page") || null;
  const redirectUrl =
    searchParams.get("redirect") ||
    process.env.NEXT_PUBLIC_HYPERTUNE_URL ||
    "https://hypertune.gg";

  if (!amId) {
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createServiceClient();

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id")
    .eq("slug", amId)
    .eq("status", "active")
    .single();

  if (!affiliate) {
    return NextResponse.redirect(redirectUrl);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 16);
  const userAgent = request.headers.get("user-agent") || null;

  await supabase.from("clicks").insert({
    affiliate_id: affiliate.id,
    referrer_url: ref,
    landing_page: page,
    ip_hash: ipHash,
    user_agent: userAgent,
  });

  const targetUrl = new URL(redirectUrl);
  if (!targetUrl.searchParams.has("am_id")) {
    targetUrl.searchParams.set("am_id", amId);
  }

  const response = NextResponse.redirect(targetUrl.toString());
  const cookieOpts = getTrackingCookieOptions();
  response.cookies.set(cookieOpts.name, amId, {
    maxAge: cookieOpts.maxAge,
    httpOnly: cookieOpts.httpOnly,
    secure: cookieOpts.secure,
    sameSite: cookieOpts.sameSite,
    path: cookieOpts.path,
  });

  return response;
}
