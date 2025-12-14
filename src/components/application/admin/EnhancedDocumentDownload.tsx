"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2 } from "lucide-react";
import { downloadEnhancedApplicationDOCX } from "@/lib/actions/enhanced-export";
import { toast } from "sonner";

interface EnhancedDocumentDownloadProps {
  applicationId: number;
  applicantName: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

// Helper to decode base64 and create blob
const base64ToBlob = (base64: string, contentType: string): Blob => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: contentType });
};

export function EnhancedDocumentDownload({
  applicationId,
  variant = "outline",
  size = "default",
  className = ""
}: EnhancedDocumentDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      const result = await downloadEnhancedApplicationDOCX(applicationId);

      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to generate document");
        return;
      }

      // Decode base64 and create blob
      const blob = base64ToBlob(result.data.base64, result.data.contentType);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Application review document downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isDownloading}
      variant={variant}
      size={size}
      className={className}
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download Enhanced Review
        </>
      )}
    </Button>
  );
}

// Alternative compact version for use in tables or lists
export function CompactEnhancedDocumentDownload({
  applicationId,
  applicantName
}: {
  applicationId: number;
  applicantName: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);

      const result = await downloadEnhancedApplicationDOCX(applicationId);

      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to generate document");
        return;
      }

      // Decode base64 and create blob
      const blob = base64ToBlob(result.data.base64, result.data.contentType);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Enhanced review document downloaded");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isDownloading}
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-700"
      title={`Download enhanced review for ${applicantName}`}
    >
      {isDownloading ? (
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      ) : (
        <FileText className="h-4 w-4 text-blue-600" />
      )}
    </Button>
  );
}
