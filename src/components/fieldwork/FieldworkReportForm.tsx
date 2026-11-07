"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { reviewFieldworkReport, saveFieldworkReportDraft, submitFieldworkReport } from "@/lib/actions/fieldwork-execution";
import { countWords, REPORT_FIELDS, validateReportForSubmit, type ReportFieldKey } from "@/lib/fieldwork/report-rules";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type FieldErrors = Partial<Record<ReportFieldKey, string>>;
type Props = {
  visitId: number; businessName: string; agenda: string; planTitle: string; whenLabel: string;
  status: string; returnReason: string | null; reportId: number;
  fields: Record<ReportFieldKey, string>;
  canEdit: boolean; canReview: boolean;
  events: { id: number; type: string; at: string; details: Record<string, unknown> }[];
};

const STATUS_COPY: Record<string, string> = { draft: "Draft", returned: "Returned for changes", submitted: "Submitted, awaiting review", approved: "Approved" };

export function FieldworkReportForm({ visitId, businessName, agenda, planTitle, whenLabel, status, returnReason, reportId, fields, canEdit, canReview, events }: Props) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [values, setValues] = useState(fields);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState("");

  const liveErrors = validateReportForSubmit(values);
  const errors: FieldErrors = { ...liveErrors, ...serverErrors };
  const change = (key: ReportFieldKey, value: string) => { setServerErrors({}); setValues((v) => ({ ...v, [key]: value })); };

  function run(work: () => Promise<{ success: boolean; error?: string; fieldErrors?: unknown }>, ok: string, then?: () => void) {
    startTransition(async () => {
      try {
        const result = await work();
        if (!result.success) {
          if (result.fieldErrors) setServerErrors(result.fieldErrors as FieldErrors);
          return void toast.error(result.error ?? "Something went wrong.");
        }
        toast.success(ok);
        if (then) then(); else router.refresh();
      } catch {
        toast.error("Could not reach the server. Your text is still on this page. Check your connection and try again.");
      }
    });
  }

  const payload = { visitId, ...values };
  const goBack = () => router.push("/fieldwork/execution");

  return (
    <main className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div><Link href="/fieldwork/execution" className="text-sm text-primary">Back to visit execution</Link></div>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Field visit report</h1>
        <p className="mt-1 text-sm text-muted-foreground">{STATUS_COPY[status] ?? status} · {planTitle} · {whenLabel}</p>
      </header>

      {status === "returned" && returnReason && <p role="alert" className="rounded-md bg-orange-50 p-3 text-sm text-orange-900"><strong>Returned by your REDO:</strong> {returnReason}</p>}

      <section className="grid gap-3 rounded-xl border bg-muted/40 p-4 text-sm sm:grid-cols-2">
        <div><p className="text-xs uppercase text-muted-foreground">Enterprise</p><p className="font-medium">{businessName}</p></div>
        <div><p className="text-xs uppercase text-muted-foreground">Agenda</p><p>{agenda}</p></div>
      </section>

      <form className="space-y-5" onSubmit={(e) => e.preventDefault()} noValidate>
        {REPORT_FIELDS.map((field) => {
          const words = countWords(values[field.key]);
          const error = canEdit ? errors[field.key] : undefined;
          const id = `field-${field.key}`;
          return (
            <div key={field.key}>
              <label htmlFor={id} className="text-sm font-medium">{field.label}</label>
              <Textarea id={id} rows={field.minWords ? 8 : 3} value={values[field.key]} readOnly={!canEdit} aria-invalid={!!error} aria-describedby={`${id}-help`}
                onChange={(e) => change(field.key, e.target.value)} />
              <p id={`${id}-help`} className={`mt-1 text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}>
                {field.minWords ? `${words} / ${field.minWords} words minimum` : `${values[field.key].trim().length} characters`}{error ? `. ${error}` : ""}
              </p>
            </div>
          );
        })}
      </form>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" disabled={busy} onClick={() => run(() => saveFieldworkReportDraft(payload), "Draft saved.")}>Save draft</Button>
          <Button disabled={busy || Object.keys(liveErrors).length > 0} onClick={() => run(() => submitFieldworkReport(payload), "Report submitted for review.", goBack)}>Submit for review</Button>
          {Object.keys(liveErrors).length > 0 && <p className="text-xs text-muted-foreground">{Object.keys(liveErrors).length} field(s) still need work before you can submit.</p>}
        </div>
      )}

      {canReview && (
        <div className="flex flex-wrap gap-3 rounded-xl border p-4">
          <Button disabled={busy} onClick={() => run(() => reviewFieldworkReport(reportId, "approved"), "Report approved. Client feedback is being sent.", goBack)}>Approve and send feedback</Button>
          <Button variant="outline" disabled={busy} onClick={() => setReturning(true)}>Return for changes</Button>
        </div>
      )}

      {events.length > 0 && (
        <section aria-labelledby="history-h">
          <h2 id="history-h" className="text-sm font-semibold">History</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {events.map((e) => <li key={e.id}>{e.at}: {e.type.replace(/_/g, " ")}{typeof e.details.reason === "string" ? ` (${e.details.reason})` : ""}{typeof e.details.status === "string" ? ` [${e.details.status}]` : ""}</li>)}
          </ul>
        </section>
      )}

      <Dialog open={returning} onOpenChange={setReturning}>
        <DialogContent>
          <DialogHeader><DialogTitle>Return report</DialogTitle><DialogDescription>The officer will see this reason and can edit and resubmit.</DialogDescription></DialogHeader>
          <Textarea aria-label="Return reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturning(false)}>Back</Button>
            <Button variant="destructive" disabled={busy || reason.trim().length < 3} onClick={() => run(() => reviewFieldworkReport(reportId, "returned", reason), "Report returned.", goBack)}>Return report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
