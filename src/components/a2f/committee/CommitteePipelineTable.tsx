"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { CommitteePipelineListItem } from "@/lib/actions/a2f-committee";
import {
    GairReadinessBadge,
    IcDecisionBadge,
    PipelineStageBadge,
    RevenueGateBadge,
} from "@/components/a2f/PipelineBadges";
import { ArrowRight, Buildings } from "@phosphor-icons/react";
import { HandInHandMark } from "@/components/brand/HandInHandMark";

export function CommitteePipelineTable({ items }: { items: CommitteePipelineListItem[] }) {
    const router = useRouter();

    if (!items.length) {
        return null;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow className="bg-muted/30">
                    <TableHead className="pl-6">Enterprise</TableHead>
                    <TableHead>Track</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>GAIR</TableHead>
                    <TableHead>Revenue gate</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item) => (
                    <TableRow
                        key={item.id}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => router.push(`/a2f/committee/${item.id}`)}
                    >
                        <TableCell className="pl-6">
                            <div className="flex items-start gap-2.5">
                                <div className="rounded-lg bg-brand-blue/10 p-1.5 mt-0.5">
                                    <Buildings weight="duotone" className="size-4 text-brand-blue" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm leading-tight">{item.businessName}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{item.applicantName}</p>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="capitalize text-sm">{item.track ?? "—"}</TableCell>
                        <TableCell>
                            <PipelineStageBadge status={item.status} />
                        </TableCell>
                        <TableCell>
                            <GairReadinessBadge hasGair={item.hasGair} />
                        </TableCell>
                        <TableCell>
                            <RevenueGateBadge eligible={item.revenueEligible} />
                        </TableCell>
                        <TableCell>
                            {item.totalScore != null ? (
                                <span className="font-semibold tabular-nums">{item.totalScore}</span>
                            ) : (
                                <span className="text-xs text-muted-foreground">Not scored</span>
                            )}
                        </TableCell>
                        <TableCell>
                            <IcDecisionBadge decision={item.icDecision} />
                        </TableCell>
                        <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" asChild className="text-brand-blue hover:text-brand-blue-dark">
                                <Link href={`/a2f/committee/${item.id}`}>
                                    Review
                                    <ArrowRight className="size-3.5 ml-1" />
                                </Link>
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export function CommitteePipelineEmpty({
    hasAnyCases,
}: {
    hasAnyCases: boolean;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <HandInHandMark size={48} className="mb-3 opacity-40" />
            <p className="font-medium text-foreground">No cases match your filters</p>
            <p className="text-sm mt-1 max-w-sm">
                {hasAnyCases
                    ? "Try adjusting search, stage, or decision filters."
                    : "Matching Grant pipeline cases will appear here once enterprises enter Access to Finance."}
            </p>
        </div>
    );
}
