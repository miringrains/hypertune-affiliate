import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Request-scoped cached auth helpers.
 * React cache() deduplicates within a single RSC render, so the layout
 * and the child page share one getUser() + one getAffiliate() call
 * instead of each running their own.
 */

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getAffiliate = cache(async () => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("affiliates")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return data;
});
