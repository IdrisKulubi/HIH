import { requireKycVerified } from "@/lib/guards/require-kyc-verified";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EnterpriseCnaPage() {
  await requireKycVerified();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Capacity needs assessment</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Your enterprise CNA workspace will appear here after KYC verification. Coordinators may also record
            diagnostics from the admin console.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
