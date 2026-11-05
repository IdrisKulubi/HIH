import { Skeleton } from "@/components/ui/skeleton";

export default function FieldworkLoading() {
  return (
    <main className="container mx-auto space-y-6 px-4 py-8" aria-busy="true" aria-label="Loading fieldwork">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-80" />
      <div className="space-y-3 rounded-xl border p-5">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </main>
  );
}
