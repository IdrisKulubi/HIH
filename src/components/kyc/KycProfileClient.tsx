"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { saveKycDraft, submitKycProfile, requestKycProfileChange } from "@/lib/actions";

type DocumentItem = {
  documentType:
    | "tax_compliance_certificate"
    | "cr12"
    | "bank_account_proof"
    | "programme_consent_form"
    | "director_id_document"
    | "additional_supporting_document";
  fileUrl: string;
  fileName?: string | null;
  documentNumber?: string | null;
  notes?: string | null;
};

type Props = {
  data: {
    applicationId: number;
    applicationStatus: string;
    kycStatus: string;
    profile: {
      status: string;
      profileLockStatus: string;
      gpsCoordinates: string | null;
      registrationTypeConfirmed: string | null;
      kraPin: string | null;
      bankName: string | null;
      bankAccountName: string | null;
      baselineMonthLabel: string | null;
      baselineRevenue: string | null;
      baselineEmployeeCount: number | null;
      secondaryContactName: string | null;
      secondaryContactPhone: string | null;
      secondaryContactEmail: string | null;
      reviewNotes: string | null;
      rejectionReason: string | null;
      needsInfoReason: string | null;
    };
    business: {
      name: string;
      registrationType: string | null;
      revenueLastYear: string | null;
      fullTimeEmployeesTotal: number | null;
    };
    documents: Array<{
      documentType: DocumentItem["documentType"];
      fileUrl: string;
      fileName: string | null;
      documentNumber: string | null;
      notes: string | null;
      isVerified: boolean;
    }>;
    fieldChanges: Array<{
      fieldName: string;
      oldValue: unknown;
      newValue: unknown;
      isCoreField: boolean;
    }>;
  };
};

const DOC_LABELS: Array<{ type: DocumentItem["documentType"]; label: string; required: boolean }> = [
  { type: "tax_compliance_certificate", label: "Tax Compliance Certificate", required: true },
  { type: "cr12", label: "CR12", required: false },
  { type: "bank_account_proof", label: "Bank Account Proof", required: true },
  { type: "programme_consent_form", label: "Programme Consent Form", required: true },
  { type: "director_id_document", label: "Director ID Document", required: false },
  { type: "additional_supporting_document", label: "Additional Supporting Document", required: false },
];

export function KycProfileClient({ data }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const existingDocs = useMemo(
    () =>
      Object.fromEntries(
        data.documents.map((doc) => [
          doc.documentType,
          {
            fileUrl: doc.fileUrl,
            fileName: doc.fileName ?? "",
            documentNumber: doc.documentNumber ?? "",
            notes: doc.notes ?? "",
          },
        ])
      ),
    [data.documents]
  );

  const [form, setForm] = useState({
    gpsCoordinates: data.profile.gpsCoordinates ?? "",
    registrationTypeConfirmed: data.profile.registrationTypeConfirmed ?? data.business.registrationType ?? "other",
    kraPin: data.profile.kraPin ?? "",
    bankName: data.profile.bankName ?? "",
    bankAccountName: data.profile.bankAccountName ?? "",
    baselineMonthLabel: data.profile.baselineMonthLabel ?? "Month 0",
    baselineRevenue: data.profile.baselineRevenue ?? data.business.revenueLastYear ?? "",
    baselineEmployeeCount: String(data.profile.baselineEmployeeCount ?? data.business.fullTimeEmployeesTotal ?? 0),
    secondaryContactName: data.profile.secondaryContactName ?? "",
    secondaryContactPhone: data.profile.secondaryContactPhone ?? "",
    secondaryContactEmail: data.profile.secondaryContactEmail ?? "",
  });
  const [documents, setDocuments] = useState<Record<string, { fileUrl: string; fileName: string; documentNumber: string; notes: string }>>({
    tax_compliance_certificate: existingDocs.tax_compliance_certificate ?? { fileUrl: "", fileName: "", documentNumber: "", notes: "" },
    cr12: existingDocs.cr12 ?? { fileUrl: "", fileName: "", documentNumber: "", notes: "" },
    bank_account_proof: existingDocs.bank_account_proof ?? { fileUrl: "", fileName: "", documentNumber: "", notes: "" },
    programme_consent_form: existingDocs.programme_consent_form ?? { fileUrl: "", fileName: "", documentNumber: "", notes: "" },
    director_id_document: existingDocs.director_id_document ?? { fileUrl: "", fileName: "", documentNumber: "", notes: "" },
    additional_supporting_document: existingDocs.additional_supporting_document ?? { fileUrl: "", fileName: "", documentNumber: "", notes: "" },
  });
  const [changeRequest, setChangeRequest] = useState({
    fieldName: "kraPin",
    requestedValue: "",
    reason: "",
  });

  const isLocked = data.profile.profileLockStatus === "locked" || data.profile.profileLockStatus === "change_requested";

  const serializeDocs = () =>
    DOC_LABELS.map((item) => ({
      documentType: item.type,
      fileUrl: documents[item.type]?.fileUrl?.trim() ?? "",
      fileName: documents[item.type]?.fileName?.trim() ?? "",
      documentNumber: documents[item.type]?.documentNumber?.trim() ?? "",
      notes: documents[item.type]?.notes?.trim() ?? "",
    })).filter((doc) => doc.fileUrl);

  const buildPayload = () => ({
    gpsCoordinates: form.gpsCoordinates.trim(),
    registrationTypeConfirmed: form.registrationTypeConfirmed as
      | "limited_company"
      | "partnership"
      | "cooperative"
      | "self_help_group_cbo"
      | "sole_proprietorship"
      | "other",
    kraPin: form.kraPin.trim(),
    bankName: form.bankName.trim(),
    bankAccountName: form.bankAccountName.trim(),
    baselineMonthLabel: form.baselineMonthLabel.trim(),
    baselineRevenue: Number(form.baselineRevenue || 0),
    baselineEmployeeCount: Number(form.baselineEmployeeCount || 0),
    secondaryContactName: form.secondaryContactName.trim() || undefined,
    secondaryContactPhone: form.secondaryContactPhone.trim() || undefined,
    secondaryContactEmail: form.secondaryContactEmail.trim() || undefined,
    documents: serializeDocs(),
  });

  const handleSaveDraft = () => {
    startTransition(async () => {
      const result = await saveKycDraft(buildPayload());
      if (!result.success) {
        toast.error(result.error || "Failed to save draft");
        return;
      }
      toast.success(result.message || "Draft saved");
      router.refresh();
    });
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await submitKycProfile(buildPayload());
      if (!result.success) {
        toast.error(result.error || "Failed to submit KYC");
        return;
      }
      toast.success(result.message || "KYC submitted");
      router.refresh();
    });
  };

  const handleChangeRequest = () => {
    startTransition(async () => {
      const result = await requestKycProfileChange({
        fieldName: changeRequest.fieldName,
        requestedValue: changeRequest.requestedValue,
        reason: changeRequest.reason,
      });
      if (!result.success) {
        toast.error(result.error || "Failed to submit change request");
        return;
      }
      toast.success(result.message || "Change request submitted");
      setChangeRequest((current) => ({ ...current, requestedValue: "", reason: "" }));
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>KYC Onboarding</CardTitle>
              <CardDescription>
                Review your selected enterprise profile, add compliance details, and submit for verification.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="capitalize">{data.applicationStatus.replace(/_/g, " ")}</Badge>
              <Badge className="capitalize bg-blue-100 text-blue-700 hover:bg-blue-100">{data.kycStatus.replace(/_/g, " ")}</Badge>
              <Badge variant="secondary" className="capitalize">{data.profile.profileLockStatus.replace(/_/g, " ")}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Business</p>
            <p className="mt-1 font-semibold text-slate-900">{data.business.name}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Current Baseline Revenue</p>
            <p className="mt-1 font-semibold text-slate-900">{data.business.revenueLastYear ?? "Not captured"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Current Workforce</p>
            <p className="mt-1 font-semibold text-slate-900">{data.business.fullTimeEmployeesTotal ?? 0} employees</p>
          </div>
        </CardContent>
      </Card>

      {(data.profile.needsInfoReason || data.profile.rejectionReason || data.profile.reviewNotes) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">Review Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-amber-900">
            {data.profile.needsInfoReason && <p><span className="font-semibold">Needs info:</span> {data.profile.needsInfoReason}</p>}
            {data.profile.rejectionReason && <p><span className="font-semibold">Rejected:</span> {data.profile.rejectionReason}</p>}
            {data.profile.reviewNotes && <p><span className="font-semibold">Notes:</span> {data.profile.reviewNotes}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>KYC Details</CardTitle>
          <CardDescription>
            Complete the compliance and baseline details required to unlock mentorship, CNA, M&amp;E, and A2F support.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gpsCoordinates">GPS Coordinates</Label>
              <Input id="gpsCoordinates" value={form.gpsCoordinates} onChange={(e) => setForm({ ...form, gpsCoordinates: e.target.value })} disabled={isLocked || isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationTypeConfirmed">Registration Type</Label>
              <select
                id="registrationTypeConfirmed"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.registrationTypeConfirmed}
                onChange={(e) => setForm({ ...form, registrationTypeConfirmed: e.target.value })}
                disabled={isLocked || isPending}
              >
                <option value="limited_company">Limited Company</option>
                <option value="partnership">Partnership</option>
                <option value="cooperative">Cooperative</option>
                <option value="self_help_group_cbo">Self Help Group / CBO</option>
                <option value="sole_proprietorship">Sole Proprietorship</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kraPin">KRA PIN</Label>
              <Input id="kraPin" value={form.kraPin} onChange={(e) => setForm({ ...form, kraPin: e.target.value })} disabled={isLocked || isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baselineMonthLabel">Baseline Label</Label>
              <Input id="baselineMonthLabel" value={form.baselineMonthLabel} onChange={(e) => setForm({ ...form, baselineMonthLabel: e.target.value })} disabled={isLocked || isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baselineRevenue">Baseline Revenue</Label>
              <Input id="baselineRevenue" type="number" value={form.baselineRevenue} onChange={(e) => setForm({ ...form, baselineRevenue: e.target.value })} disabled={isLocked || isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baselineEmployeeCount">Baseline Employee Count</Label>
              <Input id="baselineEmployeeCount" type="number" value={form.baselineEmployeeCount} onChange={(e) => setForm({ ...form, baselineEmployeeCount: e.target.value })} disabled={isLocked || isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input id="bankName" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} disabled={isLocked || isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankAccountName">Bank Account Name</Label>
              <Input id="bankAccountName" value={form.bankAccountName} onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })} disabled={isLocked || isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryContactName">Secondary Contact Name</Label>
              <Input id="secondaryContactName" value={form.secondaryContactName} onChange={(e) => setForm({ ...form, secondaryContactName: e.target.value })} disabled={isLocked || isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryContactPhone">Secondary Contact Phone</Label>
              <Input id="secondaryContactPhone" value={form.secondaryContactPhone} onChange={(e) => setForm({ ...form, secondaryContactPhone: e.target.value })} disabled={isLocked || isPending} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="secondaryContactEmail">Secondary Contact Email</Label>
              <Input id="secondaryContactEmail" value={form.secondaryContactEmail} onChange={(e) => setForm({ ...form, secondaryContactEmail: e.target.value })} disabled={isLocked || isPending} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-900">Documents</h3>
              <p className="text-sm text-slate-500">Paste the uploaded file URLs for now. We can switch this to UploadThing forms next.</p>
            </div>
            {DOC_LABELS.map((doc) => (
              <div key={doc.type} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <Label className="font-medium text-slate-900">{doc.label}</Label>
                  <div className="flex items-center gap-2">
                    {doc.required && <Badge variant="outline">Required</Badge>}
                    {data.documents.find((item) => item.documentType === doc.type)?.isVerified && (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Verified</Badge>
                    )}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder="File URL"
                    value={documents[doc.type]?.fileUrl ?? ""}
                    onChange={(e) => setDocuments({ ...documents, [doc.type]: { ...documents[doc.type], fileUrl: e.target.value } })}
                    disabled={isLocked || isPending}
                  />
                  <Input
                    placeholder="File name"
                    value={documents[doc.type]?.fileName ?? ""}
                    onChange={(e) => setDocuments({ ...documents, [doc.type]: { ...documents[doc.type], fileName: e.target.value } })}
                    disabled={isLocked || isPending}
                  />
                  <Input
                    placeholder="Document number"
                    value={documents[doc.type]?.documentNumber ?? ""}
                    onChange={(e) => setDocuments({ ...documents, [doc.type]: { ...documents[doc.type], documentNumber: e.target.value } })}
                    disabled={isLocked || isPending}
                  />
                  <Input
                    placeholder="Notes"
                    value={documents[doc.type]?.notes ?? ""}
                    onChange={(e) => setDocuments({ ...documents, [doc.type]: { ...documents[doc.type], notes: e.target.value } })}
                    disabled={isLocked || isPending}
                  />
                </div>
              </div>
            ))}
          </div>

          {!isLocked && (
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleSaveDraft} disabled={isPending}>Save Draft</Button>
              <Button onClick={handleSubmit} disabled={isPending}>Submit for Review</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {data.fieldChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detected Changes</CardTitle>
            <CardDescription>These differences will be visible to verification admins during review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.fieldChanges.map((change) => (
              <div key={change.fieldName} className="rounded-xl border border-slate-200 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">{change.fieldName}</p>
                  <Badge variant={change.isCoreField ? "default" : "outline"}>{change.isCoreField ? "Core field" : "Supplementary"}</Badge>
                </div>
                <p className="mt-2 text-slate-600">Old: {String(change.oldValue ?? "empty")}</p>
                <p className="text-slate-900">New: {String(change.newValue ?? "empty")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isLocked && (
        <Card>
          <CardHeader>
            <CardTitle>Request a Locked Profile Change</CardTitle>
            <CardDescription>Verified profiles are locked. Use this request flow if a core detail must be updated.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="changeField">Field</Label>
                <select
                  id="changeField"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={changeRequest.fieldName}
                  onChange={(e) => setChangeRequest({ ...changeRequest, fieldName: e.target.value })}
                  disabled={isPending}
                >
                  <option value="kraPin">KRA PIN</option>
                  <option value="registrationType">Registration Type</option>
                  <option value="baselineRevenue">Baseline Revenue</option>
                  <option value="baselineEmployeeCount">Baseline Employee Count</option>
                  <option value="gpsCoordinates">GPS Coordinates</option>
                  <option value="bankName">Bank Name</option>
                  <option value="bankAccountName">Bank Account Name</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="requestedValue">Requested Value</Label>
                <Input id="requestedValue" value={changeRequest.requestedValue} onChange={(e) => setChangeRequest({ ...changeRequest, requestedValue: e.target.value })} disabled={isPending} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea id="reason" value={changeRequest.reason} onChange={(e) => setChangeRequest({ ...changeRequest, reason: e.target.value })} disabled={isPending} />
            </div>
            <Button onClick={handleChangeRequest} disabled={isPending}>Submit Change Request</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
