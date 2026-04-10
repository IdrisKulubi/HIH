"use client";

import { useMemo, useState } from "react";
import { useDropzone } from "@uploadthing/react";
import { useUploadThing } from "@/utils/uploadthing";
import { getDocumentViewerHref } from "@/lib/document-view-url";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Trash2, UploadCloud } from "lucide-react";

type Props = {
  label: string;
  description?: string;
  value?: string;
  fileName?: string;
  disabled?: boolean;
  onUploaded: (payload: {
    fileUrl: string;
    fileName: string;
  }) => void;
  onRemove: () => void;
};

export function KycDocumentUploader({
  label,
  description,
  value,
  fileName,
  disabled = false,
  onUploaded,
  onRemove,
}: Props) {
  const [progress, setProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const hasFile = !!value;

  const { startUpload, isUploading } = useUploadThing("kycDocumentUploader", {
    onUploadBegin: (currentFileName) => {
      setUploadingFileName(currentFileName);
      setProgress(0);
      setErrorMessage("");
    },
    uploadProgressGranularity: "fine",
    onUploadProgress: (currentProgress) => {
      setProgress(currentProgress);
    },
    onClientUploadComplete: (res) => {
      const uploaded = res?.[0];
      const fileUrl = uploaded?.serverData?.fileUrl ?? uploaded?.ufsUrl;
      const resolvedFileName = uploaded?.name ?? uploaded?.serverData?.fileName ?? "document";

      setProgress(100);
      setUploadingFileName(resolvedFileName);

      if (!fileUrl) {
        setErrorMessage("Upload completed but no file URL was returned.");
        return;
      }

      onUploaded({ fileUrl, fileName: resolvedFileName });
    },
    onUploadError: (error) => {
      console.error("KYC upload error:", error);
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
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
    multiple: false,
    disabled,
    onDrop: (acceptedFiles) => {
      void handleFiles(acceptedFiles);
    },
  });

  const containerClassName = useMemo(() => {
    if (disabled) return "border-slate-200 bg-slate-50";
    if (isUploading) return "border-blue-200 bg-blue-50";
    if (hasFile) return "border-emerald-200 bg-emerald-50";
    if (errorMessage) return "border-red-200 bg-red-50";
    if (isDragActive) return "border-blue-300 bg-blue-100/70";
    return "border-dashed border-blue-200 bg-blue-50/40 hover:bg-blue-50/70";
  }, [disabled, errorMessage, hasFile, isDragActive, isUploading]);

  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium text-slate-900">{label}</p>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>

      <div
        {...getRootProps()}
        className={`relative min-h-[176px] rounded-2xl border p-4 shadow-none transition-all ${containerClassName} ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Uploading document</p>
                  <p className="text-xs text-blue-800/80">{uploadingFileName || "Preparing upload..."}</p>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{progress}%</Badge>
            </div>
            <Progress value={progress} className="h-2 bg-blue-100" indicatorClassName="bg-blue-600" />
          </div>
        ) : hasFile ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-900">Document uploaded</p>
                  <p className="text-xs text-emerald-800/80">{fileName || "Uploaded file"}</p>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Ready</Badge>
            </div>
            <a
              href={getDocumentViewerHref(value, fileName ?? "")}
              target="_blank"
              rel="noopener noreferrer"
              className="block break-all text-sm text-emerald-700 underline underline-offset-4"
              onClick={(event) => event.stopPropagation()}
            >
              Open / preview file
            </a>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-emerald-800/80">Click this area to replace the file.</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-700 hover:bg-red-100 hover:text-red-800"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setErrorMessage("");
                  setProgress(0);
                  setUploadingFileName("");
                  onRemove();
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">Upload failed</p>
                <p className="text-xs text-red-800/80">{errorMessage}</p>
              </div>
            </div>
            <p className="text-sm text-red-800">Drag and drop a file here, or click to try again.</p>
          </div>
        ) : (
          <div className="flex h-full min-h-[144px] flex-col items-center justify-center space-y-3 text-center">
            <div className="rounded-full bg-white/80 p-3 shadow-sm">
              <UploadCloud className="h-6 w-6 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-800">
                {isDragActive ? "Drop file to upload" : "Drag and drop a file here, or click to select"}
              </p>
              <p className="text-xs text-slate-500">PDF, DOC, or DOCX up to 8MB</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
