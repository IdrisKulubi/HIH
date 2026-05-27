"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { saveMatchingGrantOfficialUse } from "@/lib/actions/a2f-matching-grant-applications";
import {
    buildOfficialUseSeed,
    type MatchingGrantOfficialUse,
} from "@/lib/matching-grant-form-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, ArrowsClockwise } from "@phosphor-icons/react";

interface MatchingGrantOfficialUsePanelProps {
    a2fId: number;
    applicationId: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mgApp?: Record<string, any> | null;
    scoring?: {
        totalScore?: number;
        maxTotal?: number;
        qualificationStatus?: string | null;
    } | null;
    ddReports?: Array<{ stage?: string }> | null;
    gairAppraisal?: {
        icDecision?: string | null;
        approvedGrantAmount?: string | number | null;
    } | null;
    onSaved?: () => void;
}

function Field({
    label,
    id,
    value,
    onChange,
    type = "text",
    placeholder,
}: {
    label: string;
    id: keyof MatchingGrantOfficialUse;
    value: string;
    onChange: (id: keyof MatchingGrantOfficialUse, value: string) => void;
    type?: string;
    placeholder?: string;
}) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-xs text-muted-foreground">
                {label}
            </Label>
            <Input
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(id, e.target.value)}
                placeholder={placeholder}
                className="h-9"
            />
        </div>
    );
}

export function MatchingGrantOfficialUsePanel({
    a2fId,
    applicationId,
    mgApp,
    scoring,
    ddReports,
    gairAppraisal,
    onSaved,
}: MatchingGrantOfficialUsePanelProps) {
    const [form, setForm] = useState<MatchingGrantOfficialUse | null>(null);
    const [saving, setSaving] = useState(false);

    const buildSeed = useCallback(
        () =>
            buildOfficialUseSeed({
                a2fId,
                applicationId,
                mgApp,
                scoring,
                ddReports,
                gairAppraisal,
            }),
        [a2fId, applicationId, mgApp, scoring, ddReports, gairAppraisal]
    );

    useEffect(() => {
        setForm(buildSeed());
    }, [buildSeed]);

    function updateField(key: keyof MatchingGrantOfficialUse, value: string) {
        setForm((current) => (current ? { ...current, [key]: value } : current));
    }

    async function handleSave() {
        if (!form) return;
        setSaving(true);
        const res = await saveMatchingGrantOfficialUse(a2fId, form);
        setSaving(false);
        if (res.success) {
            toast.success(res.message ?? "Official-use record saved");
            onSaved?.();
        } else {
            toast.error(res.error ?? "Failed to save");
        }
    }

    function handleSyncFromSystem() {
        setForm(buildSeed());
        toast.message("Empty fields filled from pipeline data; your edits were kept where already set.");
    }

    if (!form) return null;

    return (
        <Card className="border-amber-200/80 bg-amber-50/30">
            <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            <ShieldCheck weight="duotone" className="size-5 text-amber-700" />
                            Official Use Only
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Staff-only review fields. Not shown on the enterprise application form.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSyncFromSystem}
                            className="gap-1.5"
                        >
                            <ArrowsClockwise className="size-4" />
                            Sync from system
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-amber-800 hover:bg-amber-900"
                        >
                            {saving ? "Saving…" : "Save official use"}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Reference number" id="referenceNumber" value={form.referenceNumber} onChange={updateField} />
                <Field label="Date received" id="dateReceived" type="date" value={form.dateReceived} onChange={updateField} />
                <Field label="Received by" id="receivedBy" value={form.receivedBy} onChange={updateField} />
                <Field label="Eligibility result" id="eligibilityResult" value={form.eligibilityResult} onChange={updateField} />
                <Field label="Initial score" id="initialScore" value={form.initialScore} onChange={updateField} placeholder="e.g. 72/100 (Qualified)" />
                <Field label="Due diligence status" id="dueDiligenceStatus" value={form.dueDiligenceStatus} onChange={updateField} />
                <Field label="IC decision" id="icDecision" value={form.icDecision} onChange={updateField} />
                <Field
                    label="Approved grant amount (KES)"
                    id="approvedGrantAmount"
                    value={form.approvedGrantAmount}
                    onChange={updateField}
                    type="number"
                />
                <Field label="Reviewer sign-off" id="reviewerSignOff" value={form.reviewerSignOff} onChange={updateField} />
                <Field label="Sign-off date" id="reviewerSignOffAt" type="date" value={form.reviewerSignOffAt} onChange={updateField} />
                <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
                    <Label htmlFor="notes" className="text-xs text-muted-foreground">
                        Internal notes
                    </Label>
                    <Textarea
                        id="notes"
                        value={form.notes}
                        onChange={(e) => updateField("notes", e.target.value)}
                        rows={2}
                        placeholder="Reviewer comments, conditions, or escalation notes"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
