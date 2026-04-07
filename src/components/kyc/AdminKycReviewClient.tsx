"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { reviewKycSubmission, reviewKycChangeRequest } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Props = {
  applicationId: number;
  profileStatus: string;
  documents: Array<{
    id?: number;
    documentType: string;
    fileUrl: string;
    isVerified?: boolean;
    notes?: string | null;
  }>;
  fieldChanges: Array<{
    fieldName: string;
    oldValue: unknown;
    newValue: unknown;
    isCoreField: boolean;
  }>;
  changeRequests: Array<{
    id: number;
    fieldName: string;
    currentValue: unknown;
    requestedValue: unknown;
    reason: string;
    status: string;
    reviewNotes?: string | null;
  }>;
};

export function AdminKycReviewClient({ applicationId, profileStatus, documents, fieldChanges, changeRequests }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [reviewNotes, setReviewNotes] = useState("");
  const [reason, setReason] = useState("");

  const submitDecision = (action: "verify" | "needs_info" | "reject") => {
    startTransition(async () => {
      const result = await reviewKycSubmission({
        applicationId,
        action,
        reviewNotes,
        reason,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to save review");
        return;
      }

      toast.success(result.message || "Review saved");
      setReason("");
      router.refresh();
    });
  };

  const reviewChange = (requestId: number, action: "approved" | "rejected") => {
    startTransition(async () => {
      const result = await reviewKycChangeRequest(requestId, action, reviewNotes);
      if (!result.success) {
        toast.error(result.error || "Failed to review change request");
        return;
      }
      toast.success(result.message || "Change request reviewed");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>KYC Review Decision</CardTitle>
              <CardDescription>Approve the enterprise, request more information, or reject the submission.</CardDescription>
            </div>
            <Badge className="capitalize bg-blue-100 text-blue-700 hover:bg-blue-100">{profileStatus.replace(/_/g, " ")}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reviewNotes">Review Notes</Label>
            <Textarea id="reviewNotes" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} disabled={isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reviewReason">Reason for Needs Info / Rejection</Label>
            <Textarea id="reviewReason" value={reason} onChange={(e) => setReason(e.target.value)} disabled={isPending} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => submitDecision("verify")} disabled={isPending}>Verify & Lock</Button>
            <Button variant="outline" onClick={() => submitDecision("needs_info")} disabled={isPending}>Request Info</Button>
            <Button variant="destructive" onClick={() => submitDecision("reject")} disabled={isPending}>Reject</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submitted Documents</CardTitle>
          <CardDescription>Review uploaded KYC links and supporting notes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.map((doc) => (
            <div key={`${doc.documentType}-${doc.fileUrl}`} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{doc.documentType.replace(/_/g, " ")}</p>
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline underline-offset-4">
                    {doc.fileUrl}
                  </a>
                </div>
                {doc.isVerified && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Verified</Badge>}
              </div>
              {doc.notes && <p className="mt-2 text-sm text-slate-600">{doc.notes}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detected Field Changes</CardTitle>
          <CardDescription>These are the deltas between the original application and the KYC submission.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {fieldChanges.length === 0 ? (
            <p className="text-sm text-slate-500">No tracked field changes yet.</p>
          ) : (
            fieldChanges.map((change) => (
              <div key={change.fieldName} className="rounded-xl border border-slate-200 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">{change.fieldName}</p>
                  <Badge variant={change.isCoreField ? "default" : "outline"}>{change.isCoreField ? "Core field" : "Supplementary"}</Badge>
                </div>
                <p className="mt-2 text-slate-600">Old: {String(change.oldValue ?? "empty")}</p>
                <p className="text-slate-900">New: {String(change.newValue ?? "empty")}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Locked Profile Change Requests</CardTitle>
          <CardDescription>Review change requests raised after verification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {changeRequests.length === 0 ? (
            <p className="text-sm text-slate-500">No change requests submitted.</p>
          ) : (
            changeRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">{request.fieldName}</p>
                  <Badge variant="outline" className="capitalize">{request.status}</Badge>
                </div>
                <p className="mt-2 text-slate-600">Current: {String(request.currentValue ?? "empty")}</p>
                <p className="text-slate-900">Requested: {String(request.requestedValue ?? "empty")}</p>
                <p className="mt-2 text-slate-600">{request.reason}</p>
                {request.status === "pending" && (
                  <div className="mt-3 flex gap-3">
                    <Button size="sm" onClick={() => reviewChange(request.id, "approved")} disabled={isPending}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => reviewChange(request.id, "rejected")} disabled={isPending}>Reject</Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
