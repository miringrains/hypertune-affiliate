import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const inviteCode = searchParams.get("invite_code");
  const name = searchParams.get("name");
  const slug = searchParams.get("slug");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const response = NextResponse.redirect(`${origin}/dashboard`);

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

      // Find invite by code — reusable links won't have used_by_affiliate_id = null
      const { data: inviteRows } = await serviceClient
        .from("invite_links")
        .select("*")
        .eq("code", inviteCode);

      // Pick the reusable link or the unused one-time link
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

        const { data: newAffiliate } = await serviceClient
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

        // Only mark one-time links as used; reusable links stay active
        if (newAffiliate && !invite.is_reusable) {
          await serviceClient
            .from("invite_links")
            .update({ used_by_affiliate_id: newAffiliate.id })
            .eq("id", invite.id);
        }
      }
    }
  }

  return response;
}
