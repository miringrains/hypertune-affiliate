import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MediaClient } from "./media-client";

export default async function MediaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!affiliate) redirect("/login");

  const { data: folders } = await supabase
    .from("media_folders")
    .select(
      "*, media_assets(id, title, file_type, file_size, description, created_at)"
    )
    .order("created_at", { ascending: false });

  const foldersWithAssets = (folders ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    color: f.color,
    assets: Array.isArray(f.media_assets) ? f.media_assets : [],
  }));

  return <MediaClient folders={foldersWithAssets} />;
}
