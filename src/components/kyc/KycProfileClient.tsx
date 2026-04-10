"use client";

import { ReactNode, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { saveKycDraft, submitKycProfile, requestKycProfileChange } from "@/lib/actions";
import { KycDocumentUploader } from "@/components/kyc/KycDocumentUploader";
import { cn } from "@/lib/utils";
import { getDocumentViewerHref } from "@/lib/document-view-url";
import { Loader2, MapPin } from "lucide-react";

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

const FIELD_LABELS: Record<string, string> = {
  gpsCoordinates: "Business location",
  registrationTypeConfirmed: "Registration type",
  kraPin: "KRA PIN",
  bankName: "Bank name",
  bankAccountName: "Bank account name",
  baselineMonthLabel: "Baseline label",
  baselineRevenue: "Baseline revenue",
  baselineEmployeeCount: "Baseline employee count",
  secondaryContactName: "Secondary contact name",
  secondaryContactPhone: "Secondary contact phone",
  secondaryContactEmail: "Secondary contact email",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function RequiredLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className="inline-flex items-center gap-1">
      <span>{children}</span>
      <span className="text-red-500">*</span>
    </Label>
  );
}

function buildDocumentNumber(documentType: DocumentItem["documentType"]) {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${documentType.toUpperCase()}-${timestamp}`;
}

export function KycProfileClient({ data }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState(
    data.profile.gpsCoordinates ? "Current location captured." : ""
  );
  const [actionError, setActionError] = useState("");
  const [validationSummary, setValidationSummary] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
  const canEditKyc = data.profile.status === "in_progress" || data.profile.status === "needs_info";
  const showEditableActions = canEditKyc && !isLocked;
  const showReadOnlySummary = !canEditKyc;
  const isSubmittedState = data.profile.status === "submitted";
  const isVerifiedState = data.profile.status === "verified";
  const isRejectedState = data.profile.status === "rejected";
  const isNeedsInfoState = data.profile.status === "needs_info";

  const submittedValues = [
    { label: "Business location", value: form.gpsCoordinates || "Not provided" },
    {
      label: "Registration type",
      value: form.registrationTypeConfirmed.replace(/_/g, " ") || "Not provided",
    },
    { label: "KRA PIN", value: form.kraPin || "Not provided" },
    { label: "Bank name", value: form.bankName || "Not provided" },
    { label: "Bank account name", value: form.bankAccountName || "Not provided" },
    { label: "Baseline label", value: form.baselineMonthLabel || "Not provided" },
    { label: "Baseline revenue", value: form.baselineRevenue || "Not provided" },
    { label: "Baseline employee count", value: form.baselineEmployeeCount || "Not provided" },
    { label: "Secondary contact name", value: form.secondaryContactName || "Not provided" },
    { label: "Secondary contact phone", value: form.secondaryContactPhone || "Not provided" },
    { label: "Secondary contact email", value: form.secondaryContactEmail || "Not provided" },
  ];

  const statusBanner = isVerifiedState
    ? {
        title: "KYC verified",
        description: "Your KYC details have been verified. This profile is now locked for compliance control.",
        className: "border-emerald-200 bg-emerald-50",
        titleClassName: "text-emerald-900",
        textClassName: "text-emerald-800",
      }
    : isSubmittedState
      ? {
          title: "KYC submitted for review",
          description: "Your KYC details are with the review team. You can view what you submitted below while we verify the information.",
          className: "border-blue-200 bg-blue-50",
          titleClassName: "text-blue-900",
          textClassName: "text-blue-800",
        }
      : isRejectedState
        ? {
            title: "KYC submission was not approved",
            description: "Please review the feedback below. This submission is currently read-only.",
            className: "border-red-200 bg-red-50",
            titleClassName: "text-red-900",
            textClassName: "text-red-800",
          }
        : null;

  const setFieldValue = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });

    if (field === "gpsCoordinates") {
      setLocationMessage(value.trim() ? "Location ready." : "");
    }
  };

  const setDocumentValue = (
    documentType: DocumentItem["documentType"],
    value: { fileUrl: string; fileName: string; documentNumber: string; notes: string }
  ) => {
    setDocuments((current) => ({
      ...current,
      [documentType]: value,
    }));
    setFieldErrors((current) => {
      const errorKey = `documents.${documentType}`;
      if (!current[errorKey]) return current;
      const next = { ...current };
      delete next[errorKey];
      return next;
    });
  };

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

  const validateSubmitForm = () => {
    const nextFieldErrors: Record<string, string> = {};
    const nextSummary: string[] = [];
    const trimmed = {
      gpsCoordinates: form.gpsCoordinates.trim(),
      registrationTypeConfirmed: form.registrationTypeConfirmed,
      kraPin: form.kraPin.trim(),
      bankName: form.bankName.trim(),
      bankAccountName: form.bankAccountName.trim(),
      baselineMonthLabel: form.baselineMonthLabel.trim(),
      baselineRevenue: form.baselineRevenue.trim(),
      baselineEmployeeCount: form.baselineEmployeeCount.trim(),
      secondaryContactEmail: form.secondaryContactEmail.trim(),
    };

    const requireField = (field: keyof typeof trimmed) => {
      if (!trimmed[field]) {
        const message = `${FIELD_LABELS[field]} is required.`;
        nextFieldErrors[field] = message;
        nextSummary.push(message);
      }
    };

    requireField("gpsCoordinates");
    requireField("registrationTypeConfirmed");
    requireField("kraPin");
    requireField("bankName");
    requireField("bankAccountName");
    requireField("baselineMonthLabel");
    requireField("baselineRevenue");
    requireField("baselineEmployeeCount");

    if (trimmed.baselineRevenue && Number.isNaN(Number(trimmed.baselineRevenue))) {
      const message = "Baseline revenue must be a valid number.";
      nextFieldErrors.baselineRevenue = message;
      nextSummary.push(message);
    }

    if (trimmed.baselineEmployeeCount && Number.isNaN(Number(trimmed.baselineEmployeeCount))) {
      const message = "Baseline employee count must be a valid number.";
      nextFieldErrors.baselineEmployeeCount = message;
      nextSummary.push(message);
    }

    if (trimmed.secondaryContactEmail && !EMAIL_REGEX.test(trimmed.secondaryContactEmail)) {
      const message = "Secondary contact email must be a valid email address.";
      nextFieldErrors.secondaryContactEmail = message;
      nextSummary.push(message);
    }

    const requiredDocuments = DOC_LABELS.filter(
      (doc) => doc.required || (doc.type === "cr12" && trimmed.registrationTypeConfirmed === "limited_company")
    );

    for (const doc of requiredDocuments) {
      if (!documents[doc.type]?.fileUrl?.trim()) {
        const message = `${doc.label} is required.`;
        nextFieldErrors[`documents.${doc.type}`] = message;
        nextSummary.push(message);
      }
    }

    return {
      nextFieldErrors,
      nextSummary: Array.from(new Set(nextSummary)),
    };
  };

  const focusFirstError = (errors: Record<string, string>) => {
    const firstKey = Object.keys(errors)[0];
    if (!firstKey) return;

    const targetId = firstKey.startsWith("documents.")
      ? `document-${firstKey.replace("documents.", "")}`
      : firstKey;
    const element = document.getElementById(targetId);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    if ("focus" in (element ?? {})) {
      (element as HTMLElement).focus();
    }
  };

  const handleValidationFailure = (summary: string[], errors: Record<string, string>, fallbackMessage?: string) => {
    setFieldErrors(errors);
    setValidationSummary(summary);
    setActionError(fallbackMessage ?? "Please complete the highlighted KYC details before submitting.");
    focusFirstError(errors);
  };

  const renderFieldError = (field: string) =>
    fieldErrors[field] ? <p className="text-sm text-red-600">{fieldErrors[field]}</p> : null;

  const getInputClassName = (field: string) =>
    cn(fieldErrors[field] && "border-red-300 focus-visible:ring-red-500");

  const handleSaveDraft = () => {
    startTransition(async () => {
      const result = await saveKycDraft(buildPayload());
      if (!result.success) {
        const message = result.error || "Failed to save draft";
        setActionError(message);
        toast.error(message);
        return;
      }
      setActionError("");
      setValidationSummary([]);
      toast.success(result.message || "Draft saved");
      router.refresh();
    });
  };

  const handleSubmit = () => {
    const { nextFieldErrors, nextSummary } = validateSubmitForm();
    if (nextSummary.length > 0) {
      handleValidationFailure(nextSummary, nextFieldErrors);
      toast.error("Please complete the highlighted KYC details.");
      return;
    }

    startTransition(async () => {
      const result = await submitKycProfile(buildPayload());
      if (!result.success) {
        const message = result.error || "Failed to submit KYC";
        setActionError(message);
        setValidationSummary([]);
        toast.error(message);
        return;
      }
      setActionError("");
      setValidationSummary([]);
      setFieldErrors({});
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
        const message = result.error || "Failed to submit change request";
        setActionError(message);
        toast.error(message);
        return;
      }
      setActionError("");
      setValidationSummary([]);
      toast.success(result.message || "Change request submitted");
      setChangeRequest((current) => ({ ...current, requestedValue: "", reason: "" }));
      router.refresh();
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      const message = "Location is not supported on this device or browser.";
      setFieldErrors((current) => ({ ...current, gpsCoordinates: message }));
      setLocationMessage("");
      toast.error(message);
      return;
    }

    setIsLocating(true);
    setLocationMessage("Getting your current location...");
    setFieldErrors((current) => {
      if (!current.gpsCoordinates) return current;
      const next = { ...current };
      delete next.gpsCoordinates;
      return next;
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        setFieldValue("gpsCoordinates", coordinates);
        setLocationMessage(
          position.coords.accuracy
            ? `Location captured within about ${Math.round(position.coords.accuracy)} meters.`
            : "Current location captured."
        );
        setIsLocating(false);
        toast.success("Location captured");
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Please allow location access, or enter the location manually."
            : error.code === error.POSITION_UNAVAILABLE
              ? "We could not detect your location right now. Please try again or enter it manually."
              : "Location request timed out. Please try again or enter it manually.";
        setFieldErrors((current) => ({ ...current, gpsCoordinates: message }));
        setLocationMessage("");
        setIsLocating(false);
        toast.error(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
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

      {actionError && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Please fix these KYC details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-red-800">{actionError}</p>
            {validationSummary.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-red-800">
                {validationSummary.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {statusBanner && (
        <Card className={statusBanner.className}>
          <CardHeader>
            <CardTitle className={statusBanner.titleClassName}>{statusBanner.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-sm", statusBanner.textClassName)}>{statusBanner.description}</p>
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
          {showEditableActions ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="space-y-2">
                    <RequiredLabel htmlFor="gpsCoordinates">Business Location</RequiredLabel>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="gpsCoordinates"
                        placeholder="Use your current location or enter coordinates manually"
                        className={cn("sm:flex-1", getInputClassName("gpsCoordinates"))}
                        value={form.gpsCoordinates}
                        onChange={(e) => setFieldValue("gpsCoordinates", e.target.value)}
                        disabled={isLocked || isPending || isLocating}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleUseCurrentLocation}
                        disabled={isLocked || isPending || isLocating}
                        className="sm:w-auto"
                      >
                        {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                        Use my current location
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">
                      The easiest option is to let the browser capture the location for you. Manual entry is only a fallback.
                    </p>
                    {locationMessage && !fieldErrors.gpsCoordinates && (
                      <p className="text-sm text-slate-600">{locationMessage}</p>
                    )}
                  </div>
                  {renderFieldError("gpsCoordinates")}
                </div>
                <div className="space-y-2">
                  <RequiredLabel htmlFor="registrationTypeConfirmed">Registration Type</RequiredLabel>
                  <select
                    id="registrationTypeConfirmed"
                    className={cn("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm", getInputClassName("registrationTypeConfirmed"))}
                    value={form.registrationTypeConfirmed}
                    onChange={(e) => setFieldValue("registrationTypeConfirmed", e.target.value)}
                    disabled={isLocked || isPending}
                  >
                    <option value="limited_company">Limited Company</option>
                    <option value="partnership">Partnership</option>
                    <option value="cooperative">Cooperative</option>
                    <option value="self_help_group_cbo">Self Help Group / CBO</option>
                    <option value="sole_proprietorship">Sole Proprietorship</option>
                    <option value="other">Other</option>
                  </select>
                  {renderFieldError("registrationTypeConfirmed")}
                </div>
                <div className="space-y-2">
                  <RequiredLabel htmlFor="kraPin">KRA PIN</RequiredLabel>
                  <Input id="kraPin" className={getInputClassName("kraPin")} value={form.kraPin} onChange={(e) => setFieldValue("kraPin", e.target.value)} disabled={isLocked || isPending} />
                  {renderFieldError("kraPin")}
                </div>
                <div className="space-y-2">
                  <RequiredLabel htmlFor="baselineMonthLabel">Baseline Label</RequiredLabel>
                  <Input id="baselineMonthLabel" className={getInputClassName("baselineMonthLabel")} value={form.baselineMonthLabel} onChange={(e) => setFieldValue("baselineMonthLabel", e.target.value)} disabled={isLocked || isPending} />
                  {renderFieldError("baselineMonthLabel")}
                </div>
                <div className="space-y-2">
                  <RequiredLabel htmlFor="baselineRevenue">Baseline Revenue</RequiredLabel>
                  <Input id="baselineRevenue" className={getInputClassName("baselineRevenue")} type="number" value={form.baselineRevenue} onChange={(e) => setFieldValue("baselineRevenue", e.target.value)} disabled={isLocked || isPending} />
                  {renderFieldError("baselineRevenue")}
                </div>
                <div className="space-y-2">
                  <RequiredLabel htmlFor="baselineEmployeeCount">Baseline Employee Count</RequiredLabel>
                  <Input id="baselineEmployeeCount" className={getInputClassName("baselineEmployeeCount")} type="number" value={form.baselineEmployeeCount} onChange={(e) => setFieldValue("baselineEmployeeCount", e.target.value)} disabled={isLocked || isPending} />
                  {renderFieldError("baselineEmployeeCount")}
                </div>
                <div className="space-y-2">
                  <RequiredLabel htmlFor="bankName">Bank Name</RequiredLabel>
                  <Input id="bankName" className={getInputClassName("bankName")} value={form.bankName} onChange={(e) => setFieldValue("bankName", e.target.value)} disabled={isLocked || isPending} />
                  {renderFieldError("bankName")}
                </div>
                <div className="space-y-2">
                  <RequiredLabel htmlFor="bankAccountName">Bank Account Name</RequiredLabel>
                  <Input id="bankAccountName" className={getInputClassName("bankAccountName")} value={form.bankAccountName} onChange={(e) => setFieldValue("bankAccountName", e.target.value)} disabled={isLocked || isPending} />
                  {renderFieldError("bankAccountName")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryContactName">Secondary Contact Name</Label>
                  <Input id="secondaryContactName" value={form.secondaryContactName} onChange={(e) => setFieldValue("secondaryContactName", e.target.value)} disabled={isLocked || isPending} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryContactPhone">Secondary Contact Phone</Label>
                  <Input id="secondaryContactPhone" value={form.secondaryContactPhone} onChange={(e) => setFieldValue("secondaryContactPhone", e.target.value)} disabled={isLocked || isPending} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="secondaryContactEmail">Secondary Contact Email</Label>
                  <Input id="secondaryContactEmail" className={getInputClassName("secondaryContactEmail")} value={form.secondaryContactEmail} onChange={(e) => setFieldValue("secondaryContactEmail", e.target.value)} disabled={isLocked || isPending} />
                  {renderFieldError("secondaryContactEmail")}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-900">Documents</h3>
                  <p className="text-sm text-slate-500">Upload the required compliance documents before submitting your KYC profile.</p>
                </div>
                {DOC_LABELS.map((doc) => (
                  <div
                    key={doc.type}
                    id={`document-${doc.type}`}
                    className={cn(
                      "rounded-xl border border-slate-200 p-4",
                      fieldErrors[`documents.${doc.type}`] && "border-red-300 bg-red-50/40"
                    )}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="inline-flex items-center gap-1 font-medium text-slate-900">
                        <span>{doc.label}</span>
                        {(doc.required || (doc.type === "cr12" && form.registrationTypeConfirmed === "limited_company")) && (
                          <span className="text-red-500">*</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.required && <Badge variant="outline">Required</Badge>}
                        {data.documents.find((item) => item.documentType === doc.type)?.isVerified && (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Verified</Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <KycDocumentUploader
                        label={doc.label}
                        description={doc.required ? "Required before KYC can be submitted." : "Optional supporting document."}
                        value={documents[doc.type]?.fileUrl ?? ""}
                        fileName={documents[doc.type]?.fileName ?? ""}
                        disabled={isLocked || isPending}
                        onUploaded={({ fileUrl, fileName }) =>
                          setDocumentValue(doc.type, {
                            ...documents[doc.type],
                            fileUrl,
                            fileName,
                            documentNumber: documents[doc.type]?.documentNumber || buildDocumentNumber(doc.type),
                          })
                        }
                        onRemove={() =>
                          setDocumentValue(doc.type, {
                            fileUrl: "",
                            fileName: "",
                            documentNumber: "",
                            notes: "",
                          })
                        }
                      />
                      {renderFieldError(`documents.${doc.type}`)}
                      {documents[doc.type]?.fileName && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          Stored file name: <span className="font-medium text-slate-800">{documents[doc.type]?.fileName}</span>
                        </div>
                      )}
                      <Input
                        placeholder="Notes"
                        value={documents[doc.type]?.notes ?? ""}
                        onChange={(e) =>
                          setDocumentValue(doc.type, {
                            ...documents[doc.type],
                            notes: e.target.value,
                          })
                        }
                        disabled={isLocked || isPending}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleSaveDraft} disabled={isPending}>Save Draft</Button>
                <Button onClick={handleSubmit} disabled={isPending}>
                  {isNeedsInfoState ? "Update and Resubmit" : "Submit for Review"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {submittedValues.map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="mt-1 font-medium text-slate-900 capitalize">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-900">Submitted Documents</h3>
                  <p className="text-sm text-slate-500">These are the files currently attached to your KYC submission.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {DOC_LABELS.filter((doc) => documents[doc.type]?.fileUrl).map((doc) => (
                    <div key={doc.type} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-slate-900">{doc.label}</p>
                        {data.documents.find((item) => item.documentType === doc.type)?.isVerified && (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Verified</Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {documents[doc.type]?.fileName || "Uploaded document"}
                      </p>
                      <a
                        href={getDocumentViewerHref(
                          documents[doc.type]?.fileUrl ?? "",
                          documents[doc.type]?.fileName ?? "",
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm text-blue-700 underline underline-offset-4"
                      >
                        View document
                      </a>
                      {documents[doc.type]?.notes && (
                        <p className="mt-2 text-sm text-slate-500">Notes: {documents[doc.type]?.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {data.fieldChanges.length > 0 && canEditKyc && (
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
