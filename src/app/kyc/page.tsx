import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserApplication } from "@/lib/actions";
import { checkApplicantCanStartMatchingGrant } from "@/lib/a2f-applicant-eligibility";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Coins } from "@phosphor-icons/react/dist/ssr";

export default async function KycPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (["reviewer_1", "reviewer_2", "technical_reviewer"].includes(session.user.role || "")) {
    redirect("/reviewer/kyc");
  }

  if (["admin", "oversight"].includes(session.user.role || "")) {
    redirect("/admin/kyc");
  }

  if (session.user.role === "a2f_officer") {
    redirect("/profile");
  }

  const application = await getUserApplication();

  if (!application.success || !application.data) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>KYC Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              {application.error || "There is no application linked to this account yet."}
            </p>
            <Button asChild>
              <Link href="/profile">Back to Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data } = application;
  const selected = data.status === "approved" || data.status === "finalist";
  const a2fEligibility = selected
    ? await checkApplicantCanStartMatchingGrant(session.user.id)
    : null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Enterprise KYC Status</h1>
        <p className="text-slate-600">
          KYC is completed by the programme review team. You can view status here. Document uploads and
          geolocation are handled by reviewers.
        </p>
      </div>

      {a2fEligibility?.eligible && (
        <Card className="border-brand-blue/20 bg-brand-blue/5">
          <CardContent className="pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900 flex items-center gap-2">
                <Coins className="size-5 text-brand-blue" weight="duotone" />
                Matching Grant application
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {a2fEligibility.kycPending
                  ? "You may continue to Access to Finance while KYC is still in review."
                  : "Your KYC is verified. Continue to your Matching Grant workspace."}
              </p>
            </div>
            <Button asChild className="bg-brand-blue hover:bg-brand-blue-dark shrink-0">
              <Link href="/access-to-finance">
                Continue to Access to Finance
                <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>{data.business.name}</CardTitle>
              <p className="text-sm text-slate-500">
                Application #{data.id} • {data.applicant.firstName} {data.applicant.lastName}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="capitalize">{data.status.replace(/_/g, " ")}</Badge>
              <Badge className="capitalize bg-blue-100 text-blue-700 hover:bg-blue-100">
                {data.kycStatus.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>
            A reviewer will upload the Letter of Agreement and any optional identity or CR12 documents for this enterprise.
            Geolocation can also be captured later during the site visit.
          </p>
          <p>
            Mentorship, CNA, and other programme modules stay locked until KYC is marked verified. Access to Finance
            is available once your programme application is approved.
          </p>
          <div className="flex flex-wrap gap-3">
            {a2fEligibility?.eligible ? (
              <Button asChild className="bg-brand-blue hover:bg-brand-blue-dark">
                <Link href="/access-to-finance">Matching Grant</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/profile">Back to Profile</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
