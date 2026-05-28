"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { PIPELINE_STAGE_LABELS, type A2fPipelineStatus } from "@/lib/a2f-constants";
import type { CommitteePipelineListItem } from "@/lib/actions/a2f-committee";
import { ArrowRight } from "@phosphor-icons/react";

const DECISION_LABELS: Record<string, string> = {
    approved: "Approved",
    approved_with_conditions: "Approved w/ conditions",
    deferred: "Deferred",
    declined: "Declined",
};

export function CommitteePipelineTable({ items }: { items: CommitteePipelineListItem[] }) {
    if (!items.length) {
        return (
            <p className="text-sm text-muted-foreground py-8 text-center">
                No Access to Finance cases yet.
            </p>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Enterprise</TableHead>
                    <TableHead>Track</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Revenue gate</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Qualification</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead className="w-10" />
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item) => (
                    <TableRow key={item.id}>
                        <TableCell>
                            <div className="font-medium">{item.businessName}</div>
                            <div className="text-xs text-muted-foreground">{item.applicantName}</div>
                        </TableCell>
                        <TableCell className="capitalize">{item.track ?? "—"}</TableCell>
                        <TableCell>
                            <Badge variant="outline">
                                {PIPELINE_STAGE_LABELS[item.status as A2fPipelineStatus] ?? item.status}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            {item.revenueEligible == null ? (
                                "—"
                            ) : item.revenueEligible ? (
                                <Badge className="bg-emerald-100 text-emerald-800">Eligible</Badge>
                            ) : (
                                <Badge className="bg-red-100 text-red-800">Ineligible</Badge>
                            )}
                        </TableCell>
                        <TableCell>{item.totalScore ?? "—"}</TableCell>
                        <TableCell className="text-xs max-w-[140px]">{item.qualificationStatus ?? "—"}</TableCell>
                        <TableCell>
                            {item.icDecision ? (
                                <Badge variant="secondary">
                                    {DECISION_LABELS[item.icDecision] ?? item.icDecision}
                                </Badge>
                            ) : (
                                <span className="text-muted-foreground text-xs">Pending</span>
                            )}
                        </TableCell>
                        <TableCell>
                            <Link
                                href={`/a2f/committee/${item.id}`}
                                className="inline-flex text-violet-700 hover:text-violet-900"
                            >
                                <ArrowRight className="size-4" />
                            </Link>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
