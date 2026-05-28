"use client";

import { useState } from "react";
import { toast } from "sonner";
import { recordCommitteeIcDecision } from "@/lib/actions/a2f-committee";
import type { IcDecision } from "@/lib/actions/a2f-investment-appraisals";
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

const DECISION_HINTS: Record<IcDecision, string> = {
    approved: "Officer may proceed to agreement once this is recorded.",
    approved_with_conditions: "List conditions clearly; officer must satisfy them before agreement.",
    deferred: "Case returns to the officer for further work. Amount is not required.",
    declined: "Case does not proceed to agreement. Amount is not required.",
};

interface CommitteeDecisionPanelProps {
    appraisalId: number;
    a2fId: number;
    initialDecision?: string | null;
    initialApprovedAmount?: string | null;
    initialNotes?: string | null;
    initialConditions?: string | null;
    onRecorded?: () => void;
}

export function CommitteeDecisionPanel({
    appraisalId,
    initialDecision,
    initialApprovedAmount,
    initialNotes,
    initialConditions,
    onRecorded,
}: CommitteeDecisionPanelProps) {
    const [decision, setDecision] = useState<IcDecision>(
        (initialDecision as IcDecision) ?? "approved"
    );
    const [approvedGrantAmount, setApprovedGrantAmount] = useState(
        initialApprovedAmount ?? ""
    );
    const [decisionNotes, setDecisionNotes] = useState(initialNotes ?? "");
    const [decisionConditions, setDecisionConditions] = useState(initialConditions ?? "");
    const [recording, setRecording] = useState(false);

    const amountDisabled = decision === "deferred" || decision === "declined";

    async function handleRecord() {
        setRecording(true);
        const res = await recordCommitteeIcDecision(appraisalId, {
            decision,
            approvedGrantAmount: approvedGrantAmount
                ? Number(approvedGrantAmount)
                : undefined,
            decisionNotes,
            decisionConditions,
        });
        setRecording(false);

        if (res.success) {
            toast.success(res.message ?? "Decision recorded");
            onRecorded?.();
        } else {
            toast.error(res.error ?? "Failed to record decision");
        }
    }

    return (
        <Card className="border-brand-blue/20 shadow-sm">
            <CardHeader className="pb-3 bg-brand-blue/5 rounded-t-lg border-b border-brand-blue/10">
                <CardTitle className="text-base flex items-center gap-2">
                    <Scales weight="duotone" className="size-4 text-brand-blue" />
                    Committee decision
                </CardTitle>
                <CardDescription>
                    Record the outcome before the officer may issue the agreement.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {DECISION_HINTS[decision]}
                </p>
                <div className="space-y-1.5">
                    <Label>Decision</Label>
                    <Select
                        value={decision}
                        onValueChange={(v) => setDecision(v as IcDecision)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="approved_with_conditions">
                                Approved with conditions
                            </SelectItem>
                            <SelectItem value="deferred">Deferred</SelectItem>
                            <SelectItem value="declined">Declined</SelectItem>
                        </SelectContent>
                    </Select>
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
                <div className="space-y-1.5">
                    <Label>Conditions</Label>
                    <Textarea
                        value={decisionConditions}
                        onChange={(e) => setDecisionConditions(e.target.value)}
                        rows={3}
                        placeholder="Required when approving with conditions."
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>Committee notes</Label>
                    <Textarea
                        value={decisionNotes}
                        onChange={(e) => setDecisionNotes(e.target.value)}
                        rows={3}
                        placeholder="Rationale visible to the programme team."
                    />
                </div>
                <Button
                    onClick={handleRecord}
                    disabled={recording}
                    className="w-full gap-2 bg-brand-blue hover:bg-brand-blue-dark text-white"
                >
                    <CheckCircle className="size-4" />
                    {recording ? "Recording…" : "Record committee decision"}
                </Button>
            </CardContent>
        </Card>
    );
}
