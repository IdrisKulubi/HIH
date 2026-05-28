"use client";

import { ApplicantContractsTab } from "@/components/application/ApplicantContractsTab";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccessToFinanceAgreementPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Signed agreement</CardTitle>
                    <CardDescription>
                        Download your offer letter and upload the signed agreement when ready.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ApplicantContractsTab />
                </CardContent>
            </Card>
        </div>
    );
}
