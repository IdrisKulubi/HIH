import { auth } from "@/auth";
import { getApplicantMatchingGrantReturnGate } from "@/lib/matching-grant-return";
import { MatchingGrantReapplicationGate } from "@/components/a2f/MatchingGrantReapplicationGate";

export async function ApplicantMatchingGrantGateShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "applicant") {
    return children;
  }

  const gate = await getApplicantMatchingGrantReturnGate(session.user.id);

  return (
    <>
      <MatchingGrantReapplicationGate gate={gate} />
      {children}
    </>
  );
}
