"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileText, Loader2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import type { MelMonitoringEvidence } from "@/db/schema";
import type { MelMonitoringDetail } from "@/lib/actions/mel-monitoring";
import { attachMelMonitoringEvidenceAction, removeMelMonitoringEvidenceAction } from "@/lib/actions/mel-monitoring";
import { MONITORING_QUESTIONS, type MonitoringQuestionCode } from "@/lib/mel/monitoring-question-catalog";
import { useUploadThing } from "@/utils/uploadthing";
import { Button } from "@/components/ui/button";

const ACCEPTED_FILES = ".pdf,.doc,.docx,.xls,.xlsx,.csv,image/*";

export function QuestionEvidence({
  submissionId,
  questionCode,
  evidence,
  locked,
  stale = false,
}: {
  submissionId: number;
  questionCode: MonitoringQuestionCode;
  evidence: MelMonitoringEvidence[];
  locked: boolean;
  stale?: boolean;
}) {
  const matching = evidence.filter((item) => item.questionCode === questionCode);
  return (
    <div className={`mt-3 rounded-md p-3 ${stale ? "border border-amber-300 bg-amber-50" : "bg-slate-50"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-900">Supporting evidence</p>
          <p className="text-xs text-slate-600">
            {stale ? "This answer is No, but evidence is still attached. Remove it before submitting." : "Attach the proof for this answer."}
          </p>
        </div>
        {stale ? <AlertTriangle className="size-5 text-amber-700" aria-hidden="true" /> : null}
      </div>
      <EvidenceManager submissionId={submissionId} questionCode={questionCode} evidence={matching} locked={locked} compact />
    </div>
  );
}

export function MonitoringEvidenceSummary({
  submissionId,
  evidence,
  references,
  locked,
}: {
  submissionId: number;
  evidence: MelMonitoringEvidence[];
  references: MelMonitoringDetail["evidenceReferences"];
  locked: boolean;
}) {
  const codes = [...new Set(evidence.map((item) => item.questionCode))] as MonitoringQuestionCode[];
  if (codes.length === 0 && references.length === 0) {
    return <p className="text-sm text-slate-600">No evidence is attached or reused yet. Add evidence under the relevant question above.</p>;
  }
  return (
    <div className="space-y-4">
      {codes.map((code) => (
        <div key={code}>
          <p className="mb-2 text-sm font-medium text-slate-900">
            {MONITORING_QUESTIONS[code]?.label ?? code.replaceAll("_", " ")}
          </p>
          <EvidenceManager
            submissionId={submissionId}
            questionCode={code}
            evidence={evidence.filter((item) => item.questionCode === code)}
            locked={locked}
            compact
          />
        </div>
      ))}
      {references.map((reference) => (
        <div key={reference.id} className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-medium text-emerald-950">
            Reused: {MONITORING_QUESTIONS[reference.questionCode as MonitoringQuestionCode]?.label ?? reference.questionCode}
          </p>
          <a className="mt-1 inline-flex items-center gap-2 text-sm text-brand-blue hover:underline" href={reference.sourceEvidence.fileUrl} target="_blank" rel="noreferrer">
            <FileText className="size-4" /> {reference.sourceEvidence.fileName}
          </a>
          <p className="mt-1 text-xs text-emerald-900">
            Approved in {reference.sourcePeriod.label} · submission #{reference.sourceSubmission.id}
          </p>
        </div>
      ))}
    </div>
  );
}

function EvidenceManager({
  submissionId,
  questionCode,
  evidence,
  locked,
  compact,
}: {
  submissionId: number;
  questionCode: MonitoringQuestionCode;
  evidence: MelMonitoringEvidence[];
  locked: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const replacementRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [removalReasons, setRemovalReasons] = useState<Record<number, string>>({});
  const [pending, startTransition] = useTransition();
  const { startUpload, isUploading } = useUploadThing("melEvidenceUploader", {
    uploadProgressGranularity: "fine",
    onUploadProgress: setProgress,
    onClientUploadComplete: (files) => {
      startTransition(async () => {
        for (const file of files ?? []) {
          const result = await attachMelMonitoringEvidenceAction({
            submissionId,
            questionCode,
            fileKey: file.key,
            fileUrl: file.ufsUrl,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            replacesEvidenceId: replacementRef.current ?? undefined,
          });
          if (!result.success) {
            toast.error(result.error);
            replacementRef.current = null;
            return;
          }
        }
        replacementRef.current = null;
        setProgress(0);
        toast.success("Evidence attached");
        router.refresh();
      });
    },
    onUploadError: (error) => {
      replacementRef.current = null;
      setProgress(0);
      toast.error(error.message);
    },
  });

  const remove = (item: MelMonitoringEvidence) => {
    startTransition(async () => {
      const result = await removeMelMonitoringEvidenceAction({ evidenceId: item.id, reason: removalReasons[item.id] ?? "" });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Evidence removed");
      router.refresh();
    });
  };

  return (
    <div className={compact ? "mt-2 space-y-2" : "space-y-3"}>
      {!locked ? (
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-brand-blue focus-within:ring-offset-2">
          {isUploading || pending ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
          {isUploading ? `Uploading ${progress}%` : "Upload evidence"}
          <input
            type="file"
            className="sr-only"
            accept={ACCEPTED_FILES}
            disabled={isUploading || pending}
            onChange={(event) => {
              const files = Array.from(event.currentTarget.files ?? []);
              event.currentTarget.value = "";
              if (files.length) void startUpload(files);
            }}
          />
        </label>
      ) : null}
      {evidence.length > 0 ? (
        <ul className="divide-y rounded-md border border-slate-200 bg-white">
          {evidence.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
              <FileText className="size-4 shrink-0 text-brand-blue" />
              <a href={item.fileUrl} target="_blank" rel="noreferrer" className="min-w-40 flex-1 truncate text-sm text-brand-blue hover:underline">{item.fileName}</a>
              {!locked ? (
                <>
                  <input
                    value={removalReasons[item.id] ?? ""}
                    onChange={(event) => setRemovalReasons((current) => ({ ...current, [item.id]: event.target.value }))}
                    placeholder="Reason to remove"
                    aria-label={`Removal reason for ${item.fileName}`}
                    className="h-9 w-40 rounded-md border border-input bg-background px-2 text-xs"
                  />
                  <label className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md hover:bg-slate-100 focus-within:ring-2 focus-within:ring-brand-blue" aria-label={`Replace ${item.fileName}`}>
                    <RefreshCw className="size-4 text-slate-700" />
                    <input type="file" className="sr-only" accept={ACCEPTED_FILES} disabled={pending || isUploading} onChange={(event) => {
                      const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
                      if (!file) return; replacementRef.current = item.id; void startUpload([file]);
                    }} />
                  </label>
                  <Button type="button" variant="ghost" size="icon" disabled={pending || (removalReasons[item.id]?.trim().length ?? 0) < 5} onClick={() => remove(item)} aria-label={`Remove ${item.fileName}`}>
                    <Trash2 className="size-4 text-red-700" />
                  </Button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
