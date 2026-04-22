"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KycDocumentUploader } from "@/components/kyc/KycDocumentUploader";
import { saveReviewerKycDocuments, saveReviewerKycGeolocation } from "@/lib/actions";
import { getDocumentViewerHref } from "@/lib/document-view-url";
import type { ApplicationPhaseDocument } from "@/lib/kyc-application-documents";
import {
  getKycDocumentLabel,
  reviewerKycDocumentDefinitions,
  type ReviewerKycDocumentType,
} from "@/lib/kyc/constants";
import { cn } from "@/lib/utils";

interface UploadedDocumentState {
  fileUrl: string;
  fileName: string;
  documentNumber: string;
  notes: string;
}

interface ReviewerKycDetailClientProps {
  data: {
    application: {
      id: number;
      status: string;
      track: string | null;
      kycStatus: string;
    };
    profile: {
      id: number;
      status: string;
      profileLockStatus: string;
      gpsCoordinates: string | null;
      allocatedStaff: string | null;
      hubName: string | null;
      reviewNotes: string | null;
      rejectionReason: string | null;
      needsInfoReason: string | null;
    };
    business: {
      name: string;
      sector: string | null;
      sectorOther: string | null;
      county: string | null;
      city: string;
      revenueLastYear: string | null;
      fullTimeEmployeesTotal: number | null;
    };
    applicant: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber: string;
    };
    applicationDocuments: ApplicationPhaseDocument[];
    documents: Array<{
      documentType: string;
      fileUrl: string;
      fileName?: string | null;
      documentNumber?: string | null;
      notes?: string | null;
      isVerified?: boolean;
    }>;
  };
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) return "Not captured";
  return value.replace(/_/g, " ");
}

function buildDocumentNumber(documentType: string) {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${documentType.toUpperCase()}-${timestamp}`;
}

export function ReviewerKycDetailClient({ data }: ReviewerKycDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLocating, setIsLocating] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState(data.profile.gpsCoordinates ?? "");
  const [locationMessage, setLocationMessage] = useState(
    data.profile.gpsCoordinates ? "Saved geolocation is available." : ""
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [allocatedStaff, setAllocatedStaff] = useState(data.profile.allocatedStaff ?? "");
  const [hubName, setHubName] = useState(data.profile.hubName ?? "");

  const existingDocuments = useMemo(
    () =>
      Object.fromEntries(
        data.documents.map((document) => [
          document.documentType,
          {
            fileUrl: document.fileUrl,
            fileName: document.fileName ?? "",
            documentNumber: document.documentNumber ?? "",
            notes: document.notes ?? "",
          },
        ])
      ) as Record<string, UploadedDocumentState>,
    [data.documents]
  );

  const [documents, setDocuments] = useState<Record<ReviewerKycDocumentType, UploadedDocumentState>>({
    letter_of_agreement: existingDocuments.letter_of_agreement ?? {
      fileUrl: "",
      fileName: "",
      documentNumber: "",
      notes: "",
    },
    national_id_document: existingDocuments.national_id_document ?? {
      fileUrl: "",
      fileName: "",
      documentNumber: "",
      notes: "",
    },
    cr12: existingDocuments.cr12 ?? {
      fileUrl: "",
      fileName: "",
      documentNumber: "",
      notes: "",
    },
  });

  const isLocked =
    data.profile.profileLockStatus === "locked" ||
    data.profile.profileLockStatus === "change_requested" ||
    data.profile.status === "verified" ||
    data.profile.status === "rejected";

  const saveDocumentValue = (documentType: ReviewerKycDocumentType, value: UploadedDocumentState) => {
    setDocuments((current) => ({ ...current, [documentType]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[`documents.${documentType}`];
      return next;
    });
  };

  const serializeDocuments = () =>
    reviewerKycDocumentDefinitions
      .map((document) => ({
        documentType: document.type,
        fileUrl: documents[document.type].fileUrl.trim(),
        fileName: documents[document.type].fileName.trim() || undefined,
        documentNumber: documents[document.type].documentNumber.trim() || undefined,
        notes: documents[document.type].notes.trim() || undefined,
      }))
      .filter((document) => document.fileUrl);

  const handleSaveDocuments = () => {
    const payload = serializeDocuments();
    if (!payload.length) {
      toast.error("Upload at least one document before saving.");
      return;
    }

    startTransition(async () => {
      const result = await saveReviewerKycDocuments({
        applicationId: data.application.id,
        documents: payload,
        allocatedStaff: allocatedStaff.slice(0, 255),
        hubName: hubName.slice(0, 255),
      });

      if (!result.success) {
        toast.error(result.error || "Failed to save KYC details");
        return;
      }

      setFieldErrors({});
      toast.success(result.message || "KYC details saved");
      router.refresh();
    });
  };

  const handleSaveGeolocation = () => {
    const nextValue = gpsCoordinates.trim();
    if (!nextValue) {
      setFieldErrors((current) => ({ ...current, gpsCoordinates: "Geolocation is required." }));
      toast.error("Enter a geolocation value or capture your current location.");
      return;
    }

    startTransition(async () => {
      const result = await saveReviewerKycGeolocation({
        applicationId: data.application.id,
        gpsCoordinates: nextValue,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to save geolocation");
        return;
      }

      setFieldErrors((current) => {
        const next = { ...current };
        delete next.gpsCoordinates;
        return next;
      });
      setLocationMessage("Geolocation saved.");
      toast.success(result.message || "Geolocation saved");
      router.refresh();
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported on this device or browser.");
      return;
    }

    setIsLocating(true);
    setLocationMessage("Getting your current location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        setGpsCoordinates(coordinates);
        setFieldErrors((current) => {
          const next = { ...current };
          delete next.gpsCoordinates;
          return next;
        });
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
              ? "We could not detect the current location right now."
              : "Location request timed out. Please try again.";
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
      {(data.profile.needsInfoReason || data.profile.rejectionReason || data.profile.reviewNotes) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">Admin Feedback</CardTitle>
            <CardDescription className="text-amber-800">
              Review the latest verification feedback before making another update.
            </CardDescription>
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
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Business Summary</CardTitle>
              <CardDescription>
                Review the submitted application context before adding the missing KYC documents.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Application #{data.application.id}</Badge>
              <Badge variant="secondary" className="capitalize">{data.application.status.replace(/_/g, " ")}</Badge>
              <Badge className="capitalize bg-blue-100 text-blue-700 hover:bg-blue-100">
                {data.profile.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Business</p>
            <p className="mt-1 font-semibold text-slate-900">{data.business.name}</p>
            <p className="text-sm text-slate-600 capitalize">{formatEnumLabel(data.application.track)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Owner</p>
            <p className="mt-1 font-semibold text-slate-900">
              {data.applicant.firstName} {data.applicant.lastName}
            </p>
            <p className="text-sm text-slate-600">{data.applicant.phoneNumber}</p>
            <p className="text-sm text-slate-600">{data.applicant.email}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Location</p>
            <p className="mt-1 font-semibold text-slate-900 capitalize">{formatEnumLabel(data.business.county)}</p>
            <p className="text-sm text-slate-600">{data.business.city}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Sector</p>
            <p className="mt-1 font-semibold text-slate-900 capitalize">{formatEnumLabel(data.business.sector)}</p>
            {data.business.sector === "other" && data.business.sectorOther && (
              <p className="text-sm text-slate-600">{data.business.sectorOther}</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Revenue Baseline</p>
            <p className="mt-1 font-semibold text-slate-900">{data.business.revenueLastYear ?? "Not captured"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Employees</p>
            <p className="mt-1 font-semibold text-slate-900">{data.business.fullTimeEmployeesTotal ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application Documents</CardTitle>
          <CardDescription>
            These files were already uploaded during the call for applications and are shown here as reference.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.applicationDocuments.length === 0 ? (
            <p className="text-sm text-slate-500">No application documents were stored for this business.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.applicationDocuments.map((document) => (
                <div key={document.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-medium text-slate-900">{document.label}</p>
                  <a
                    href={getDocumentViewerHref(document.fileUrl, document.fileName ?? "")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-blue-700 underline underline-offset-4"
                  >
                    View document
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Programme assignment</CardTitle>
          <CardDescription>
            Enter the names here as the reviewer (this is not pulled from the application). These values are saved when you use Save KYC Details below.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="allocatedStaff">Allocated staff</Label>
            <Input
              id="allocatedStaff"
              placeholder="Name of allocated staff for this business"
              value={allocatedStaff}
              onChange={(e) => setAllocatedStaff(e.target.value)}
              disabled={isLocked || isPending}
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hubName">Hub</Label>
            <Input
              id="hubName"
              placeholder="Hub where the business is located"
              value={hubName}
              onChange={(e) => setHubName(e.target.value)}
              disabled={isLocked || isPending}
              maxLength={255}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reviewer KYC Documents</CardTitle>
          <CardDescription>
            You can save National ID or CR12 before the Letter of Agreement. The letter is required before the KYC package is marked complete for admin review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reviewerKycDocumentDefinitions.map((document) => (
            <div
              key={document.type}
              className={cn(
                "rounded-xl border border-slate-200 p-4",
                fieldErrors[`documents.${document.type}`] && "border-red-300 bg-red-50/40"
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {document.label}
                    {document.required ? <span className="ml-1 text-red-500">*</span> : null}
                  </p>
                  <p className="text-sm text-slate-500">{document.description}</p>
                </div>
                {data.documents.find((item) => item.documentType === document.type)?.isVerified && (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Verified</Badge>
                )}
              </div>

              <div className="space-y-3">
                <KycDocumentUploader
                  label={document.label}
                  description={document.description}
                  value={documents[document.type].fileUrl}
                  fileName={documents[document.type].fileName}
                  disabled={isLocked || isPending}
                  onUploaded={({ fileUrl, fileName }) =>
                    saveDocumentValue(document.type, {
                      ...documents[document.type],
                      fileUrl,
                      fileName,
                      documentNumber: documents[document.type].documentNumber || buildDocumentNumber(document.type),
                    })
                  }
                  onRemove={() =>
                    saveDocumentValue(document.type, {
                      fileUrl: "",
                      fileName: "",
                      documentNumber: "",
                      notes: "",
                    })
                  }
                />
                {fieldErrors[`documents.${document.type}`] && (
                  <p className="text-sm text-red-600">{fieldErrors[`documents.${document.type}`]}</p>
                )}
                <Textarea
                  placeholder={`Notes for ${document.label}`}
                  value={documents[document.type].notes}
                  onChange={(event) =>
                    saveDocumentValue(document.type, {
                      ...documents[document.type],
                      notes: event.target.value,
                    })
                  }
                  disabled={isLocked || isPending}
                />
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSaveDocuments} disabled={isLocked || isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save KYC Details
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Geolocation</CardTitle>
          <CardDescription>
            Capture the business location on-site now or save it later when the reviewer reaches the premises.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gpsCoordinates">Business Geolocation</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="gpsCoordinates"
                placeholder="Use your current location or enter coordinates manually"
                value={gpsCoordinates}
                onChange={(event) => {
                  setGpsCoordinates(event.target.value);
                  setFieldErrors((current) => {
                    const next = { ...current };
                    delete next.gpsCoordinates;
                    return next;
                  });
                }}
                disabled={isLocked || isPending || isLocating}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleUseCurrentLocation}
                disabled={isLocked || isPending || isLocating}
              >
                {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                Use Current Location
              </Button>
            </div>
            {locationMessage && <p className="text-sm text-slate-600">{locationMessage}</p>}
            {fieldErrors.gpsCoordinates && <p className="text-sm text-red-600">{fieldErrors.gpsCoordinates}</p>}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleSaveGeolocation} disabled={isLocked || isPending || isLocating}>
              Save Geolocation
            </Button>
          </div>
        </CardContent>
      </Card>

      {data.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved KYC Uploads</CardTitle>
            <CardDescription>Current files on the KYC record.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {data.documents.map((document) => (
              <div key={`${document.documentType}-${document.fileUrl}`} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{getKycDocumentLabel(document.documentType)}</p>
                  {document.isVerified ? (
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Verified</Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-600">{document.fileName || "Uploaded document"}</p>
                <a
                  href={getDocumentViewerHref(document.fileUrl, document.fileName ?? "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-blue-700 underline underline-offset-4"
                >
                  View document
                </a>
                {document.notes ? <p className="mt-2 text-sm text-slate-500">{document.notes}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
