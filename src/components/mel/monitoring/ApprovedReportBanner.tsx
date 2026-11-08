export function ApprovedReportBanner({ periodLabel }: { periodLabel: string }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
      <p className="font-semibold">Verified — view only</p>
      <p className="mt-1 text-emerald-900/90">
        This {periodLabel} report has been fully verified. You can review it here but cannot edit it.
        Use the priorities below when planning next quarter&apos;s visit.
      </p>
    </div>
  );
}

export function LockedReportBanner() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
      <p className="font-semibold">Read-only while in review</p>
      <p className="mt-1 text-slate-600">
        This report is locked while it is under review. You will be notified when it is returned or
        verified.
      </p>
    </div>
  );
}
