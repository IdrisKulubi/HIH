import { ApplicantContractsTab } from "@/components/application/ApplicantContractsTab";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/auth";
import { checkApplicantCanStartMatchingGrant } from "@/lib/a2f-applicant-eligibility";
import { redirect } from "next/navigation";

export default async function AccessToFinanceAgreementPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");
    const eligibility = await checkApplicantCanStartMatchingGrant(session.user.id);
    if (!eligibility.eligible) redirect("/access-to-finance");

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
