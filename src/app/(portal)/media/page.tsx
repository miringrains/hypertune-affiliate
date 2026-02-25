import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MediaClient } from "./media-client";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function isImageByType(fileType: string): boolean {
  return fileType === "image";
}

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
      "*, media_assets(id, title, file_type, file_size, file_path, description, created_at)"
    )
    .order("created_at", { ascending: false });

  const service = await createServiceClient();

  const foldersWithAssets = await Promise.all(
    (folders ?? []).map(async (f) => {
      const assets = Array.isArray(f.media_assets) ? f.media_assets : [];

      const assetsWithThumbs = await Promise.all(
        assets.map(async (a) => {
          let thumbnail_url: string | null = null;

          if (isImageByType(a.file_type)) {
            const { data } = await service.storage
              .from("media")
              .createSignedUrl(a.file_path, 3600, {
                transform: { width: 200, height: 200, resize: "cover" },
              });
            thumbnail_url = data?.signedUrl ?? null;
          }

          return { ...a, thumbnail_url };
        })
      );

      return {
        id: f.id,
        name: f.name,
        color: f.color,
        assets: assetsWithThumbs,
      };
    })
  );

  return <MediaClient folders={foldersWithAssets} />;
}
