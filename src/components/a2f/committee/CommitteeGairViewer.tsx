"use client";

import { useCallback, useEffect, useState } from "react";
import { getCommitteeGairContent } from "@/lib/actions/a2f-committee";
import type { AppraisalContent } from "@/lib/actions/a2f-investment-appraisals";
import { GAIR_SECTION_FIELDS } from "@/lib/gair-section-fields";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "@phosphor-icons/react";
import { toast } from "sonner";

function sectionText(content: Partial<AppraisalContent>, key: keyof AppraisalContent): string {
    const value = content[key];
    if (typeof value !== "string" || !value.trim()) return "—";
    return value.trim();
}

export function CommitteeGairViewer({ a2fId }: { a2fId: number }) {
    const [content, setContent] = useState<Partial<AppraisalContent> | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await getCommitteeGairContent(a2fId);
        if (res.success && res.data) {
            setContent(res.data.content);
        } else {
            toast.error(res.error ?? "Failed to load GAIR");
            setContent(null);
        }
        setLoading(false);
    }, [a2fId]);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!content) {
        return null;
    }

    const filledSections = GAIR_SECTION_FIELDS.filter(
        (field) => sectionText(content, field.key) !== "—"
    );

    if (filledSections.length === 0) {
        return (
            <Card>
                <CardContent className="py-4 text-sm text-muted-foreground">
                    GAIR exists but has no populated sections yet.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="size-4" />
                    GAIR (read-only)
                </CardTitle>
                <CardDescription>
                    Expand sections to review the investment appraisal prepared by the A2F team.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" className="w-full">
                    {filledSections.map((field) => (
                        <AccordionItem key={field.key} value={field.key}>
                            <AccordionTrigger className="text-sm font-medium">
                                {field.label}
                            </AccordionTrigger>
                            <AccordionContent>
                                <p className="text-xs text-muted-foreground mb-2">{field.description}</p>
                                <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                                    {sectionText(content, field.key)}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
}
