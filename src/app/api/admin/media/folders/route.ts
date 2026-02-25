import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (!affiliate || affiliate.role !== "admin") return null;
  return affiliate;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await createServiceClient();
  const { data: folders, error } = await service
    .from("media_folders")
    .select("*, media_assets(id)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const withCounts = (folders ?? []).map((f) => ({
    ...f,
    asset_count: Array.isArray(f.media_assets) ? f.media_assets.length : 0,
    media_assets: undefined,
  }));

  return NextResponse.json({ folders: withCounts });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, color } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: folder, error } = await service
    .from("media_folders")
    .insert({
      name: name.trim(),
      color: color || "#E1261B",
      created_by: admin.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ folder });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("id");

  if (!folderId) {
    return NextResponse.json({ error: "Folder ID required" }, { status: 400 });
  }

  const service = await createServiceClient();

  const { data: assets } = await service
    .from("media_assets")
    .select("file_path")
    .eq("folder_id", folderId);

  if (assets && assets.length > 0) {
    const paths = assets.map((a) => a.file_path);
    await service.storage.from("media").remove(paths);
  }

  const { error } = await service
    .from("media_folders")
    .delete()
    .eq("id", folderId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
