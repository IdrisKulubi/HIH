import { requireKycVerified } from "@/lib/guards/require-kyc-verified";
import { getEnterpriseCdpReadonly } from "@/lib/actions/cdp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CDP_FOCUS_AREAS, priorityFromScore0to10, priorityLabel } from "@/lib/cdp/focus-areas";

export default async function EnterpriseCnaPage() {
  await requireKycVerified();

  const cdp = await getEnterpriseCdpReadonly();

  if (!cdp.success) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Capacity development</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{cdp.error ?? "Something went wrong."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const plan = cdp.data;

  if (!plan) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Capacity development plan</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Your CDP will appear here once programme staff have created a plan and marked it <strong>active</strong>.
              You can still complete KYC and other programme steps from your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summaries = [...plan.focusSummaries].sort((a, b) =>
    a.focusCode.localeCompare(b.focusCode)
  );

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Your capacity development plan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>
            Diagnostic date: <span className="text-foreground">{plan.diagnosticDate}</span>
            {plan.cdpReviewDate ? (
              <>
                {" "}
                · CDP review: <span className="text-foreground">{plan.cdpReviewDate}</span>
              </>
            ) : null}
          </p>
          <p className="text-xs">This is a read-only view. Contact your Business Support Staff to request updates.</p>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Diagnostic summary (A–L)</h2>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Focus area</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Recommended intervention</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((s) => (
                <TableRow key={s.focusCode}>
                  <TableCell className="font-mono">{s.focusCode}</TableCell>
                  <TableCell className="text-sm">{CDP_FOCUS_AREAS[s.focusCode].label}</TableCell>
                  <TableCell>{s.score0to10}</TableCell>
                  <TableCell className="text-xs max-w-[200px] text-muted-foreground">
                    {priorityLabel(priorityFromScore0to10(s.score0to10))}
                  </TableCell>
                  <TableCell className="text-sm max-w-md">{s.recommendedIntervention ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Agreed activities</h2>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground text-sm">
                    No activities recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                plan.activities.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono">{a.focusCode}</TableCell>
                    <TableCell className="text-sm">{a.intervention}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{a.targetDate ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {plan.supportSessions.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Support sessions</h2>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Focus</TableHead>
                  <TableHead>Agenda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.supportSessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.sessionNumber}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {s.sessionDate ? new Date(s.sessionDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{(s.focusCodes ?? []).join(", ") || "—"}</TableCell>
                    <TableCell className="text-sm max-w-md">{s.agenda ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
