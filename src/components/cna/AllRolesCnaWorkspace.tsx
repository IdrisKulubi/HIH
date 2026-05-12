"use client";

import type { CnaRoleWorkspace } from "@/lib/actions/role-cna";
import { CnaFinalizeCdpButton } from "@/components/admin/cna/CnaFinalizeCdpButton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleCnaWorkspace } from "@/components/cna/RoleCnaWorkspace";
import type { CnaReviewerRole } from "@/lib/cna/role-based-types";

function roleLabel(role: CnaReviewerRole) {
  switch (role) {
    case "mentor":
      return "Mentor";
    case "bds_edo":
      return "BDS / EDO";
    case "investment_analyst":
      return "Investment Analyst";
    case "mel":
      return "MEL";
  }
}

export function AllRolesCnaWorkspace({
  workspaces,
}: {
  workspaces: CnaRoleWorkspace[];
}) {
  const first = workspaces[0];
  const assessment = first.assessment;
  const result = first.result;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="secondary">All CNA roles</Badge>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">{first.business.name}</h1>
            <p className="text-sm text-muted-foreground">
              {first.business.applicantName} - {first.business.applicantEmail}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Status: <span className="font-medium">{assessment.status}</span>
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="text-sm text-muted-foreground">
              Overall score{" "}
              <span className="font-semibold text-slate-950">{result.overallScore}%</span>
            </div>
            <CnaFinalizeCdpButton
              businessId={first.business.id}
              assessmentId={assessment.id}
              disabled={assessment.status === "archived"}
              redirectToPlan={false}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {result.roleCompletions.map((role) => (
            <div key={role.role} className="rounded-md border bg-background p-3">
              <p className="text-sm font-medium">{roleLabel(role.role)}</p>
              <p className={role.isComplete ? "mt-1 text-xs text-emerald-700" : "mt-1 text-xs text-amber-700"}>
                {role.answeredQuestions}/{role.totalQuestions} answered
              </p>
            </div>
          ))}
        </div>
      </div>

      <Tabs defaultValue={workspaces[0]?.viewerRole} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          {workspaces.map((workspace) => {
            const completion = result.roleCompletions.find((role) => role.role === workspace.viewerRole);
            return (
              <TabsTrigger key={workspace.viewerRole} value={workspace.viewerRole} className="gap-2">
                {roleLabel(workspace.viewerRole)}
                <span className="text-xs opacity-70">
                  {completion?.answeredQuestions ?? 0}/{completion?.totalQuestions ?? workspace.questions.length}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {workspaces.map((workspace) => (
          <TabsContent key={workspace.viewerRole} value={workspace.viewerRole}>
            <RoleCnaWorkspace workspace={workspace} showHeader={false} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
