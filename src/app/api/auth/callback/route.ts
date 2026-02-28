import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { authCallbackLimiter } from "@/lib/rate-limit";
import { sendWelcomeEmail, sendNewAffiliateNotification } from "@/lib/email";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!authCallbackLimiter(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const inviteCode = searchParams.get("invite_code");
  const name = searchParams.get("name");
  const slug = searchParams.get("slug");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const redirectTo = next?.startsWith("/") ? `${origin}${next}` : `${origin}/dashboard`;
  const response = NextResponse.redirect(redirectTo);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // If this is an invite acceptance, create the affiliate record
  if (inviteCode && name && slug) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { createClient } = await import("@supabase/supabase-js");
      const serviceClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      const { data: existingAffiliate } = await serviceClient
        .from("affiliates")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!existingAffiliate) {
        const { data: inviteRows } = await serviceClient
          .from("invite_links")
          .select("*")
          .eq("code", inviteCode);

        const invite =
          inviteRows?.find((i) => i.is_reusable) ??
          inviteRows?.find((i) => !i.used_by_affiliate_id) ??
          null;

        if (invite) {
          const parentId = invite.parent_affiliate_id;
          let tierLevel = 1;

          if (parentId) {
            const { data: parent } = await serviceClient
              .from("affiliates")
              .select("tier_level")
              .eq("id", parentId)
              .single();

            if (parent) {
              tierLevel = Math.min(parent.tier_level + 1, 3);
            }
          }

          const commissionRate = tierLevel === 1 ? 70 : invite.commission_rate;

          const { data: newAffiliate, error: insertError } = await serviceClient
            .from("affiliates")
            .insert({
              user_id: user.id,
              name: decodeURIComponent(name),
              email: user.email!,
              slug: decodeURIComponent(slug),
              parent_id: parentId,
              tier_level: tierLevel,
              commission_rate: commissionRate,
              status: "active",
            })
            .select("id")
            .single();

          if (insertError) {
            console.error("Failed to create affiliate:", insertError.message);
          }

          if (newAffiliate) {
            const decodedName = decodeURIComponent(name);

            // Welcome email to new affiliate (fire-and-forget)
            sendWelcomeEmail(user.email!, decodedName).catch(() => {});

            // Notify admins
            const { data: admins } = await serviceClient
              .from("affiliates")
              .select("email")
              .eq("role", "admin");
            for (const admin of admins ?? []) {
              sendNewAffiliateNotification(admin.email, decodedName, user.email!).catch(() => {});
            }

            if (!invite.is_reusable) {
              await serviceClient
                .from("invite_links")
                .update({ used_by_affiliate_id: newAffiliate.id })
                .eq("id", invite.id);
            }
          }
        }
      }
    }
  }

  return response;
}
