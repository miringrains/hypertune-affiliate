import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { AdminMediaClient } from "./admin-media-client";

export default async function AdminMediaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (!affiliate || affiliate.role !== "admin") redirect("/dashboard");

  const service = await createServiceClient();

  const { data: folders } = await service
    .from("media_folders")
    .select("*, media_assets(id, title, file_type, file_size, file_path, description, created_at)")
    .order("created_at", { ascending: false });

  const foldersWithAssets = (folders ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    color: f.color,
    created_at: f.created_at,
    assets: Array.isArray(f.media_assets) ? f.media_assets : [],
  }));

  return <AdminMediaClient initialFolders={foldersWithAssets} />;
}
