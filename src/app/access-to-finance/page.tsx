import { redirect } from "next/navigation";
import { getApplicantA2fHomePath } from "@/lib/actions/a2f-applicant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getApplicantA2fContext } from "@/lib/actions/a2f-applicant";

export default async function AccessToFinancePage() {
    const home = await getApplicantA2fHomePath();
    if (home.startsWith("/access-to-finance/application")) {
        redirect(home);
    }
    if (home === "/access-to-finance/agreement") {
        redirect(home);
    }

    const ctx = await getApplicantA2fContext();

    return (
        <div className="container mx-auto px-4 py-12 max-w-lg">
            <Card>
                <CardHeader>
                    <CardTitle>Matching Grant</CardTitle>
                    <CardDescription>
                        {ctx.success && ctx.data && !ctx.data.eligible
                            ? ctx.data.reason
                            : "You are not yet eligible to start a Matching Grant application."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild variant="outline">
                        <Link href="/profile">Back to profile</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
