"use client";

import { useMemo, useState } from "react";
import { useDropzone } from "@uploadthing/react";
import { useUploadThing } from "@/utils/uploadthing";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  MAX_MENTORSHIP_EVIDENCE_FILES,
  type MentorshipEvidenceFile,
} from "@/lib/mentorship/evidence";

type Props = {
  name?: string;
  value: MentorshipEvidenceFile[];
  onChange: (files: MentorshipEvidenceFile[]) => void;
  required?: boolean;
  disabled?: boolean;
  inputId?: string;
};

export function MentorshipEvidenceField({
  name = "evidenceFiles",
  value,
  onChange,
  required = false,
  disabled = false,
  inputId = "mentorship-evidence",
}: Props) {
  const [progress, setProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [urlInput, setUrlInput] = useState("");

  const hasEvidence = value.length > 0;
  const atLimit = value.length >= MAX_MENTORSHIP_EVIDENCE_FILES;
  const hiddenValue = JSON.stringify(value);

  const { startUpload, isUploading } = useUploadThing("mentorshipEvidenceUploader", {
    onUploadBegin: (currentFileName) => {
      setUploadingFileName(currentFileName);
      setProgress(0);
      setErrorMessage("");
    },
    uploadProgressGranularity: "fine",
    onUploadProgress: setProgress,
    onClientUploadComplete: (res) => {
      setProgress(100);
      if (!res?.length) {
        setErrorMessage("Upload completed but no files were returned.");
        return;
      }

      const uploaded = res
        .map((item): MentorshipEvidenceFile | null => {
          const fileUrl = item?.serverData?.fileUrl ?? item?.ufsUrl;
          if (!fileUrl) return null;
          return {
            key: item?.serverData?.fileKey,
            url: fileUrl,
            name: item?.name ?? item?.serverData?.fileName ?? "Evidence",
            type: item?.serverData?.fileType ?? item?.type ?? "application/octet-stream",
            uploadedById: null,
            uploadedAt: new Date().toISOString(),
          };
        })
        .filter((item): item is MentorshipEvidenceFile => item !== null);

      if (uploaded.length === 0) {
        setErrorMessage("Upload completed but no file URLs were returned.");
        return;
      }

      setUrlInput("");
      setErrorMessage("");
      onChange([...value, ...uploaded].slice(0, MAX_MENTORSHIP_EVIDENCE_FILES));
    },
    onUploadError: (error) => {
      setProgress(0);
      setErrorMessage(error.message || "Upload failed. Please try again.");
    },
  });

  const handleFiles = async (files: File[]) => {
    if (disabled || files.length === 0 || atLimit) return;
    const remaining = MAX_MENTORSHIP_EVIDENCE_FILES - value.length;
    setErrorMessage("");
    setProgress(0);
    await startUpload(files.slice(0, remaining));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
    },
    maxFiles: MAX_MENTORSHIP_EVIDENCE_FILES,
    multiple: true,
    disabled: disabled || isUploading || atLimit,
    onDrop: (acceptedFiles) => {
      void handleFiles(acceptedFiles);
    },
  });

  const containerClassName = useMemo(() => {
    if (disabled) return "border-slate-200 bg-slate-50";
    if (isUploading) return "border-sky-200 bg-sky-50";
    if (hasEvidence) return "border-emerald-200 bg-emerald-50/60";
    if (errorMessage) return "border-red-200 bg-red-50";
    if (isDragActive) return "border-sky-300 bg-sky-100/70";
    if (atLimit) return "border-slate-200 bg-slate-50";
    return "border-dashed border-slate-300 bg-slate-50/80 hover:border-sky-300 hover:bg-sky-50/50";
  }, [atLimit, disabled, errorMessage, hasEvidence, isDragActive, isUploading]);

  const applyPastedUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed || atLimit) return;
    setErrorMessage("");
    onChange([
      ...value,
      {
        url: trimmed,
        name: trimmed,
        type: "application/octet-stream",
        uploadedById: null,
        uploadedAt: new Date().toISOString(),
      },
    ]);
    setUrlInput("");
  };

  const removeFile = (index: number) => {
    setErrorMessage("");
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <input
        type="hidden"
        name={name}
        value={hiddenValue}
        required={required && value.length === 0}
      />
      <Label htmlFor={inputId}>
        Photographic evidence
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <p className="text-xs text-muted-foreground">
        {required
          ? "Required for physical sessions — upload photos or PDFs, or paste links."
          : "Optional — upload photos or PDFs, or paste links."}{" "}
        Up to {MAX_MENTORSHIP_EVIDENCE_FILES} files.
      </p>

      {value.length > 0 ? (
        <ul className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
          {value.map((file, index) => (
            <li
              key={`${file.url}-${index}`}
              className="flex items-start justify-between gap-2 rounded-md border border-emerald-100 bg-white/80 p-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-emerald-900">{file.name}</p>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-700 underline underline-offset-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <ExternalLink className="size-3" />
                      Open evidence
                    </a>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 px-2 text-red-700 hover:bg-red-100 hover:text-red-800"
                disabled={disabled || isUploading}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  removeFile(index);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <div
        {...getRootProps()}
        className={`relative rounded-lg border p-3 transition-all ${containerClassName} ${
          disabled || isUploading || atLimit ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <input {...getInputProps()} id={inputId} />

        {isUploading ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-sky-900">
              <Loader2 className="size-4 shrink-0 animate-spin" />
              <span className="truncate">Uploading {uploadingFileName || "files…"}</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        ) : atLimit ? (
          <p className="text-sm text-slate-600">
            Maximum of {MAX_MENTORSHIP_EVIDENCE_FILES} evidence files reached. Remove one to add
            more.
          </p>
        ) : errorMessage ? (
          <div className="flex items-start gap-2 text-sm text-red-800">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-1">
            <div className="rounded-full bg-white p-2 shadow-sm">
              <UploadCloud className="size-5 text-sky-600" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-medium text-slate-800">
                {isDragActive ? "Drop files here" : "Drag & drop or click to add files"}
              </p>
              <p className="text-xs text-muted-foreground">
                Image or PDF · max 8–16 MB · {value.length}/{MAX_MENTORSHIP_EVIDENCE_FILES} added
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="Or paste evidence URL…"
          value={urlInput}
          disabled={disabled || isUploading || atLimit}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyPastedUrl();
            }
          }}
          className="h-9 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={disabled || isUploading || atLimit || !urlInput.trim()}
          onClick={applyPastedUrl}
        >
          Add URL
        </Button>
      </div>
    </div>
  );
}
