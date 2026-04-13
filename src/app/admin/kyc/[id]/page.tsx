import Link from "next/link";
import { notFound } from "next/navigation";
import { getKycProfileForAdmin } from "@/lib/actions";
import { buildApplicationDocumentsFromBusiness } from "@/lib/kyc-application-documents";
import { AdminKycReviewClient } from "@/components/kyc/AdminKycReviewClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminKycDetailPage({ params }: Props) {
  const { id } = await params;
  const applicationId = Number(id);

  if (!Number.isFinite(applicationId)) {
    notFound();
  }

  const result = await getKycProfileForAdmin(applicationId);
  if (!result.success || !result.data) {
    notFound();
  }

  const { profile, business, applicant, application, documents, fieldChanges, changeRequests } = result.data;
  const applicationDocuments = buildApplicationDocumentsFromBusiness(business);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{business.name}</h1>
          <p className="text-sm text-slate-500">
            Application #{application.id} • {applicant.firstName} {applicant.lastName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="capitalize bg-blue-100 text-blue-700 hover:bg-blue-100">{profile.status.replace(/_/g, " ")}</Badge>
          <Badge variant="outline" className="capitalize">{profile.profileLockStatus.replace(/_/g, " ")}</Badge>
          <Button asChild variant="outline">
            <Link href="/admin/kyc">Back to Queue</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enterprise Summary</CardTitle>
          <CardDescription>Compare the original application context with the KYC submission before making a decision.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Applicant Email</p>
            <p className="mt-1 font-medium text-slate-900">{applicant.email}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Current Registration Type</p>
            <p className="mt-1 font-medium text-slate-900">{business.registrationType ?? "Not set"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Submitted Baseline Revenue</p>
            <p className="mt-1 font-medium text-slate-900">{profile.baselineRevenue ?? "Not submitted"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Submitted GPS</p>
            <p className="mt-1 font-medium text-slate-900">{profile.gpsCoordinates ?? "Not submitted"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Submitted KRA PIN</p>
            <p className="mt-1 font-medium text-slate-900">{profile.kraPin ?? "Not submitted"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Bank Account</p>
            <p className="mt-1 font-medium text-slate-900">{profile.bankAccountName ?? "Not submitted"}</p>
          </div>
        </CardContent>
      </Card>

      <AdminKycReviewClient
        applicationId={applicationId}
        profileStatus={profile.status}
        applicationDocuments={applicationDocuments}
        documents={documents}
        fieldChanges={fieldChanges}
        changeRequests={changeRequests}
      />
    </div>
  );
}
