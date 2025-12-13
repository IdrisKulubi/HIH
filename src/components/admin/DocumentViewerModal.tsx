"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DownloadSimple, X, Spinner, Warning, ArrowSquareOut, FileDoc, FilePdf, Image as ImageIcon } from "@phosphor-icons/react";
import { useState, useEffect, useRef, useCallback } from "react";

interface DocumentViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string | null;
    filename?: string;
}

export function DocumentViewerModal({
    isOpen,
    onClose,
    url,
    filename = "Document",
}: DocumentViewerModalProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [docxHtml, setDocxHtml] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Determine file type
    const getFileType = useCallback(() => {
        if (!url) return "unknown";
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes(".pdf")) return "pdf";
        if (/\.(jpg|jpeg|png|webp|gif)$/i.test(lowerUrl)) return "image";
        if (/\.(doc|docx)$/i.test(lowerUrl)) return "docx";
        if (/\.(xls|xlsx)$/i.test(lowerUrl)) return "excel";
        if (/\.(ppt|pptx)$/i.test(lowerUrl)) return "pptx";
        return "unknown";
    }, [url]);

    const fileType = getFileType();

    // Load DOCX files using docx-preview
    useEffect(() => {
        if (!isOpen || !url || fileType !== "docx") {
            setDocxHtml(null);
            return;
        }

        const loadDocx = async () => {
            setLoading(true);
            setError(null);
            setDocxHtml(null);

            try {
                // Dynamically import docx-preview (client-side only)
                const docxPreview = await import("docx-preview");

                // Fetch the document
                const response = await fetch(url);
                if (!response.ok) throw new Error("Failed to fetch document");

                const blob = await response.blob();

                // Create a container for the rendered document
                if (containerRef.current) {
                    containerRef.current.innerHTML = "";
                    await docxPreview.renderAsync(blob, containerRef.current, undefined, {
                        className: "docx-viewer",
                        inWrapper: true,
                        ignoreWidth: false,
                        ignoreHeight: false,
                        ignoreFonts: false,
                        breakPages: true,
                        useBase64URL: true,
                    });
                    setLoading(false);
                }
            } catch (err) {
                console.error("DOCX render error:", err);
                setError("Unable to preview this document. Please download to view.");
                setLoading(false);
            }
        };

        loadDocx();
    }, [url, isOpen, fileType]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setLoading(true);
            setError(null);
            setDocxHtml(null);
        }
    }, [isOpen]);

    if (!url) return null;

    const handleImageLoad = () => {
        setLoading(false);
        setError(null);
    };

    const handleError = () => {
        setLoading(false);
        setError("Unable to preview this file. Please download to view.");
    };

    const getFileIcon = () => {
        switch (fileType) {
            case "pdf": return <FilePdf className="w-5 h-5" />;
            case "docx": return <FileDoc className="w-5 h-5" />;
            case "image": return <ImageIcon className="w-5 h-5" />;
            default: return <FileDoc className="w-5 h-5" />;
        }
    };

    const getFileLabel = () => {
        switch (fileType) {
            case "pdf": return "PDF";
            case "docx": return "DOC";
            case "excel": return "XLS";
            case "pptx": return "PPT";
            case "image": return "IMG";
            default: return "FILE";
        }
    };

    // For Excel and PPT, show download-only interface
    const isDownloadOnly = fileType === "excel" || fileType === "pptx" || fileType === "unknown";

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[90vw] w-[1200px] h-[90vh] p-0 gap-0 overflow-hidden bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl rounded-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/50 z-10 shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600 flex items-center justify-center">
                            {getFileIcon()}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-700 font-mono text-xs font-bold px-2 py-0.5 rounded">
                                {getFileLabel()}
                            </span>
                            <h2 className="text-lg font-semibold text-gray-900 truncate max-w-[300px]">
                                {filename}
                            </h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-white/80 backdrop-blur-sm border-gray-200"
                            asChild
                        >
                            <a href={url} target="_blank" rel="noopener noreferrer">
                                <ArrowSquareOut className="h-4 w-4 mr-2" />
                                Open External
                            </a>
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            asChild
                        >
                            <a href={url} download={filename}>
                                <DownloadSimple className="h-4 w-4 mr-2" />
                                Download
                            </a>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-gray-100"
                            onClick={onClose}
                        >
                            <X className="h-5 w-5 text-gray-500" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-gray-50/50 relative overflow-auto flex items-center justify-center">
                    {loading && !error && !isDownloadOnly && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-3 bg-gray-50">
                            <Spinner className="h-8 w-8 text-blue-600 animate-spin" />
                            <p className="text-sm text-gray-500">Loading document...</p>
                        </div>
                    )}

                    {(error || isDownloadOnly) && (
                        <div className="flex flex-col items-center justify-center gap-6 p-8 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center">
                                {isDownloadOnly ? getFileIcon() : <Warning className="h-10 w-10 text-amber-500" />}
                            </div>
                            <div className="max-w-md">
                                <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                                    {isDownloadOnly ? "Preview Not Available" : "Preview Error"}
                                </h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    {isDownloadOnly
                                        ? `${getFileLabel()} files cannot be previewed in the browser. Please download or open externally to view.`
                                        : error
                                    }
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <Button asChild variant="outline">
                                        <a href={url} target="_blank" rel="noopener noreferrer">
                                            <ArrowSquareOut className="h-4 w-4 mr-2" />
                                            Open in New Tab
                                        </a>
                                    </Button>
                                    <Button asChild>
                                        <a href={url} download={filename}>
                                            <DownloadSimple className="h-4 w-4 mr-2" />
                                            Download File
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Image Viewer */}
                    {fileType === "image" && !error && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={url}
                            alt={filename}
                            className="max-h-full max-w-full object-contain shadow-lg"
                            onLoad={handleImageLoad}
                            onError={handleError}
                        />
                    )}

                    {/* PDF Viewer - native browser */}
                    {fileType === "pdf" && !error && (
                        <iframe
                            src={url}
                            className="w-full h-full border-0"
                            title={filename}
                            onLoad={() => setLoading(false)}
                            onError={handleError}
                        />
                    )}

                    {/* DOCX Viewer - using docx-preview */}
                    {fileType === "docx" && !error && (
                        <div
                            ref={containerRef}
                            className="w-full h-full overflow-auto bg-white p-4"
                            style={{ minHeight: "100%" }}
                        />
                    )}
                </div>

                {/* DOCX Styles */}
                <style jsx global>{`
                    .docx-viewer {
                        background: white;
                        padding: 20px;
                    }
                    .docx-viewer section.docx {
                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                        margin: 20px auto;
                        padding: 40px 60px;
                        background: white;
                    }
                `}</style>
            </DialogContent>
        </Dialog>
    );
}
