"use client";

import { useMemo, useState } from "react";
import { useDropzone } from "@uploadthing/react";
import { useUploadThing } from "@/utils/uploadthing";
import { getDocumentViewerHref } from "@/lib/document-view-url";
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

type Props = {
  name?: string;
  value: string;
  fileName?: string;
  onChange: (url: string, fileName?: string) => void;
  required?: boolean;
  disabled?: boolean;
  inputId?: string;
};

export function MentorshipEvidenceField({
  name = "photographicEvidenceUrl",
  value,
  fileName,
  onChange,
  required = false,
  disabled = false,
  inputId = "mentorship-evidence",
}: Props) {
  const [progress, setProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [urlInput, setUrlInput] = useState("");

  const hasEvidence = Boolean(value.trim());
  const displayName = fileName || (value ? "Uploaded evidence" : "");

  const { startUpload, isUploading } = useUploadThing("mentorshipEvidenceUploader", {
    onUploadBegin: (currentFileName) => {
      setUploadingFileName(currentFileName);
      setProgress(0);
      setErrorMessage("");
    },
    uploadProgressGranularity: "fine",
    onUploadProgress: setProgress,
    onClientUploadComplete: (res) => {
      const uploaded = res?.[0];
      const fileUrl = uploaded?.serverData?.fileUrl ?? uploaded?.ufsUrl;
      const resolvedFileName =
        uploaded?.name ?? uploaded?.serverData?.fileName ?? "evidence";

      setProgress(100);
      if (!fileUrl) {
        setErrorMessage("Upload completed but no file URL was returned.");
        return;
      }

      setUrlInput("");
      onChange(fileUrl, resolvedFileName);
    },
    onUploadError: (error) => {
      setProgress(0);
      setErrorMessage(error.message || "Upload failed. Please try again.");
    },
  });

  const handleFiles = async (files: File[]) => {
    if (disabled || files.length === 0) return;
    setErrorMessage("");
    setProgress(0);
    await startUpload(files);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
    },
    maxFiles: 1,
    multiple: false,
    disabled: disabled || isUploading,
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
    return "border-dashed border-slate-300 bg-slate-50/80 hover:border-sky-300 hover:bg-sky-50/50";
  }, [disabled, errorMessage, hasEvidence, isDragActive, isUploading]);

  const applyPastedUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setErrorMessage("");
    onChange(trimmed, trimmed);
    setUrlInput("");
  };

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={value} required={required && !value} />
      <Label htmlFor={inputId}>
        Photographic evidence
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <p className="text-xs text-muted-foreground">
        {required
          ? "Required for physical sessions — upload a photo or PDF, or paste a link."
          : "Optional — upload a photo or PDF, or paste a link."}
      </p>

      <div
        {...getRootProps()}
        className={`relative rounded-lg border p-3 transition-all ${containerClassName} ${
          disabled || isUploading ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <input {...getInputProps()} id={inputId} />

        {isUploading ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-sky-900">
              <Loader2 className="size-4 shrink-0 animate-spin" />
              <span className="truncate">Uploading {uploadingFileName || "file…"}</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        ) : hasEvidence ? (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-emerald-900">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-emerald-800/80">{value}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 px-2 text-red-700 hover:bg-red-100 hover:text-red-800"
                disabled={disabled}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setErrorMessage("");
                  setUrlInput("");
                  onChange("", undefined);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <a
              href={getDocumentViewerHref(value, displayName)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-emerald-700 underline underline-offset-2"
              onClick={(event) => event.stopPropagation()}
            >
              <ExternalLink className="size-3" />
              Open evidence
            </a>
            <p className="text-xs text-muted-foreground">Click to replace, or paste a new URL below.</p>
          </div>
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
                {isDragActive ? "Drop file here" : "Drag & drop or click to select"}
              </p>
              <p className="text-xs text-muted-foreground">Image or PDF · max 8–16 MB</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="Or paste evidence URL…"
          value={urlInput}
          disabled={disabled || isUploading}
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
          disabled={disabled || isUploading || !urlInput.trim()}
          onClick={applyPastedUrl}
        >
          Use URL
        </Button>
      </div>
    </div>
  );
}
