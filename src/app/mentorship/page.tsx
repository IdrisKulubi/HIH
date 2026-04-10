import { requireKycVerified } from "@/lib/guards/require-kyc-verified";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EnterpriseMentorshipPage() {
  await requireKycVerified();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Mentorship</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Session scheduling, evidence uploads, and progress will surface here for verified enterprises. Admin staff
            manage matches and completion rules from the mentorship console.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
