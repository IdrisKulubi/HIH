"use client";

import { useEffect, useState, useTransition } from "react";
import type { CdpEvidenceFile, CdpPlanFull } from "@/lib/actions/cdp";
import { updateCdpSessionReport, updateCdpSupportSession } from "@/lib/actions/cdp";
import { CDP_FOCUS_AREAS, CDP_FOCUS_CODES } from "@/lib/cdp/focus-areas";
import { getDocumentViewerHref } from "@/lib/document-view-url";
import { useUploadThing } from "@/utils/uploadthing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

type CdpSession = CdpPlanFull["supportSessions"][number];

function dateInputValue(value: string | Date | null | undefined) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function dateTimeLocalInputValue(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function parseFocusCodes(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/[,;\s]+/)
    .map((code) => code.trim())
    .filter((code): code is (typeof CDP_FOCUS_CODES)[number] =>
      (CDP_FOCUS_CODES as readonly string[]).includes(code)
    );
}

function parseEvidenceUrls(value: FormDataEntryValue | null) {
  const urls = String(value ?? "")
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);
  return urls.length ? urls : null;
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

export function CdpSessionEditSheet({
  planId,
  session,
  mode,
  currentUserId,
  open,
  onOpenChange,
  onSaved,
  disabled,
}: {
  planId: number;
  session: CdpSession | null;
  mode: "planning" | "reporting";
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  disabled: boolean;
}) {
  const [pending, start] = useTransition();
  const [evidenceFiles, setEvidenceFiles] = useState<CdpEvidenceFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    setEvidenceFiles(((session?.evidenceFiles as CdpEvidenceFile[] | null) ?? []));
  }, [session]);

  const { startUpload, isUploading } = useUploadThing("cdpEvidenceUploader", {
    uploadProgressGranularity: "fine",
    onUploadProgress: setUploadProgress,
    onClientUploadComplete: (result) => {
      const uploaded = (result ?? []).reduce<CdpEvidenceFile[]>((files, file) => {
        const url = file.serverData?.fileUrl ?? file.ufsUrl;
        if (!url) return files;
        files.push({
          url,
          name: file.serverData?.fileName ?? file.name ?? "evidence",
          type: file.serverData?.fileType ?? file.type ?? "application/octet-stream",
          uploadedById: file.serverData?.uploadedBy ?? currentUserId,
          uploadedAt: new Date().toISOString(),
        });
        return files;
      }, []);
      setEvidenceFiles((current) => [...current, ...uploaded]);
      setUploadProgress(0);
      if (uploaded.length > 0) toast.success("Evidence uploaded");
    },
    onUploadError: (error) => {
      setUploadProgress(0);
      toast.error(error.message || "Evidence upload failed");
    },
  });

  const submitEdit = (formData: FormData) => {
    if (!session) return;

    start(async () => {
      const result =
        mode === "planning"
          ? await updateCdpSupportSession({
              planId,
              sessionId: session.id,
              focusCode: formData.get("focusCode") as (typeof CDP_FOCUS_CODES)[number],
              sessionNumber: Number(formData.get("sessionNumber")),
              sessionDate: String(formData.get("sessionDate")),
              focusCodes: parseFocusCodes(formData.get("focusCodes")),
              agenda: String(formData.get("agenda") ?? ""),
              subtopic: String(formData.get("subtopic") ?? ""),
              supportType: String(formData.get("supportType") ?? ""),
              sessionType: String(formData.get("sessionType") ?? "") as "physical" | "virtual",
              meetingLink: String(formData.get("meetingLink") ?? "") || null,
              bootcampWeek: null,
              durationHours: null,
              keyActionsAgreed: null,
              challengesRaised: null,
              nextSteps: null,
              followUpDate: null,
              evidenceNotes: null,
              evidenceUrls: null,
              evidenceFiles: null,
              initialActionDescriptions: null,
            })
          : await updateCdpSessionReport({
              planId,
              sessionId: session.id,
              durationHours: parseOptionalNumber(formData.get("durationHours")),
              keyActionsAgreed: String(formData.get("keyActionsAgreed") ?? ""),
              challengesRaised: String(formData.get("challengesRaised") ?? ""),
              nextSteps: String(formData.get("nextSteps") ?? ""),
              followUpDate: String(formData.get("followUpDate") ?? "") || null,
              evidenceNotes: String(formData.get("evidenceNotes") ?? "") || null,
              evidenceUrls: parseEvidenceUrls(formData.get("evidenceUrls")),
              evidenceFiles,
            });

      if (!result.success) {
        toast.error(result.error ?? "Failed");
        return;
      }

      toast.success(mode === "planning" ? "Session plan updated" : "Session report submitted for review");
      onOpenChange(false);
      onSaved();
    });
  };

  const isPlanning = mode === "planning";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>
            {isPlanning ? "Edit session plan" : "Complete session report"} {session?.sessionNumber ?? ""}
          </SheetTitle>
          <SheetDescription>
            {isPlanning
              ? "Set what will happen before the advisory session starts."
              : "Record the completed session outcomes and supporting evidence."}
          </SheetDescription>
        </SheetHeader>

        {session ? (
          <form
            className="space-y-6 px-6 pb-6"
            onSubmit={(event) => {
              event.preventDefault();
              submitEdit(new FormData(event.currentTarget));
            }}
          >
            {isPlanning ? (
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Code / focus area</Label>
                  <select
                    name="focusCode"
                    defaultValue={session.focusCode}
                    className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                    required
                  >
                    {CDP_FOCUS_CODES.map((code) => (
                      <option key={code} value={code}>
                        {code} - {CDP_FOCUS_AREAS[code].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Session number</Label>
                  <Input name="sessionNumber" type="number" min={1} max={999} defaultValue={session.sessionNumber} required />
                </div>
                <div className="space-y-1">
                  <Label>BDS date and time</Label>
                  <Input name="sessionDate" type="datetime-local" defaultValue={dateTimeLocalInputValue(session.sessionDate)} required />
                </div>
                <div className="space-y-1">
                  <Label>Session type</Label>
                  <select
                    name="sessionType"
                    defaultValue={session.sessionType ?? "virtual"}
                    className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="physical">Physical</option>
                    <option value="virtual">Virtual</option>
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Meeting link or physical venue</Label>
                  <Input name="meetingLink" defaultValue={session.meetingLink ?? ""} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Additional focus codes</Label>
                  <Input name="focusCodes" defaultValue={(session.focusCodes ?? []).join(", ")} placeholder="A, D" />
                </div>
                <div className="space-y-1">
                  <Label>Topic</Label>
                  <Input name="agenda" defaultValue={session.agenda ?? ""} required />
                </div>
                <div className="space-y-1">
                  <Label>Subtopic</Label>
                  <Input name="subtopic" defaultValue={session.subtopic ?? ""} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>BDS objective</Label>
                  <Textarea name="supportType" rows={3} defaultValue={session.supportType ?? ""} required />
                </div>
              </section>
            ) : (
              <section className="space-y-4">
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  <p className="font-medium">{session.agenda || `Session ${session.sessionNumber}`}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {session.focusCode} · {CDP_FOCUS_AREAS[session.focusCode].label} · {new Date(session.sessionDate).toLocaleString()}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Duration (hours)</Label>
                    <Input name="durationHours" type="number" step="0.25" min={0} defaultValue={session.durationHours ?? ""} />
                  </div>
                  <div className="space-y-1">
                    <Label>Follow-up date</Label>
                    <Input name="followUpDate" type="date" defaultValue={dateInputValue(session.followUpDate)} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Key agreed milestones</Label>
                    <Textarea name="keyActionsAgreed" rows={3} defaultValue={session.keyActionsAgreed ?? ""} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Achievements and observations</Label>
                    <Textarea name="evidenceNotes" rows={3} defaultValue={session.evidenceNotes ?? ""} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Challenges flagged</Label>
                    <Textarea name="challengesRaised" rows={3} defaultValue={session.challengesRaised ?? ""} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Next steps</Label>
                    <Textarea name="nextSteps" rows={3} defaultValue={session.nextSteps ?? ""} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Evidence URLs (one per line)</Label>
                    <Textarea name="evidenceUrls" rows={3} defaultValue={(session.evidenceUrls ?? []).join("\n")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Supporting evidence/documents</Label>
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground hover:bg-muted/50">
                    {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
                    <span>{isUploading ? `Uploading ${uploadProgress}%` : "Upload reports, photos, assessments, or plans"}</span>
                    <input
                      type="file"
                      multiple
                      className="sr-only"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,image/*"
                      disabled={isUploading || pending}
                      onChange={(event) => {
                        const files = Array.from(event.currentTarget.files ?? []);
                        event.currentTarget.value = "";
                        if (files.length > 0) void startUpload(files);
                      }}
                    />
                  </label>
                </div>

                {evidenceFiles.length > 0 ? (
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="text-xs font-medium">Evidence attached to this report</p>
                    <div className="mt-2 space-y-2">
                      {evidenceFiles.map((file, index) => (
                        <a
                          key={`${file.url}-${index}`}
                          href={getDocumentViewerHref(file.url, file.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-w-0 items-center gap-2 text-sm text-sky-700 hover:underline"
                        >
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            )}

            <SheetFooter className="sticky bottom-0 -mx-6 border-t bg-background px-6 py-4">
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={disabled || pending || isUploading}>
                  {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isPlanning ? "Save plan" : "Submit report"}
                </Button>
              </div>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
