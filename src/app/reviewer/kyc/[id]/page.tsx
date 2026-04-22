import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getReviewerKycProfile } from "@/lib/actions";
import { ReviewerKycDetailClient } from "@/components/kyc/ReviewerKycDetailClient";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ReviewerKycDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReviewerKycDetailPage({ params }: ReviewerKycDetailPageProps) {
  const { id } = await params;
  const applicationId = Number(id);

  if (!Number.isFinite(applicationId)) {
    notFound();
  }

  const result = await getReviewerKycProfile(applicationId);
  if (!result.success || !result.data) {
    const message = result.error ?? "Unable to load this KYC record.";
    if (message === "Unauthorized") {
      redirect(`/auth/login?callbackUrl=${encodeURIComponent(`/reviewer/kyc/${applicationId}`)}`);
    }
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/reviewer/kyc">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to KYC Queue
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Unable to open this enterprise</CardTitle>
            <CardDescription className="text-base text-slate-700">{message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/reviewer/kyc">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to KYC Queue
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{result.data.business.name}</h1>
            <p className="text-sm text-slate-500">
              Application #{result.data.application.id} • {result.data.applicant.firstName} {result.data.applicant.lastName}
            </p>
          </div>
        </div>
      </div>

      <ReviewerKycDetailClient data={result.data} />
    </div>
  );
}
