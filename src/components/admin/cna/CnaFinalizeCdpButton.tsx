"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { finalizeRoleBasedCna } from "@/lib/actions/role-cna";
import { generateCdpFromFinalizedCna } from "@/lib/actions/cdp";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CnaFinalizeCdpButton({
  businessId,
  assessmentId,
  disabled,
  redirectToPlan = true,
}: {
  businessId: number;
  assessmentId: number;
  disabled?: boolean;
  redirectToPlan?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      disabled={disabled || pending}
      onClick={() => {
        start(async () => {
          const finalized = await finalizeRoleBasedCna(businessId);
          if (!finalized.success || !finalized.data) {
            toast.error(finalized.error ?? "Could not finalize CNA");
            return;
          }
          const generated = await generateCdpFromFinalizedCna({
            businessId,
            assessmentId: finalized.data.assessmentId || assessmentId,
          });
          if (!generated.success || !generated.data) {
            toast.error(generated.error ?? "Could not generate CDP");
            router.refresh();
            return;
          }
          toast.success("CNA finalized and CDP generated");
          if (redirectToPlan) {
            router.push(`/admin/cdp/${businessId}?planId=${generated.data.id}`);
          } else {
            router.refresh();
          }
        });
      }}
    >
      {pending ? "Finalizing..." : "Finalize CNA / Generate CDP"}
    </Button>
  );
}
