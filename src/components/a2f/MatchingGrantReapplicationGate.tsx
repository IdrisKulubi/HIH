"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getApplicantMatchingGrantReturnGateAction } from "@/lib/actions/a2f-applicant";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WarningCircle } from "@phosphor-icons/react";
import type { ApplicantMatchingGrantReturnGate } from "@/lib/matching-grant-return";

export function MatchingGrantReapplicationGate({
  gate: initialGate,
}: {
  gate: ApplicantMatchingGrantReturnGate;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [gate, setGate] = useState(initialGate);

  useEffect(() => {
    setGate(initialGate);
  }, [initialGate]);

  useEffect(() => {
    if (!initialGate.needsReapplication) return;
    const interval = window.setInterval(async () => {
      const res = await getApplicantMatchingGrantReturnGateAction();
      if (res.success && res.data) {
        setGate(res.data);
        if (!res.data.needsReapplication) {
          router.refresh();
        }
      }
    }, 30000);
    return () => window.clearInterval(interval);
  }, [initialGate.needsReapplication, router]);

  if (!gate.needsReapplication || !gate.applicationPath || !gate.a2fId) {
    return null;
  }

  const onApplicationPage = pathname?.startsWith(`/access-to-finance/application/${gate.a2fId}`);

  if (onApplicationPage) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">Your Matching Grant application needs correction</p>
        <p className="mt-1 text-amber-800">
          Update the form below and resubmit. You cannot use other programme areas until this is
          complete.
        </p>
        {gate.returnReason ? (
          <p className="mt-2 text-xs text-amber-800/90">
            <span className="font-medium">Feedback: </span>
            {gate.returnReason}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-700">
            <WarningCircle weight="fill" className="size-5" />
            <DialogTitle>Reapplication required</DialogTitle>
          </div>
          <DialogDescription className="text-left text-slate-600">
            Your Matching Grant application was returned for correction. You must update and
            resubmit it before you can continue using the portal.
          </DialogDescription>
        </DialogHeader>

        {gate.returnReason ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">What to fix</p>
            <p className="mt-1">{gate.returnReason}</p>
          </div>
        ) : null}

        <Button asChild className="w-full">
          <Link href={gate.applicationPath}>Open Matching Grant application</Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
