import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getUser, getAffiliate } from "@/lib/session";
import { AdminMediaClient } from "./admin-media-client";

function isImageByType(fileType: string): boolean {
  return fileType === "image";
}

export default async function AdminMediaPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const affiliate = await getAffiliate();
  if (!affiliate || affiliate.role !== "admin") redirect("/dashboard");

  const service = await createServiceClient();

  const { data: folders } = await service
    .from("media_folders")
    .select(
      "*, media_assets(id, title, file_type, file_size, file_path, description, created_at)"
    )
    .order("created_at", { ascending: false });

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
        created_at: f.created_at,
        assets: assetsWithThumbs,
      };
    })
  );

  return <AdminMediaClient initialFolders={foldersWithAssets} />;
}
