"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    getCommitteeScoreOverrideHistory,
    recordCommitteeScoreOverride,
    type CommitteeScoreOverrideHistoryItem,
} from "@/lib/actions/a2f-committee";
import type { MatchingGrantScores } from "@/lib/a2f-constants";
import { MATCHING_MAX_SCORES } from "@/lib/a2f-constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SCORE_KEYS = Object.keys(MATCHING_MAX_SCORES) as Array<keyof MatchingGrantScores>;

interface CommitteeScoreOverridePanelProps {
    a2fId: number;
    currentScores: MatchingGrantScores | null;
    onOverride?: () => void;
}

export function CommitteeScoreOverridePanel({
    a2fId,
    currentScores,
    onOverride,
}: CommitteeScoreOverridePanelProps) {
    const [scores, setScores] = useState<MatchingGrantScores | null>(currentScores);
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const [history, setHistory] = useState<CommitteeScoreOverrideHistoryItem[]>([]);

    useEffect(() => {
        setScores(currentScores);
    }, [currentScores]);

    async function loadHistory() {
        const res = await getCommitteeScoreOverrideHistory(a2fId);
        if (res.success && res.data) setHistory(res.data);
    }

    useEffect(() => {
        loadHistory();
    }, [a2fId]);

    function updateScore(key: keyof MatchingGrantScores, value: string) {
        const num = Number(value);
        if (!scores) return;
        setScores({ ...scores, [key]: Number.isFinite(num) ? num : 0 });
    }

    async function handleSubmit() {
        if (!scores) {
            toast.error("No scores to override");
            return;
        }
        setSaving(true);
        const res = await recordCommitteeScoreOverride(a2fId, scores, reason);
        setSaving(false);
        if (res.success) {
            toast.success(res.message ?? "Override saved");
            setReason("");
            loadHistory();
            onOverride?.();
        } else {
            toast.error(res.error ?? "Override failed");
        }
    }

    if (!scores) {
        return null;
    }

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="text-base">Score override</CardTitle>
                <CardDescription>
                    Adjust scoring parameters with a mandatory audit reason.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                    {SCORE_KEYS.map((key) => (
                        <div key={key} className="space-y-1">
                            <Label className="text-xs capitalize">
                                {key.replace(/([A-Z])/g, " $1").trim()} (max {MATCHING_MAX_SCORES[key]})
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                max={MATCHING_MAX_SCORES[key]}
                                value={scores[key]}
                                onChange={(e) => updateScore(key, e.target.value)}
                            />
                        </div>
                    ))}
                </div>
                <div className="space-y-1.5">
                    <Label>Reason for override</Label>
                    <Textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        placeholder="Explain why the committee adjusted these scores."
                    />
                </div>
                <Button
                    onClick={handleSubmit}
                    disabled={saving || !reason.trim()}
                    variant="outline"
                >
                    {saving ? "Saving…" : "Apply committee override"}
                </Button>

                {history.length > 0 && (
                    <div className="border-t pt-4 space-y-2">
                        <p className="text-sm font-medium">Override history</p>
                        <ul className="space-y-2 text-sm">
                            {history.map((item) => (
                                <li key={item.id} className="rounded-md bg-muted/40 p-3">
                                    <p className="font-medium">
                                        {item.previousTotal} → {item.newTotal} points
                                    </p>
                                    <p className="text-muted-foreground text-xs mt-1">
                                        {item.createdByName} ·{" "}
                                        {format(new Date(item.createdAt), "dd MMM yyyy HH:mm")}
                                    </p>
                                    <p className="mt-1">{item.reason}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
