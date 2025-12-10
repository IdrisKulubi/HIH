import { redirect } from "next/navigation";
import { auth } from "../../../../../auth";

// NOTE: The legacy evaluator scoring system has been replaced by the Two-Tier Review system.
// This page now redirects users to the appropriate admin review interface.

interface PageProps {
  params: Promise<{ applicationId: string }>;
}

export default async function ApplicationScoringPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const resolvedParams = await params;

  // Redirect to the admin application detail page where the Two-Tier Review panel is available
  redirect(`/admin/applications/${resolvedParams.applicationId}`);
}