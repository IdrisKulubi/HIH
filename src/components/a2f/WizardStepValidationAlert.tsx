"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Warning, XCircle } from "@phosphor-icons/react";

type Props = {
    errors: string[];
    guidanceNotes?: string[];
};

export function WizardStepValidationAlert({ errors, guidanceNotes = [] }: Props) {
    if (errors.length === 0 && guidanceNotes.length === 0) return null;

    return (
        <div className="space-y-3">
            {errors.length > 0 && (
                <Card className="border-red-200 bg-red-50/80 dark:bg-red-950/30 dark:border-red-900/50" id="wizard-step-validation">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-red-900 dark:text-red-200">
                            <XCircle weight="duotone" className="size-4 shrink-0" />
                            Complete this step before continuing
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc pl-5 space-y-1.5 text-sm text-red-800 dark:text-red-200/90">
                            {errors.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
            {guidanceNotes.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-900/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-amber-900 dark:text-amber-200">
                            <Warning weight="duotone" className="size-4 shrink-0" />
                            Guidance notes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc pl-5 space-y-1.5 text-sm text-amber-800 dark:text-amber-200/90">
                            {guidanceNotes.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                        <p className="text-xs text-amber-700/90 dark:text-amber-300/80 mt-2">
                            These do not block progress but may need justification in the investment case.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
