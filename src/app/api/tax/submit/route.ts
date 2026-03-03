import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { readFile } from "fs/promises";
import { join } from "path";
import { requireAffiliate, handleApiError, ApiError } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

const TAX_CLASSIFICATION_MAP: Record<string, number> = {
  individual: 0,
  c_corp: 1,
  s_corp: 2,
  partnership: 3,
  trust_estate: 4,
  llc: 5,
  other: 6,
};

const TAX_CLASSIFICATIONS_LABEL: Record<string, string> = {
  individual: "Individual / Sole proprietor",
  c_corp: "C Corporation",
  s_corp: "S Corporation",
  partnership: "Partnership",
  trust_estate: "Trust / Estate",
  llc: "LLC",
  other: "Other",
};

interface W9Data {
  name: string;
  businessName?: string;
  taxClassification: string;
  llcClassification?: string;
  otherDescription?: string;
  exemptPayeeCode?: string;
  fatcaCode?: string;
  address: string;
  cityStateZip: string;
  accountNumbers?: string;
  tinType: "ssn" | "ein";
  tin: string;
  signatureName: string;
  signatureDate: string;
}

interface W8BENData {
  name: string;
  countryOfCitizenship: string;
  permanentAddress: string;
  permanentCityStateProvince: string;
  permanentCountry: string;
  mailingAddress?: string;
  mailingCityStateProvince?: string;
  mailingCountry?: string;
  usTin?: string;
  foreignTin?: string;
  dateOfBirth: string;
  treatyCountry?: string;
  treatyArticle?: string;
  treatyRate?: string;
  treatyIncomeType?: string;
  treatyExplanation?: string;
  signatureName: string;
  signatureDate: string;
}

function validateW9(body: Record<string, unknown>): W9Data {
  const { name, taxClassification, address, cityStateZip, tinType, tin, signatureName, signatureDate } = body;
  if (!name || typeof name !== "string") throw new ApiError(400, "Name is required");
  if (!taxClassification || typeof taxClassification !== "string") throw new ApiError(400, "Tax classification is required");
  if (!(taxClassification in TAX_CLASSIFICATION_MAP)) throw new ApiError(400, "Invalid tax classification");
  if (!address || typeof address !== "string") throw new ApiError(400, "Address is required");
  if (!cityStateZip || typeof cityStateZip !== "string") throw new ApiError(400, "City/State/ZIP is required");
  if (tinType !== "ssn" && tinType !== "ein") throw new ApiError(400, "TIN type must be ssn or ein");
  if (!tin || typeof tin !== "string") throw new ApiError(400, "Taxpayer ID is required");
  const digits = tin.replace(/\D/g, "");
  if (tinType === "ssn" && digits.length !== 9) throw new ApiError(400, "SSN must be 9 digits");
  if (tinType === "ein" && digits.length !== 9) throw new ApiError(400, "EIN must be 9 digits");
  if (!signatureName || typeof signatureName !== "string") throw new ApiError(400, "Signature name is required");
  if (!signatureDate || typeof signatureDate !== "string") throw new ApiError(400, "Signature date is required");

  return body as unknown as W9Data;
}

function validateW8BEN(body: Record<string, unknown>): W8BENData {
  const { name, countryOfCitizenship, permanentAddress, permanentCityStateProvince, permanentCountry, dateOfBirth, signatureName, signatureDate } = body;
  if (!name || typeof name !== "string") throw new ApiError(400, "Name is required");
  if (!countryOfCitizenship || typeof countryOfCitizenship !== "string") throw new ApiError(400, "Country of citizenship is required");
  if (!permanentAddress || typeof permanentAddress !== "string") throw new ApiError(400, "Permanent address is required");
  if (!permanentCityStateProvince || typeof permanentCityStateProvince !== "string") throw new ApiError(400, "City/State/Province is required");
  if (!permanentCountry || typeof permanentCountry !== "string") throw new ApiError(400, "Country is required");
  if (!dateOfBirth || typeof dateOfBirth !== "string") throw new ApiError(400, "Date of birth is required");
  const dobDate = new Date(dateOfBirth as string);
  if (isNaN(dobDate.getTime())) throw new ApiError(400, "Invalid date of birth");
  const year = dobDate.getFullYear();
  if (year < 1900 || year > new Date().getFullYear()) throw new ApiError(400, "Date of birth year must be between 1900 and now");
  if (!signatureName || typeof signatureName !== "string") throw new ApiError(400, "Signature name is required");
  if (!signatureDate || typeof signatureDate !== "string") throw new ApiError(400, "Signature date is required");

  return body as unknown as W8BENData;
}

async function fillW9(data: W9Data): Promise<Uint8Array> {
  const templatePath = join(process.cwd(), "public", "forms", "fw9.pdf");
  let templateBytes: Buffer;
  try {
    templateBytes = await readFile(templatePath);
  } catch (fsErr) {
    console.error("W-9 template read error:", fsErr);
    return generateW9Fallback(data);
  }

  try {
    const pdf = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
    const form = pdf.getForm();

    const setField = (name: string, value: string) => {
      try {
        form.getTextField(name).setText(value);
      } catch { /* field may not exist */ }
    };

    setField("topmostSubform[0].Page1[0].f1_01[0]", data.name);
    setField("topmostSubform[0].Page1[0].f1_02[0]", data.businessName ?? "");

    const cbIdx = TAX_CLASSIFICATION_MAP[data.taxClassification];
    if (cbIdx !== undefined) {
      try {
        form.getCheckBox(`topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[${cbIdx}]`).check();
      } catch { /* checkbox may not exist */ }
    }

    if (data.taxClassification === "llc" && data.llcClassification) {
      setField("topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].f1_03[0]", data.llcClassification);
    }
    if (data.taxClassification === "other" && data.otherDescription) {
      setField("topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].f1_04[0]", data.otherDescription);
    }

    setField("topmostSubform[0].Page1[0].f1_05[0]", data.exemptPayeeCode ?? "");
    setField("topmostSubform[0].Page1[0].f1_06[0]", data.fatcaCode ?? "");
    setField("topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_07[0]", data.address);
    setField("topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_08[0]", data.cityStateZip);

    const digits = data.tin.replace(/\D/g, "");
    if (data.tinType === "ssn") {
      setField("topmostSubform[0].Page1[0].f1_11[0]", digits.slice(0, 3));
      setField("topmostSubform[0].Page1[0].f1_12[0]", digits.slice(3, 5));
      setField("topmostSubform[0].Page1[0].f1_13[0]", digits.slice(5, 9));
    } else {
      setField("topmostSubform[0].Page1[0].f1_14[0]", digits.slice(0, 2));
      setField("topmostSubform[0].Page1[0].f1_15[0]", digits.slice(2, 9));
    }

    form.flatten();
    return pdf.save();
  } catch (pdfErr) {
    console.error("W-9 PDF fill error, using fallback:", pdfErr);
    return generateW9Fallback(data);
  }
}

async function generateW9Fallback(data: W9Data): Promise<Uint8Array> {
  const { StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);

  let y = 740;
  const lx = 50;

  function heading(text: string) {
    page.drawText(text, { x: lx, y, font: bold, size: 14, color: black });
    y -= 28;
  }
  function row(label: string, value: string) {
    page.drawText(label, { x: lx, y, font, size: 9, color: gray });
    page.drawText(value, { x: lx + 180, y, font, size: 10, color: black });
    y -= 18;
  }

  const classLabel = TAX_CLASSIFICATIONS_LABEL[data.taxClassification] ?? data.taxClassification;
  const maskedTin = data.tin.replace(/\d(?=.{4})/g, "*");

  heading("Form W-9 — Request for Taxpayer Identification Number");
  y -= 4;
  row("Name:", data.name);
  if (data.businessName) row("Business Name:", data.businessName);
  row("Tax Classification:", classLabel);
  if (data.taxClassification === "llc" && data.llcClassification)
    row("LLC Classification:", data.llcClassification);
  row("Address:", data.address);
  row("City / State / ZIP:", data.cityStateZip);
  row("TIN Type:", data.tinType.toUpperCase());
  row("TIN:", maskedTin);
  y -= 10;
  heading("Certification");
  row("Signature:", data.signatureName);
  row("Date:", data.signatureDate);

  return pdf.save();
}

async function fillW8BEN(data: W8BENData): Promise<Uint8Array> {
  const templatePath = join(process.cwd(), "public", "forms", "fw8ben.pdf");
  let templateBytes: Buffer;
  try {
    templateBytes = await readFile(templatePath);
  } catch (fsErr) {
    console.error("W-8BEN template read error:", fsErr);
    return generateW8BENFallback(data);
  }

  try {
    const pdf = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
    const form = pdf.getForm();

    const setField = (name: string, value: string) => {
      try {
        form.getTextField(name).setText(value);
      } catch { /* field may not exist */ }
    };

    setField("topmostSubform[0].Page1[0].f_1[0]", data.name);
    setField("topmostSubform[0].Page1[0].f_2[0]", data.countryOfCitizenship);
    setField("topmostSubform[0].Page1[0].f_3[0]", data.permanentAddress);
    setField("topmostSubform[0].Page1[0].f_4[0]", data.permanentCityStateProvince);
    setField("topmostSubform[0].Page1[0].f_5[0]", data.permanentCountry);
    setField("topmostSubform[0].Page1[0].f_6[0]", data.mailingAddress ?? "");
    setField("topmostSubform[0].Page1[0].f_7[0]", data.mailingCityStateProvince ?? "");
    setField("topmostSubform[0].Page1[0].f_8[0]", data.mailingCountry ?? "");
    setField("topmostSubform[0].Page1[0].f_9[0]", data.usTin ?? "");
    setField("topmostSubform[0].Page1[0].f_10[0]", data.foreignTin ?? "");
    setField("topmostSubform[0].Page1[0].f_12[0]", data.dateOfBirth);

    if (data.treatyCountry) {
      setField("topmostSubform[0].Page1[0].f_13[0]", data.treatyCountry);
      setField("topmostSubform[0].Page1[0].f_14[0]", data.treatyArticle ?? "");
      setField("topmostSubform[0].Page1[0].f_15[0]", data.treatyRate ?? "");
      setField("topmostSubform[0].Page1[0].f_16[0]", data.treatyIncomeType ?? "");
      setField("topmostSubform[0].Page1[0].f_17[0]", data.treatyExplanation ?? "");
    }

    setField("topmostSubform[0].Page1[0].f_21[0]", data.signatureName);
    setField("topmostSubform[0].Page1[0].Date[0]", data.signatureDate);

    form.flatten();
    return pdf.save();
  } catch (pdfErr) {
    console.error("W-8BEN PDF fill error, using fallback:", pdfErr);
    return generateW8BENFallback(data);
  }
}

async function generateW8BENFallback(data: W8BENData): Promise<Uint8Array> {
  const { StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);

  let y = 740;
  const lx = 50;

  function heading(text: string) {
    page.drawText(text, { x: lx, y, font: bold, size: 14, color: black });
    y -= 28;
  }
  function row(label: string, value: string) {
    page.drawText(label, { x: lx, y, font, size: 9, color: gray });
    page.drawText(value, { x: lx + 180, y, font, size: 10, color: black });
    y -= 18;
  }

  heading("Form W-8BEN — Certificate of Foreign Status");
  y -= 4;
  row("Name:", data.name);
  row("Country of Citizenship:", data.countryOfCitizenship);
  row("Permanent Address:", data.permanentAddress);
  row("City / Province:", data.permanentCityStateProvince);
  row("Country:", data.permanentCountry);
  if (data.mailingAddress) {
    row("Mailing Address:", data.mailingAddress);
    row("Mailing City/Province:", data.mailingCityStateProvince ?? "");
    row("Mailing Country:", data.mailingCountry ?? "");
  }
  if (data.foreignTin) row("Foreign TIN:", data.foreignTin);
  if (data.usTin) row("US TIN:", data.usTin);
  row("Date of Birth:", data.dateOfBirth);
  y -= 10;
  if (data.treatyCountry) {
    heading("Treaty Benefits (Part II)");
    row("Treaty Country:", data.treatyCountry);
    if (data.treatyArticle) row("Article:", data.treatyArticle);
    if (data.treatyRate) row("Rate:", data.treatyRate);
    if (data.treatyIncomeType) row("Income Type:", data.treatyIncomeType);
    if (data.treatyExplanation) row("Explanation:", data.treatyExplanation);
    y -= 10;
  }
  heading("Certification");
  row("Signature:", data.signatureName);
  row("Date:", data.signatureDate);

  return pdf.save();
}

export async function POST(request: NextRequest) {
  try {
    const affiliate = await requireAffiliate();
    const body = await request.json();
    const { documentType } = body;

    if (documentType !== "w9" && documentType !== "w8ben") {
      throw new ApiError(400, "Document type must be w9 or w8ben");
    }

    let pdfBytes: Uint8Array;
    try {
      if (documentType === "w9") {
        const data = validateW9(body);
        pdfBytes = await fillW9(data);
      } else {
        const data = validateW8BEN(body);
        pdfBytes = await fillW8BEN(data);
      }
    } catch (pdfErr) {
      if (pdfErr instanceof ApiError) throw pdfErr;
      console.error("PDF generation error:", pdfErr);
      throw new ApiError(500, "Failed to generate PDF — please check your inputs and try again");
    }

    const supabase = await createServiceClient();
    const timestamp = Date.now();
    const filePath = `${affiliate.id}/${documentType}_${timestamp}.pdf`;

    const { data: existing } = await supabase
      .from("tax_documents")
      .select("id, file_path")
      .eq("affiliate_id", affiliate.id)
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase.storage.from("tax-docs").remove([existing.file_path]);
    }

    const { error: uploadError } = await supabase.storage
      .from("tax-docs")
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new ApiError(500, "Failed to store document");
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("tax_documents")
        .update({
          document_type: documentType,
          file_path: filePath,
          uploaded_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updateError) {
        console.error("Update error:", updateError);
        throw new ApiError(500, "Failed to update document record");
      }
    } else {
      const { error: insertError } = await supabase
        .from("tax_documents")
        .insert({
          affiliate_id: affiliate.id,
          document_type: documentType,
          file_path: filePath,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new ApiError(500, "Failed to save document record");
      }
    }

    return NextResponse.json({
      success: true,
      documentType,
      uploadedAt: new Date().toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
