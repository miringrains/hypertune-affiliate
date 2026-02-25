import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("id");

  if (!assetId) {
    return NextResponse.json({ error: "Asset ID required" }, { status: 400 });
  }

  const service = await createServiceClient();

  const { data: asset } = await service
    .from("media_assets")
    .select("file_path, title, file_type")
    .eq("id", assetId)
    .single();

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const { data: signedUrl, error } = await service.storage
    .from("media")
    .createSignedUrl(asset.file_path, 3600);

  if (error || !signedUrl) {
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: signedUrl.signedUrl,
    title: asset.title,
    file_type: asset.file_type,
  });
}
