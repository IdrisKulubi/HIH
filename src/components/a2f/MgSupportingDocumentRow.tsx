"use client";

import { KycDocumentUploader } from "@/components/kyc/KycDocumentUploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getDocumentViewerHref } from "@/lib/document-view-url";
import type { MgSupportingDocumentRow } from "@/lib/mg-supporting-documents";
import { ArrowSquareOut } from "@phosphor-icons/react";

type Props = {
    row: MgSupportingDocumentRow;
    disabled?: boolean;
    onChange: (patch: Partial<MgSupportingDocumentRow>) => void;
};

function sourceBadgeLabel(row: MgSupportingDocumentRow): string | null {
    if (!row.source) return null;
    switch (row.source) {
        case "application":
            return "From application";
        case "kyc":
            return "From KYC";
        case "cdp":
            return "From CDP";
        case "mg":
            return "Uploaded here";
        default:
            return null;
    }
}

export function MgSupportingDocumentRow({ row, disabled = false, onChange }: Props) {
    const hasFile = Boolean(row.url.trim());
    const badge = sourceBadgeLabel(row);

    return (
        <div className="rounded-lg border p-4 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1.5 min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{row.document}</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant={row.mandatory === "Yes" ? "default" : "secondary"}
                            className="text-xs font-normal"
                        >
                            {row.mandatory === "Yes" ? "Mandatory" : row.mandatory}
                        </Badge>
                        {badge && (
                            <Badge variant="outline" className="text-xs font-normal">
                                {row.sourceLabel ?? badge}
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Checkbox
                        id={`mg-doc-enclosed-${row.document}`}
                        checked={row.confirmed}
                        disabled={disabled || !hasFile}
                        onCheckedChange={(checked) => onChange({ confirmed: Boolean(checked) })}
                    />
                    <Label htmlFor={`mg-doc-enclosed-${row.document}`} className="text-xs whitespace-nowrap">
                        Enclosed
                    </Label>
                </div>
            </div>

            {hasFile && row.source && row.source !== "mg" ? (
                <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/50 p-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                        Pre-filled from programme records. You can replace with a new upload if needed.
                    </p>
                    <p className="text-sm font-medium truncate">{row.fileName || "Document on file"}</p>
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" asChild>
                            <a
                                href={getDocumentViewerHref(row.url, row.fileName ?? "")}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <ArrowSquareOut className="size-3.5 mr-1.5" />
                                View
                            </a>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={disabled}
                            onClick={() =>
                                onChange({
                                    url: "",
                                    fileName: undefined,
                                    confirmed: false,
                                    source: null,
                                    sourceLabel: undefined,
                                })
                            }
                        >
                            Replace
                        </Button>
                    </div>
                </div>
            ) : (
                <KycDocumentUploader
                    label=""
                    description="PDF, DOC, or DOCX up to 8MB"
                    value={row.url}
                    fileName={row.fileName ?? ""}
                    disabled={disabled}
                    onUploaded={({ fileUrl, fileName }) =>
                        onChange({
                            url: fileUrl,
                            fileName,
                            source: "mg",
                            sourceLabel: "Uploaded in Matching Grant application",
                            confirmed: true,
                        })
                    }
                    onRemove={() =>
                        onChange({
                            url: "",
                            fileName: undefined,
                            confirmed: false,
                            source: null,
                            sourceLabel: undefined,
                        })
                    }
                />
            )}
        </div>
    );
}
