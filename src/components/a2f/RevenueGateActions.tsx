"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
    updateA2fEnterpriseTrack,
    updateA2fVerifiedRevenue,
} from "@/lib/actions/a2f-pipeline";
import {
    type A2fEnterpriseTrack,
    type RevenueGateAction,
    type RevenueGateActionId,
} from "@/lib/a2f-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function formatTrack(track: A2fEnterpriseTrack | null | undefined) {
    if (track === "acceleration") return "Accelerator";
    if (track === "foundation") return "Foundation";
    return "Not set";
}

function formatKes(amount: number) {
    return `KES ${amount.toLocaleString("en-KE")}`;
}

function targetTrackForAction(id: RevenueGateActionId): A2fEnterpriseTrack | null {
    if (id === "assign_accelerator") return "acceleration";
    if (id === "assign_foundation") return "foundation";
    return null;
}

export function RevenueGateActions({
    a2fId,
    track,
    annualRevenue,
    actions,
    compact = false,
    onResolved,
}: {
    a2fId: number;
    track: A2fEnterpriseTrack | null;
    annualRevenue: number;
    actions: RevenueGateAction[];
    compact?: boolean;
    onResolved?: () => void;
}) {
    const [trackPending, setTrackPending] = useState(false);
    const [revenueOpen, setRevenueOpen] = useState(false);
    const [revenueInput, setRevenueInput] = useState("");
    const [revenueSaving, setRevenueSaving] = useState(false);

    if (actions.length === 0) return null;

    const visibleActions = compact
        ? actions.filter(a => a.variant === "default" || a.id === "open_mg_financials").slice(0, 2)
        : actions;

    async function handleAssignTrack(newTrack: A2fEnterpriseTrack) {
        setTrackPending(true);
        const res = await updateA2fEnterpriseTrack(a2fId, newTrack);
        setTrackPending(false);
        if (res.success) {
            toast.success(res.message ?? "Track updated");
            onResolved?.();
        } else {
            toast.error(res.error ?? "Failed to update track");
        }
    }

    async function handleSaveRevenue() {
        const parsed = Number(String(revenueInput).replace(/,/g, ""));
        if (!Number.isFinite(parsed) || parsed <= 0) {
            toast.error("Enter a valid annual revenue greater than zero");
            return;
        }
        setRevenueSaving(true);
        const res = await updateA2fVerifiedRevenue(a2fId, parsed);
        setRevenueSaving(false);
        if (res.success) {
            toast.success(res.message ?? "Revenue updated");
            setRevenueOpen(false);
            onResolved?.();
        } else {
            toast.error(res.error ?? "Failed to update revenue");
        }
    }

    return (
        <div className={cn("flex flex-wrap gap-2", compact && "pt-1")}>
            {visibleActions.map(action => {
                const newTrack = targetTrackForAction(action.id);

                if (action.id === "open_mg_financials") {
                    return (
                        <Button
                            key={action.id}
                            variant={action.variant === "default" ? "default" : "outline"}
                            size="sm"
                            asChild
                        >
                            <Link href={`/a2f/${a2fId}/matching-grant?step=financials`}>
                                {action.label}
                            </Link>
                        </Button>
                    );
                }

                if (action.id === "edit_revenue") {
                    return (
                        <Dialog
                            key={action.id}
                            open={revenueOpen}
                            onOpenChange={open => {
                                setRevenueOpen(open);
                                if (open) {
                                    setRevenueInput(annualRevenue > 0 ? String(annualRevenue) : "");
                                }
                            }}
                        >
                            <DialogTrigger asChild>
                                <Button
                                    variant={action.variant === "default" ? "default" : "outline"}
                                    size="sm"
                                >
                                    {action.label}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Update verified annual revenue</DialogTitle>
                                    <DialogDescription>
                                        Pre-IC scoring uses this verified revenue from the enterprise record.
                                        Current: {annualRevenue > 0 ? formatKes(annualRevenue) : "not set"} · Track: {formatTrack(track)}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-2">
                                    <Label htmlFor="verified-revenue">Annual revenue (KES)</Label>
                                    <Input
                                        id="verified-revenue"
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={revenueInput}
                                        onChange={e => setRevenueInput(e.target.value)}
                                        placeholder="e.g. 2500000"
                                    />
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setRevenueOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSaveRevenue} disabled={revenueSaving}>
                                        {revenueSaving ? "Saving…" : "Save revenue"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    );
                }

                if (newTrack) {
                    return (
                        <AlertDialog key={action.id}>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant={action.variant === "default" ? "default" : "outline"}
                                    size="sm"
                                    disabled={trackPending}
                                >
                                    {action.label}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{action.label}?</AlertDialogTitle>
                                    <AlertDialogDescription className="space-y-2">
                                        <span className="block">
                                            Current track: <strong>{formatTrack(track)}</strong>
                                        </span>
                                        <span className="block">
                                            Verified revenue: <strong>{annualRevenue > 0 ? formatKes(annualRevenue) : "not set"}</strong>
                                        </span>
                                        <span className="block">
                                            New track: <strong>{formatTrack(newTrack)}</strong>. This will only succeed if revenue meets that track&apos;s eligibility band.
                                        </span>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleAssignTrack(newTrack)}
                                        disabled={trackPending}
                                    >
                                        {trackPending ? "Updating…" : "Confirm"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    );
                }

                return null;
            })}
        </div>
    );
}
