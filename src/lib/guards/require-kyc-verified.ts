import { auth } from "@/auth";
import db from "@/db/drizzle";
import { applications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

const BYPASS_KYC_GATE_ROLES = new Set([
  "admin",
  "oversight",
  "reviewer_1",
  "reviewer_2",
  "technical_reviewer",
  "a2f_officer",
]);

/**
 * For enterprise routes post-selection: approved/finalist applicants must be KYC-verified.
 * Staff roles bypass the gate.
 */
export async function requireKycVerified() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = session.user.role ?? "applicant";
  if (BYPASS_KYC_GATE_ROLES.has(role)) {
    return session;
  }

  const app = await db.query.applications.findFirst({
    where: eq(applications.userId, session.user.id),
  });

  const mustCompleteKyc =
    app &&
    (app.status === "approved" || app.status === "finalist") &&
    app.kycStatus !== "verified";

  if (mustCompleteKyc) {
    redirect("/kyc");
  }

  return session;
}
