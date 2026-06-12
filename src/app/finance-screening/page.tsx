import { getPreScreeningQueue } from "@/lib/actions/a2f-pre-screening";
import { ScreeningQueue } from "./screening-queue";

export default async function FinanceScreeningPage() {
  const result = await getPreScreeningQueue();
  return (
    <div className="container mx-auto px-4 py-8">
      {!result.success || !result.data ? (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {result.error ?? "Failed to load screening queue"}
        </p>
      ) : (
        <ScreeningQueue rows={result.data} initialError={result.error} />
      )}
    </div>
  );
}
