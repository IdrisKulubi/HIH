import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCurrentUserKycProfile } from "@/lib/actions";
import { KycProfileClient } from "@/components/kyc/KycProfileClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function KycPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // if (session.user.role === "admin" || session.user.role === "oversight") {
  //   redirect("/admin/kyc");
  // }

  if (["reviewer_1", "reviewer_2", "technical_reviewer", "a2f_officer"].includes(session.user.role || "")) {
    redirect("/profile");
  }

  const result = await getCurrentUserKycProfile();

  if (!result.success || !result.data) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>KYC Not Available</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">{result.error || "This account cannot access KYC yet."}</p>
            <Button asChild>
              <Link href="/profile">Back to Profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Enterprise KYC</h1>
        <p className="text-slate-600">
          You were selected for the programme. Complete this compliance profile and submit the required documents to unlock
          mentorship, capacity needs assessment, monitoring, and funding support.
        </p>
      </div>
      <KycProfileClient data={result.data} />
    </div>
  );
}
