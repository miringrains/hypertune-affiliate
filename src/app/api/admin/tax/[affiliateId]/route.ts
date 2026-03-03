import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError, ApiError } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ affiliateId: string }> },
) {
  try {
    await requireAdmin();
    const { affiliateId } = await params;

    if (!affiliateId) throw new ApiError(400, "Affiliate ID is required");

    const service = await createServiceClient();

    const { data: doc } = await service
      .from("tax_documents")
      .select("id, document_type, file_path, uploaded_at")
      .eq("affiliate_id", affiliateId)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!doc) {
      return NextResponse.json({ onFile: false });
    }

    const { data: signedUrl } = await service.storage
      .from("tax-docs")
      .createSignedUrl(doc.file_path, 60);

    return NextResponse.json({
      onFile: true,
      documentType: doc.document_type,
      uploadedAt: doc.uploaded_at,
      downloadUrl: signedUrl?.signedUrl ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
