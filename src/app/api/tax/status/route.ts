import { NextResponse } from "next/server";
import { requireAffiliate, handleApiError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const affiliate = await requireAffiliate();
    const supabase = await createClient();

    const { data } = await supabase
      .from("tax_documents")
      .select("id, document_type, uploaded_at")
      .eq("affiliate_id", affiliate.id)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ onFile: false });
    }

    return NextResponse.json({
      onFile: true,
      documentType: data.document_type,
      uploadedAt: data.uploaded_at,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
