import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "../../../../../auth";
import { getDragonsDenCriteria } from "@/lib/actions/dragons-den-scoring";
import { DragonsDenScoringInterface } from "@/components/dragons-den/DragonsDenScoringInterface";

interface PageProps {
  params: Promise<{ applicationId: string }>;
}

async function DragonsDenEvaluation({ params }: { params: { applicationId: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const criteriaResult = await getDragonsDenCriteria(params.applicationId);
  if (!criteriaResult.success) {
    redirect("/dragons-den");
  }

  return <DragonsDenScoringInterface applicationId={params.applicationId} criteria={criteriaResult.data || []} />;
}

export default async function DragonsDenEvaluationPage({ params }: PageProps) {
  const resolvedParams = await params;
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading presentation evaluation...</p>
        </div>
      </div>
    }>
      <DragonsDenEvaluation params={resolvedParams} />
    </Suspense>
  );
} 