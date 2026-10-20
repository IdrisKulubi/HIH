"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import type { MelReviewDetail } from "@/lib/actions/mel-review";
import { reviewMelEvidenceAction } from "@/lib/actions/mel-review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EvidenceReviewList({ evidence }: { evidence: MelReviewDetail["evidence"] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<number, string>>({});

  const decide = (evidenceId: number, status: "verified" | "rejected") => {
    setPendingId(evidenceId);
    startTransition(async () => {
      const result = await reviewMelEvidenceAction({ evidenceId, status, notes: notes[evidenceId] });
      setPendingId(null);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }
      router.refresh();
    });
  };

  if (evidence.length === 0) return <p className="text-sm text-slate-500">No active evidence attached.</p>;
  return (
    <ul className="divide-y rounded-md border">
      {evidence.map((item) => {
        const verified = item.reviews.some((review) => review.status === "verified");
        const rejected = item.reviews.some((review) => review.status === "rejected");
        return (
          <li key={item.id} className="space-y-3 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <a href={item.fileUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium text-brand-blue hover:underline">
                {item.fileName} <ExternalLink className="ml-1 inline size-3" />
              </a>
              <Badge variant="outline">{item.questionCode.replaceAll("_", " ")}</Badge>
              <Badge variant="outline" className={rejected ? "border-red-200 bg-red-50 text-red-700" : verified ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}>
                {rejected ? "rejected" : verified ? "verified" : "pending"}
              </Badge>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Review note (required for rejection)" className="flex-1" />
              <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => decide(item.id, "verified")}><Check className="mr-1 size-3.5" />Verify</Button>
              <Button type="button" size="sm" variant="outline" className="border-red-200 text-red-700" disabled={pending || (pendingId === item.id && !notes[item.id])} onClick={() => decide(item.id, "rejected")}><X className="mr-1 size-3.5" />Reject</Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
