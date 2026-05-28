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
import { CheckCircle } from "@phosphor-icons/react";

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
    a2fId,
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
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Committee decision</CardTitle>
                <CardDescription>
                    Approve, approve with conditions, defer, or decline before the officer may issue the agreement.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
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
                            disabled={decision === "deferred" || decision === "declined"}
                        />
                    </div>
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
                    />
                </div>
                <Button
                    onClick={handleRecord}
                    disabled={recording}
                    className="gap-2 bg-violet-700 hover:bg-violet-800"
                >
                    <CheckCircle className="size-4" />
                    {recording ? "Recording…" : "Record committee decision"}
                </Button>
            </CardContent>
        </Card>
    );
}
