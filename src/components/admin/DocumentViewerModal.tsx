"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DownloadSimple, X, Spinner, Warning, ArrowsClockwise, ArrowSquareOut } from "@phosphor-icons/react";
import { useState, useEffect, useRef } from "react";

interface DocumentViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string | null;
    filename?: string;
}

type ViewerType = "native" | "office" | "google";

export function DocumentViewerModal({
    isOpen,
    onClose,
    url,
    filename = "Document",
}: DocumentViewerModalProps) {
    const [loading, setLoading] = useState(true);
    const [currentViewer, setCurrentViewer] = useState<ViewerType>("native");
    const [showFallback, setShowFallback] = useState(false);
    const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Reset state when URL changes or modal opens
    useEffect(() => {
        if (url && isOpen) {
            setLoading(true);
            setShowFallback(false);
            // Determine initial viewer based on file type
            const isOffice = /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(url.toLowerCase());
            setCurrentViewer(isOffice ? "google" : "native");

            // Set a timeout - if loading takes too long, show fallback options
            if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
            loadTimeoutRef.current = setTimeout(() => {
                setLoading(false);
                setShowFallback(true);
            }, 8000); // 8 seconds timeout
        }

        return () => {
            if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        };
    }, [url, isOpen]);

    if (!url) return null;

    // Determine file type
    const isPdf = url.toLowerCase().includes(".pdf");
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url.toLowerCase());
    const isOffice = /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(url.toLowerCase());

    // Build viewer URLs
    const getViewerUrl = (type: ViewerType): string => {
        switch (type) {
            case "office":
                return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
            case "google":
                return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
            default:
                return url;
        }
    };

    const handleLoad = () => {
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        setLoading(false);
        setShowFallback(false);
    };

    const tryAlternativeViewer = () => {
        setLoading(true);
        setShowFallback(false);
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = setTimeout(() => {
            setLoading(false);
            setShowFallback(true);
        }, 8000);

        if (currentViewer === "google") {
            setCurrentViewer("office");
        } else if (currentViewer === "office") {
            setCurrentViewer("google");
        }
    };

    const viewerUrl = getViewerUrl(currentViewer);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[90vw] w-[1200px] h-[90vh] p-0 gap-0 overflow-hidden bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl rounded-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/50 z-10 shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600 font-mono text-xs font-bold">
                            {isPdf ? "PDF" : isImage ? "IMG" : isOffice ? "DOC" : "FILE"}
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 truncate">
                            {filename}
                        </h2>
                        {isOffice && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                via {currentViewer === "google" ? "Google Docs" : "Office Online"}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isOffice && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={tryAlternativeViewer}
                                className="text-xs text-gray-500"
                            >
                                <ArrowsClockwise className="h-4 w-4 mr-1" />
                                Switch Viewer
                            </Button>
                        )}
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
                            variant="outline"
                            size="sm"
                            className="bg-white/80 backdrop-blur-sm border-gray-200"
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
                <div className="flex-1 bg-gray-50/50 relative overflow-hidden flex items-center justify-center">
                    {loading && !showFallback && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-3 bg-gray-50">
                            <Spinner className="h-8 w-8 text-blue-600 animate-spin" />
                            <p className="text-sm text-gray-500">Loading document...</p>
                            <p className="text-xs text-gray-400">This may take a few seconds</p>
                        </div>
                    )}

                    {showFallback && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-gray-50 gap-4">
                            <Warning className="h-12 w-12 text-amber-500" />
                            <div className="text-center max-w-md">
                                <h3 className="font-semibold text-gray-900 mb-2">Document Preview Unavailable</h3>
                                <p className="text-sm text-gray-500 mb-4">
                                    The document couldn&apos;t be displayed in the browser. This often happens with private files or specific document formats.
                                </p>
                                <div className="flex gap-3 justify-center flex-wrap">
                                    <Button variant="outline" onClick={tryAlternativeViewer}>
                                        <ArrowsClockwise className="h-4 w-4 mr-2" />
                                        Try {currentViewer === "google" ? "Office Viewer" : "Google Viewer"}
                                    </Button>
                                    <Button asChild>
                                        <a href={url} target="_blank" rel="noopener noreferrer">
                                            <ArrowSquareOut className="h-4 w-4 mr-2" />
                                            Open in New Tab
                                        </a>
                                    </Button>
                                    <Button variant="secondary" asChild>
                                        <a href={url} download={filename}>
                                            <DownloadSimple className="h-4 w-4 mr-2" />
                                            Download File
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isImage ? (
                        //eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={url}
                            alt={filename}
                            className="max-h-full max-w-full object-contain shadow-lg"
                            onLoad={handleLoad}
                            onError={() => setShowFallback(true)}
                        />
                    ) : (
                        <iframe
                            key={viewerUrl}
                            src={viewerUrl}
                            className={`w-full h-full border-0 ${showFallback ? 'hidden' : ''}`}
                            title={filename}
                            onLoad={handleLoad}
                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
