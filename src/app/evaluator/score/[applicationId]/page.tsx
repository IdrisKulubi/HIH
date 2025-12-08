import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "../../../../../auth";
import { getMyAssignedApplications } from "@/lib/actions/evaluator-scoring";
import { ScoringInterface } from "@/components/evaluator/ScoringInterface";

interface PageProps {
  params: Promise<{ applicationId: string }>;
}

async function ApplicationScoring({ params }: { params: { applicationId: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const applicationsResult = await getMyAssignedApplications();
  if (!applicationsResult.success) {
    redirect("/");
  }

  const assignment = applicationsResult.data?.find(a => a.application.id === params.applicationId);
  if (!assignment) {
    redirect("/evaluator");
  }

  return <ScoringInterface assignment={assignment} />;
}

export default async function ApplicationScoringPage({ params }: PageProps) {
  const resolvedParams = await params;
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scoring interface...</p>
        </div>
      </div>
    }>
      <ApplicationScoring params={resolvedParams} />
    </Suspense>
  );
} 