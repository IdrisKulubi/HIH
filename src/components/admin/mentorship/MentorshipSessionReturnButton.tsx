"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { returnMentorshipSession } from "@/lib/actions/mentorship";
import { CdpSessionReturnDialog } from "@/components/admin/cdp/CdpSessionReturnDialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";

export function MentorshipSessionReturnButton({
  sessionId,
  sessionNumber,
  status,
}: {
  sessionId: number;
  sessionNumber: number;
  status: string;
}) {
  const canReturn = status === "pending_approval" || status === "completed";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!canReturn) return null;

  const confirmReturn = (reason: string) => {
    startTransition(async () => {
      const result = await returnMentorshipSession(sessionId, reason);
      if (!result.success) {
        toast.error(result.error ?? "Failed to return session");
        return;
      }
      toast.success("Session returned to mentor");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        <X className="mr-1 size-4" />
        Return to mentor
      </Button>
      <CdpSessionReturnDialog
        open={open}
        onOpenChange={setOpen}
        title={`Return session ${sessionNumber}?`}
        description="The mentor will see your reason and can edit the session log before resubmitting."
        pending={pending}
        onConfirm={confirmReturn}
      />
    </>
  );
}
