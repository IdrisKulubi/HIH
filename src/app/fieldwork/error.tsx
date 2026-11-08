"use client";

import { Button } from "@/components/ui/button";

export default function FieldworkError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container mx-auto px-4 py-16 text-center" role="alert">
      <h1 className="text-lg font-semibold">Fieldwork could not be loaded</h1>
      <p className="mt-2 text-sm text-muted-foreground">Check your connection and try again. If the problem continues, contact support{error.digest ? ` with reference ${error.digest}` : ""}.</p>
      <Button className="mt-4" onClick={reset}>Try again</Button>
    </main>
  );
}
