"use client";

import { useState } from "react";
import { toast } from "sonner";
import { recordDonorDecision } from "@/lib/actions/a2f-committee";
import type { DonorDecision } from "@/lib/actions/a2f-investment-appraisals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Scales } from "@phosphor-icons/react";

const DECISION_HINTS: Record<DonorDecision, string> = {
    approved_by_donor:
        "Record why the donor approved. The officer may proceed to agreement once this is saved.",
    denied_by_donor:
        "Record why the donor declined. The case will not proceed to agreement.",
};

function resolveInitialDonorDecision(
    donorDecision?: string | null,
    icDecision?: string | null
): DonorDecision {
    if (donorDecision === "approved_by_donor" || donorDecision === "denied_by_donor") {
        return donorDecision;
    }
    if (icDecision === "declined") return "denied_by_donor";
    return "approved_by_donor";
}

interface CommitteeDecisionPanelProps {
    appraisalId: number;
    a2fId: number;
    initialDonorDecision?: string | null;
    initialIcDecision?: string | null;
    initialReason?: string | null;
    initialApprovedAmount?: string | null;
    onRecorded?: () => void;
}

export function CommitteeDecisionPanel({
    appraisalId,
    initialDonorDecision,
    initialIcDecision,
    initialReason,
    initialApprovedAmount,
    onRecorded,
}: CommitteeDecisionPanelProps) {
    const [decision, setDecision] = useState<DonorDecision>(
        resolveInitialDonorDecision(initialDonorDecision, initialIcDecision)
    );
    const [reason, setReason] = useState(initialReason ?? "");
    const [approvedGrantAmount, setApprovedGrantAmount] = useState(
        initialApprovedAmount ?? ""
    );
    const [recording, setRecording] = useState(false);

    const amountDisabled = decision === "denied_by_donor";

    async function handleRecord() {
        if (!reason.trim()) {
            toast.error("Please enter a reason for this donor outcome.");
            return;
        }

        setRecording(true);
        const res = await recordDonorDecision(appraisalId, {
            decision,
            reason: reason.trim(),
            approvedGrantAmount: approvedGrantAmount
                ? Number(approvedGrantAmount)
                : undefined,
        });
        setRecording(false);

        if (res.success) {
            toast.success(res.message ?? "Donor decision recorded");
            onRecorded?.();
        } else {
            toast.error(res.error ?? "Failed to record donor decision");
        }
    }

    return (
        <Card className="border-brand-blue/20 shadow-sm">
            <CardHeader className="pb-3 bg-brand-blue/5 rounded-t-lg border-b border-brand-blue/10">
                <CardTitle className="text-base flex items-center gap-2">
                    <Scales weight="duotone" className="size-4 text-brand-blue" />
                    Donor decision
                </CardTitle>
                <CardDescription>
                    Record the donor outcome and reason for accountability before agreement.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {DECISION_HINTS[decision]}
                </p>
                <div className="space-y-1.5">
                    <Label>Donor outcome</Label>
                    <Select
                        value={decision}
                        onValueChange={(v) => setDecision(v as DonorDecision)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="approved_by_donor">Approved by donor</SelectItem>
                            <SelectItem value="denied_by_donor">Denied by donor</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label>
                        Reason <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                        required
                        placeholder="e.g. Donor declined due to sector limits for this intake."
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>Approved grant amount (KES)</Label>
                    <Input
                        type="number"
                        min="0"
                        value={approvedGrantAmount}
                        onChange={(e) => setApprovedGrantAmount(e.target.value)}
                        disabled={amountDisabled}
                        placeholder={amountDisabled ? "Not applicable" : "Enter amount"}
                    />
                </div>
                <Button
                    onClick={handleRecord}
                    disabled={recording}
                    className="w-full gap-2 bg-brand-blue hover:bg-brand-blue-dark text-white"
                >
                    <CheckCircle className="size-4" />
                    {recording ? "Saving…" : "Save donor decision"}
                </Button>
            </CardContent>
        </Card>
    );
}
