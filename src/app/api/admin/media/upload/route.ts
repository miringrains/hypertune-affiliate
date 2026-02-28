import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin, handleApiError } from "@/lib/auth";
import { nanoid } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const body = await request.json();
    const { folder_id, filename, content_type, file_size, title, description } = body;

    if (!folder_id || !filename) {
      return NextResponse.json(
        { error: "folder_id and filename are required" },
        { status: 400 },
      );
    }

    const ext = filename.split(".").pop() || "bin";
    const storagePath = `${folder_id}/${nanoid()}.${ext}`;

    const service = await createServiceClient();

    const { data: signed, error: signError } = await service.storage
      .from("media")
      .createSignedUploadUrl(storagePath);

    if (signError || !signed) {
      return NextResponse.json(
        { error: `Failed to create upload URL: ${signError?.message}` },
        { status: 500 },
      );
    }

    const fileType = (content_type || "").split("/")[0] || "file";

    const { data: asset, error: dbError } = await service
      .from("media_assets")
      .insert({
        title: title || filename,
        description: description || null,
        file_path: storagePath,
        file_type: fileType,
        file_size: file_size || 0,
        folder_id,
        uploaded_by: admin.userId,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      signed_url: signed.signedUrl,
      token: signed.token,
      storage_path: storagePath,
      asset,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("id");

    if (!assetId) {
      return NextResponse.json({ error: "Asset ID required" }, { status: 400 });
    }

    const service = await createServiceClient();

    const { data: asset } = await service
      .from("media_assets")
      .select("file_path")
      .eq("id", assetId)
      .single();

    if (asset) {
      await service.storage.from("media").remove([asset.file_path]);
    }

    const { error } = await service
      .from("media_assets")
      .delete()
      .eq("id", assetId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
