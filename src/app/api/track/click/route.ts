import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getTrackingCookieOptions } from "@/lib/cookies";
import { createHash } from "crypto";
import { trackClickLimiter } from "@/lib/rate-limit";

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!trackClickLimiter(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = request.nextUrl;
  const amId = searchParams.get("am_id");
  const ref = searchParams.get("ref") || request.headers.get("referer") || null;
  const page = searchParams.get("page") || null;
  const rawRedirect = searchParams.get("redirect");
  const isPixel = rawRedirect === "none";
  const redirectUrl =
    isPixel ? null : rawRedirect || process.env.NEXT_PUBLIC_HYPERTUNE_URL || "https://hypertune.gg";

  if (!amId) {
    if (isPixel) return pixelResponse();
    return NextResponse.redirect(redirectUrl!);
  }

  const supabase = await createServiceClient();

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id")
    .eq("slug", amId)
    .eq("status", "active")
    .single();

  if (!affiliate) {
    if (isPixel) return pixelResponse();
    return NextResponse.redirect(redirectUrl!);
  }

  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 16);
  const userAgent = request.headers.get("user-agent") || null;

  await supabase.from("clicks").insert({
    affiliate_id: affiliate.id,
    referrer_url: ref,
    landing_page: page,
    ip_hash: ipHash,
    user_agent: userAgent,
  });

  const cookieOpts = getTrackingCookieOptions();

  if (isPixel) {
    const response = pixelResponse();
    response.cookies.set(cookieOpts.name, amId, {
      maxAge: cookieOpts.maxAge,
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
    });
    return response;
  }

  const targetUrl = new URL(redirectUrl!);
  if (!targetUrl.searchParams.has("am_id")) {
    targetUrl.searchParams.set("am_id", amId);
  }

  const response = NextResponse.redirect(targetUrl.toString());
  response.cookies.set(cookieOpts.name, amId, {
    maxAge: cookieOpts.maxAge,
    httpOnly: cookieOpts.httpOnly,
    secure: cookieOpts.secure,
    sameSite: cookieOpts.sameSite,
    path: cookieOpts.path,
  });

  return response;
}

function pixelResponse() {
  return new NextResponse(TRANSPARENT_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
