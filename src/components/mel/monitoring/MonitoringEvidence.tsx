"use client";

import { useState, useTransition } from "react";
import { FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import type { MelMonitoringEvidence } from "@/db/schema";
import {
  attachMelMonitoringEvidenceAction,
  removeMelMonitoringEvidenceAction,
} from "@/lib/actions/mel-monitoring";
import { useUploadThing } from "@/utils/uploadthing";
import { Button } from "@/components/ui/button";

const QUESTION_OPTIONS = [
  ["business_plan_improved", "Improved business plan"],
  ["jobs", "Jobs created"],
  ["market_research_completed", "Market research"],
  ["technology_adopted", "Technology or innovation"],
  ["new_products_developed", "New products or services"],
  ["linked_to_finance_provider", "Financial linkage"],
  ["financial_plan_completed", "Financial plan"],
  ["active_insurance", "Insurance"],
  ["life_cycle_assessment_completed", "Life-cycle assessment"],
  ["eco_certification_active", "Eco-certification"],
  ["esg_report_completed", "ESG report"],
  ["social_safeguarding_guidelines", "Social safeguarding"],
  ["circular_growth_reported", "Circular growth"],
  ["waste", "Waste collected and recycled"],
  ["strategic_partnerships", "Strategic partnership"],
  ["forum_participation", "Forum participation"],
  ["public_private_partnership", "Public-private partnership"],
] as const;

export function MonitoringEvidence({
  submissionId,
  evidence,
  locked,
}: {
  submissionId: number;
  evidence: MelMonitoringEvidence[];
  locked: boolean;
}) {
  const [questionCode, setQuestionCode] = useState<string>(QUESTION_OPTIONS[0][0]);
  const [progress, setProgress] = useState(0);
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
            fileKey: file.serverData?.fileKey ?? file.key,
            fileUrl: file.serverData?.fileUrl ?? file.ufsUrl,
            fileName: file.serverData?.fileName ?? file.name,
            fileType: file.serverData?.fileType ?? file.type ?? "application/octet-stream",
            fileSize: file.serverData?.fileSize ?? file.size,
          });
          if (!result.success) {
            toast.error(result.error ?? "Could not attach evidence");
            return;
          }
        }
        setProgress(0);
        toast.success("Evidence attached");
      });
    },
    onUploadError: (error) => {
      setProgress(0);
      toast.error(error.message || "Evidence upload failed");
    },
  });

  const remove = (id: number) => {
    startTransition(async () => {
      const result = await removeMelMonitoringEvidenceAction(id);
      result.success ? toast.success("Evidence removed") : toast.error(result.error ?? "Could not remove evidence");
    });
  };

  return (
    <div className="space-y-4">
      {!locked ? (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <div className="space-y-1.5">
            <label htmlFor="evidence-question" className="text-sm font-medium">Evidence supports</label>
            <select
              id="evidence-question"
              value={questionCode}
              onChange={(event) => setQuestionCode(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {QUESTION_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <label className="flex cursor-pointer items-center justify-center gap-3 rounded-md border border-dashed bg-slate-50 px-4 py-4 text-sm text-slate-600 hover:bg-slate-100">
            {isUploading || pending ? <Loader2 className="size-5 animate-spin" /> : <UploadCloud className="size-5" />}
            <span>{isUploading ? `Uploading ${progress}%` : pending ? "Attaching evidence…" : "Choose evidence files"}</span>
            <input
              type="file"
              multiple
              className="sr-only"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,image/*"
              disabled={isUploading || pending}
              onChange={(event) => {
                const files = Array.from(event.currentTarget.files ?? []);
                event.currentTarget.value = "";
                if (files.length) void startUpload(files);
              }}
            />
          </label>
        </div>
      ) : null}

      {evidence.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {evidence.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileText className="size-4 shrink-0 text-brand-blue" />
              <a href={item.fileUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-brand-blue hover:underline">
                {item.fileName}
              </a>
              <span className="hidden text-xs text-slate-500 sm:inline">{item.questionCode.replaceAll("_", " ")}</span>
              {!locked ? (
                <Button type="button" variant="ghost" size="icon" disabled={pending} onClick={() => remove(item.id)} aria-label={`Remove ${item.fileName}`}>
                  <Trash2 className="size-4 text-red-600" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-slate-500">No evidence attached yet.</p>}
    </div>
  );
}
