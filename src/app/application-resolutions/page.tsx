import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listMyDocumentResolutionIssues } from "@/lib/actions/a2f-document-resolutions";
import {
  DocumentResolutionQueue,
  type DocumentResolutionQueueItem,
} from "@/components/a2f/DocumentResolutionQueue";

export default async function ApplicationResolutionsPage() {
  const session = await auth();
  if (!session?.user || !["admin", "bds_edo", "redo"].includes(session.user.role ?? "")) {
    redirect("/");
  }

  const result = await listMyDocumentResolutionIssues();
  const issues = result.success && result.data
    ? (result.data as DocumentResolutionQueueItem[])
    : [];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <p className="text-sm font-medium text-emerald-700">Application follow-up</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Document resolutions
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Review issues raised by Access to Finance, follow up with the applicant, and record
            the outcome.
          </p>
        </div>

        {!result.success && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {result.error ?? "The resolution queue could not be loaded."}
          </p>
        )}

        <DocumentResolutionQueue initialIssues={issues} />
      </div>
    </main>
  );
}
