"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DownloadSimple, ArrowSquareOut, X, Spinner } from "@phosphor-icons/react";
import { useState } from "react";

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

    if (!url) return null;

    // Determine file type
    const isPdf = url.toLowerCase().endsWith(".pdf");
    const isImage = /\.(jpg|jpeg|png|webp)$/i.test(url.toLowerCase());
    const isOffice = /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(url.toLowerCase());

    // Viewer URL logic
    let viewerUrl = url;
    if (isOffice) {
        // robust viewer for office docs
        viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[90vw] h-[90vh] p-0 gap-0 overflow-hidden bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl rounded-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/50 z-10">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                            {isPdf ? "PDF" : isImage ? "IMG" : "DOC"}
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 truncate">
                            {filename}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-white/80 backdrop-blur-sm border-gray-200"
                            asChild
                        >
                            <a href={url} target="_blank" rel="noopener noreferrer">
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
                <div className="flex-1 bg-gray-50/50 relative overflow-hidden flex items-center justify-center">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center z-0">
                            <Spinner className="h-8 w-8 text-blue-600 animate-spin" />
                        </div>
                    )}

                    {isImage ? (
                        //eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={url}
                            alt={filename}
                            className="max-h-full max-w-full object-contain shadow-lg"
                            onLoad={() => setLoading(false)}
                        />
                    ) : (
                        <iframe
                            src={viewerUrl}
                            className="w-full h-full border-0 relative z-10"
                            title={filename}
                            onLoad={() => setLoading(false)}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
