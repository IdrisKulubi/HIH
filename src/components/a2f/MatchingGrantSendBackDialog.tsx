"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  getMatchingGrantReturnAssigneesAction,
  returnMatchingGrantForCorrectionAction,
} from "@/lib/actions/a2f-matching-grant-return";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUUpLeft } from "@phosphor-icons/react";

export function MatchingGrantSendBackDialog({
  a2fId,
  disabled,
  onReturned,
}: {
  a2fId: number;
  disabled?: boolean;
  onReturned?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [assignees, setAssignees] = useState<
    Array<{ id: string; name: string; email: string; role: string }>
  >([]);
  const [assignedToId, setAssignedToId] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingAssignees(true);
    getMatchingGrantReturnAssigneesAction()
      .then((res) => {
        if (res.success && res.data) {
          setAssignees(res.data);
        } else {
          toast.error(res.error ?? "Unable to load EDO list.");
        }
      })
      .finally(() => setLoadingAssignees(false));
  }, [open]);

  async function handleSubmit() {
    if (!assignedToId) {
      toast.error("Select an EDO or head to assign.");
      return;
    }
    if (returnReason.trim().length < 10) {
      toast.error("Provide a return reason of at least 10 characters.");
      return;
    }

    setSubmitting(true);
    const res = await returnMatchingGrantForCorrectionAction({
      a2fId,
      assignedToId,
      returnReason: returnReason.trim(),
    });
    setSubmitting(false);

    if (!res.success) {
      toast.error(res.error ?? "Failed to send application back.");
      return;
    }

    toast.success(res.message ?? "Application sent back for correction.");
    setOpen(false);
    setReturnReason("");
    setAssignedToId("");
    onReturned?.();
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="border-amber-300 text-amber-900 hover:bg-amber-50"
      >
        <ArrowUUpLeft className="mr-1.5 size-4" />
        Send back
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send application back for correction</DialogTitle>
            <DialogDescription>
              The applicant will need to correct and resubmit before scoring can continue. An email
              will be sent to the selected EDO or head to contact the applicant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="mg-return-edo">Assign to EDO / head</Label>
              <Select
                value={assignedToId}
                onValueChange={setAssignedToId}
                disabled={loadingAssignees || assignees.length === 0}
              >
                <SelectTrigger id="mg-return-edo">
                  <SelectValue placeholder={loadingAssignees ? "Loading…" : "Select EDO or head"} />
                </SelectTrigger>
                <SelectContent>
                  {assignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.name} ({assignee.role === "redo" ? "REDO" : "EDO"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mg-return-reason">Reason for return</Label>
              <Textarea
                id="mg-return-reason"
                value={returnReason}
                onChange={(event) => setReturnReason(event.target.value)}
                placeholder="Explain what the applicant needs to correct…"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Sending back…" : "Send back"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
