"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  FileText,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { ICON_STROKE_WIDTH } from "@/lib/constants";

type DocType = "w9" | "w8ben";

interface TaxStatus {
  onFile: boolean;
  documentType?: string;
  uploadedAt?: string;
}

const TAX_CLASSIFICATIONS = [
  { value: "individual", label: "Individual / Sole proprietor" },
  { value: "c_corp", label: "C Corporation" },
  { value: "s_corp", label: "S Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "trust_estate", label: "Trust / Estate" },
  { value: "llc", label: "LLC" },
  { value: "other", label: "Other" },
] as const;

function W9Form({ onSubmit, submitting }: { onSubmit: (data: Record<string, unknown>) => void; submitting: boolean }) {
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [taxClassification, setTaxClassification] = useState("individual");
  const [llcClassification, setLlcClassification] = useState("");
  const [otherDescription, setOtherDescription] = useState("");
  const [address, setAddress] = useState("");
  const [cityStateZip, setCityStateZip] = useState("");
  const [tinType, setTinType] = useState<"ssn" | "ein">("ssn");
  const [tin, setTin] = useState("");
  const [certify, setCertify] = useState(false);
  const [signatureName, setSignatureName] = useState("");

  function formatTin(value: string) {
    const digits = value.replace(/\D/g, "");
    if (tinType === "ssn") {
      if (digits.length <= 3) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
    }
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}-${digits.slice(2, 9)}`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!certify) {
      toast.error("You must certify the information is correct");
      return;
    }
    onSubmit({
      documentType: "w9",
      name,
      businessName: businessName || undefined,
      taxClassification,
      llcClassification: taxClassification === "llc" ? llcClassification : undefined,
      otherDescription: taxClassification === "other" ? otherDescription : undefined,
      address,
      cityStateZip,
      tinType,
      tin,
      signatureName,
      signatureDate: new Date().toLocaleDateString("en-US"),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label className="text-[12px]">Name (as shown on your income tax return)</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" required placeholder="Full legal name" />
      </div>

      <div className="space-y-2">
        <Label className="text-[12px]">Business name / disregarded entity name (optional)</Label>
        <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="h-9" placeholder="If different from above" />
      </div>

      <div className="space-y-2">
        <Label className="text-[12px]">Federal tax classification</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TAX_CLASSIFICATIONS.map((tc) => (
            <label
              key={tc.value}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors text-[12px] ${
                taxClassification === tc.value
                  ? "border-zinc-500 bg-zinc-800/50 text-white"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              <input
                type="radio"
                name="taxClass"
                value={tc.value}
                checked={taxClassification === tc.value}
                onChange={(e) => setTaxClassification(e.target.value)}
                className="sr-only"
              />
              <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                taxClassification === tc.value ? "border-white" : "border-zinc-600"
              }`}>
                {taxClassification === tc.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              {tc.label}
            </label>
          ))}
        </div>
        {taxClassification === "llc" && (
          <div className="mt-2">
            <Label className="text-[12px]">LLC tax classification (C=C corp, S=S corp, P=Partnership)</Label>
            <Input value={llcClassification} onChange={(e) => setLlcClassification(e.target.value)} className="h-9 w-20 mt-1" maxLength={1} placeholder="C/S/P" />
          </div>
        )}
        {taxClassification === "other" && (
          <div className="mt-2">
            <Label className="text-[12px]">Describe</Label>
            <Input value={otherDescription} onChange={(e) => setOtherDescription(e.target.value)} className="h-9 mt-1" required placeholder="Description" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[12px]">Address (street, apt, suite)</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} className="h-9" required placeholder="123 Main St, Apt 4" />
        </div>
        <div className="space-y-2">
          <Label className="text-[12px]">City, State, ZIP</Label>
          <Input value={cityStateZip} onChange={(e) => setCityStateZip(e.target.value)} className="h-9" required placeholder="New York, NY 10001" />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-[12px]">Taxpayer Identification Number (TIN)</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setTinType("ssn"); setTin(""); }}
            className={`px-3 py-1.5 rounded-md text-[12px] font-medium border transition-colors ${
              tinType === "ssn"
                ? "border-zinc-500 bg-zinc-800 text-white"
                : "border-zinc-700 text-zinc-400 hover:text-zinc-300"
            }`}
          >
            SSN
          </button>
          <button
            type="button"
            onClick={() => { setTinType("ein"); setTin(""); }}
            className={`px-3 py-1.5 rounded-md text-[12px] font-medium border transition-colors ${
              tinType === "ein"
                ? "border-zinc-500 bg-zinc-800 text-white"
                : "border-zinc-700 text-zinc-400 hover:text-zinc-300"
            }`}
          >
            EIN
          </button>
        </div>
        <Input
          value={tin}
          onChange={(e) => setTin(formatTin(e.target.value))}
          className="h-9 font-mono w-48"
          required
          placeholder={tinType === "ssn" ? "XXX-XX-XXXX" : "XX-XXXXXXX"}
          maxLength={tinType === "ssn" ? 11 : 10}
        />
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={certify}
            onChange={(e) => setCertify(e.target.checked)}
            className="mt-0.5 rounded border-zinc-600 bg-zinc-900 text-white focus:ring-0 focus:ring-offset-0"
          />
          <span className="text-[11px] text-zinc-400 leading-relaxed">
            Under penalties of perjury, I certify that the number shown on this form is my correct taxpayer identification number,
            I am not subject to backup withholding, I am a U.S. citizen or other U.S. person, and the FATCA code(s) entered
            on this form (if any) indicating that I am exempt from FATCA reporting is correct.
          </span>
        </label>

        <div className="space-y-2">
          <Label className="text-[12px]">Electronic Signature (type your full name)</Label>
          <Input
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            className="h-9 max-w-sm italic"
            required
            placeholder="Your full legal name"
          />
          <p className="text-[11px] text-zinc-500">
            Date: {new Date().toLocaleDateString("en-US")}
          </p>
        </div>
      </div>

      <Button type="submit" size="sm" disabled={submitting || !certify || !signatureName}>
        {submitting ? (
          <><Loader2 size={14} className="animate-spin" /> Submitting...</>
        ) : (
          <><FileText size={14} strokeWidth={ICON_STROKE_WIDTH} /> Submit W-9</>
        )}
      </Button>
    </form>
  );
}

function W8BENForm({ onSubmit, submitting }: { onSubmit: (data: Record<string, unknown>) => void; submitting: boolean }) {
  const [name, setName] = useState("");
  const [countryOfCitizenship, setCountryOfCitizenship] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [permanentCityStateProvince, setPermanentCityStateProvince] = useState("");
  const [permanentCountry, setPermanentCountry] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");
  const [mailingCityStateProvince, setMailingCityStateProvince] = useState("");
  const [mailingCountry, setMailingCountry] = useState("");
  const [foreignTin, setForeignTin] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [hasTreaty, setHasTreaty] = useState(false);
  const [treatyCountry, setTreatyCountry] = useState("");
  const [treatyArticle, setTreatyArticle] = useState("");
  const [treatyRate, setTreatyRate] = useState("");
  const [treatyIncomeType, setTreatyIncomeType] = useState("");
  const [certify, setCertify] = useState(false);
  const [signatureName, setSignatureName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!certify) {
      toast.error("You must certify the information is correct");
      return;
    }
    onSubmit({
      documentType: "w8ben",
      name,
      countryOfCitizenship,
      permanentAddress,
      permanentCityStateProvince,
      permanentCountry,
      mailingAddress: mailingAddress || undefined,
      mailingCityStateProvince: mailingCityStateProvince || undefined,
      mailingCountry: mailingCountry || undefined,
      foreignTin: foreignTin || undefined,
      dateOfBirth,
      treatyCountry: hasTreaty ? treatyCountry : undefined,
      treatyArticle: hasTreaty ? treatyArticle : undefined,
      treatyRate: hasTreaty ? treatyRate : undefined,
      treatyIncomeType: hasTreaty ? treatyIncomeType : undefined,
      signatureName,
      signatureDate: new Date().toLocaleDateString("en-US"),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[12px]">Name of individual</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" required placeholder="Full legal name" />
        </div>
        <div className="space-y-2">
          <Label className="text-[12px]">Country of citizenship</Label>
          <Input value={countryOfCitizenship} onChange={(e) => setCountryOfCitizenship(e.target.value)} className="h-9" required placeholder="e.g. Canada" />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-[12px] font-medium text-zinc-300">Permanent residence address</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} className="h-9" required placeholder="Street address" />
          <Input value={permanentCityStateProvince} onChange={(e) => setPermanentCityStateProvince(e.target.value)} className="h-9" required placeholder="City, Province" />
          <Input value={permanentCountry} onChange={(e) => setPermanentCountry(e.target.value)} className="h-9" required placeholder="Country" />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-[12px] font-medium text-zinc-400">Mailing address (if different)</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input value={mailingAddress} onChange={(e) => setMailingAddress(e.target.value)} className="h-9" placeholder="Street address" />
          <Input value={mailingCityStateProvince} onChange={(e) => setMailingCityStateProvince(e.target.value)} className="h-9" placeholder="City, Province" />
          <Input value={mailingCountry} onChange={(e) => setMailingCountry(e.target.value)} className="h-9" placeholder="Country" />
        </div>
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-[12px]">Foreign tax identifying number</Label>
          <Input value={foreignTin} onChange={(e) => setForeignTin(e.target.value)} className="h-9 font-mono" placeholder="Your country TIN" />
        </div>
        <div className="space-y-2">
          <Label className="text-[12px]">Date of birth</Label>
          <Input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="h-9"
            required
            min="1900-01-01"
            max={new Date().toISOString().split("T")[0]}
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={hasTreaty}
            onChange={(e) => setHasTreaty(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-900 text-white focus:ring-0 focus:ring-offset-0"
          />
          <span className="text-[12px] text-zinc-300">Claim treaty benefits (Part II)</span>
        </label>
        {hasTreaty && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-7">
            <Input value={treatyCountry} onChange={(e) => setTreatyCountry(e.target.value)} className="h-9" placeholder="Treaty country" />
            <Input value={treatyArticle} onChange={(e) => setTreatyArticle(e.target.value)} className="h-9" placeholder="Article & paragraph" />
            <Input value={treatyRate} onChange={(e) => setTreatyRate(e.target.value)} className="h-9" placeholder="Rate of withholding %" />
            <Input value={treatyIncomeType} onChange={(e) => setTreatyIncomeType(e.target.value)} className="h-9" placeholder="Type of income" />
          </div>
        )}
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={certify}
            onChange={(e) => setCertify(e.target.checked)}
            className="mt-0.5 rounded border-zinc-600 bg-zinc-900 text-white focus:ring-0 focus:ring-offset-0"
          />
          <span className="text-[11px] text-zinc-400 leading-relaxed">
            Under penalties of perjury, I declare that I have examined the information on this form and to the best of my knowledge
            and belief it is true, correct, and complete. I am the beneficial owner of the income to which this form relates,
            I am not a U.S. person, and I am not acting as an agent or nominee for another person.
          </span>
        </label>

        <div className="space-y-2">
          <Label className="text-[12px]">Electronic Signature (type your full name)</Label>
          <Input
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            className="h-9 max-w-sm italic"
            required
            placeholder="Your full legal name"
          />
          <p className="text-[11px] text-zinc-500">
            Date: {new Date().toLocaleDateString("en-US")}
          </p>
        </div>
      </div>

      <Button type="submit" size="sm" disabled={submitting || !certify || !signatureName}>
        {submitting ? (
          <><Loader2 size={14} className="animate-spin" /> Submitting...</>
        ) : (
          <><FileText size={14} strokeWidth={ICON_STROKE_WIDTH} /> Submit W-8BEN</>
        )}
      </Button>
    </form>
  );
}

export function TaxFormSection() {
  const [status, setStatus] = useState<TaxStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<DocType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/tax/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleSubmit(data: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/tax/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error("Submission failed", { description: err.error });
        return;
      }

      toast.success("Tax form submitted successfully");
      setShowForm(false);
      setSelectedType(null);
      setLoading(true);
      fetchStatus();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={15} strokeWidth={ICON_STROKE_WIDTH} className="text-muted-foreground" />
            <h2 className="text-heading-3">Tax Documents</h2>
          </div>
          {!loading && status?.onFile && (
            <span className="text-[11px] font-medium text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10">
              On File
            </span>
          )}
          {!loading && !status?.onFile && (
            <span className="text-[11px] font-medium text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 bg-amber-500/10">
              Required
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Loader2 size={14} className="animate-spin" /> Loading...
          </div>
        ) : status?.onFile && !showForm ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-zinc-700 bg-black px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <div>
                  <p className="text-[13px] text-white">
                    {status.documentType === "w9" ? "W-9" : "W-8BEN"} on file
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Submitted {new Date(status.uploadedAt!).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(true)}>
                <RefreshCw size={13} strokeWidth={ICON_STROKE_WIDTH} />
                Update
              </Button>
            </div>
          </div>
        ) : !showForm ? (
          <div className="space-y-4">
            <p className="text-[13px] text-zinc-400">
              A tax form is required to receive affiliate payouts. Select the form that applies to you.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => { setSelectedType("w9"); setShowForm(true); }}
                className="rounded-lg border border-zinc-700 bg-black p-4 text-left hover:border-zinc-500 transition-colors"
              >
                <p className="text-[14px] font-medium text-white">W-9</p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  U.S. citizens and resident aliens
                </p>
              </button>
              <button
                onClick={() => { setSelectedType("w8ben"); setShowForm(true); }}
                className="rounded-lg border border-zinc-700 bg-black p-4 text-left hover:border-zinc-500 transition-colors"
              >
                <p className="text-[14px] font-medium text-white">W-8BEN</p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Non-U.S. individuals
                </p>
              </button>
            </div>
          </div>
        ) : null}

        {showForm && (
          <div className="space-y-4">
            {!selectedType ? (
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedType("w9")}
                  className="px-3 py-1.5 rounded-md text-[12px] font-medium border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
                >
                  W-9 (US)
                </button>
                <button
                  onClick={() => setSelectedType("w8ben")}
                  className="px-3 py-1.5 rounded-md text-[12px] font-medium border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
                >
                  W-8BEN (Non-US)
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-white">
                      {selectedType === "w9" ? "Form W-9" : "Form W-8BEN"}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {selectedType === "w9"
                        ? "Request for Taxpayer Identification Number"
                        : "Certificate of Foreign Status of Beneficial Owner"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowForm(false); setSelectedType(null); }}
                  >
                    Cancel
                  </Button>
                </div>

                {selectedType === "w9" ? (
                  <W9Form onSubmit={handleSubmit} submitting={submitting} />
                ) : (
                  <W8BENForm onSubmit={handleSubmit} submitting={submitting} />
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
