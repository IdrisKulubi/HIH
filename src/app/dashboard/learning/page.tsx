import { eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import db from "@/db/drizzle";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/actions/user.actions";

export const dynamic = "force-dynamic";

type KajabiStatus = "NOT_STARTED" | "REGISTERED" | "COMPLETED";

function kajabiBadgeClass(status: KajabiStatus) {
  switch (status) {
    case "REGISTERED":
      return "border-transparent bg-amber-100 text-amber-800";
    case "COMPLETED":
      return "border-transparent bg-emerald-100 text-emerald-800";
    default:
      return "border-transparent bg-slate-100 text-slate-700";
  }
}

function kajabiStatusLabel(status: KajabiStatus) {
  switch (status) {
    case "REGISTERED":
      return "Registered";
    case "COMPLETED":
      return "Completed";
    default:
      return "Not Started";
  }
}

export default async function DashboardLearningPage() {
  const sessionUser = await getCurrentUser();
  const kajabiUrl = process.env.KAJABI_URL;

  const row = sessionUser?.id
    ? await db.query.users.findFirst({
        where: eq(users.id, sessionUser.id),
        columns: {
          kajabiStatus: true,
        },
      })
    : null;

  const status: KajabiStatus = row?.kajabiStatus ?? "NOT_STARTED";

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Learning
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open Kajabi in a new tab to take the course. This page does not track
          Kajabi logins.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Enterprise Learning Center</CardTitle>
          <Badge className={kajabiBadgeClass(status)}>
            {kajabiStatusLabel(status)}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {kajabiUrl ? (
            <Button asChild className="bg-brand-blue hover:bg-brand-blue-dark">
              <a
                href={kajabiUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Access Kajabi Learning Portal
                <ExternalLink className="size-4" />
              </a>
            </Button>
          ) : (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              The Kajabi learning portal URL is not configured. Please contact
              the programme team.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Note: You will be required to create a separate account or log in to
            the Kajabi platform.
          </p>
          {status === "NOT_STARTED" ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Signing in on Kajabi will not change this badge. It stays{" "}
              <span className="font-medium">Not Started</span> until Kajabi
              sends a webhook for the same email you use here (
              <code className="rounded bg-white px-1">offer.granted</code> →
              Registered,{" "}
              <code className="rounded bg-white px-1">course.completed</code> →
              Completed). Then refresh this page.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
