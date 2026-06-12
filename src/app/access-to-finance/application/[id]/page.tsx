import { MatchingGrantApplicationWizard } from "@/app/a2f/[id]/matching-grant/page";
import { auth } from "@/auth";
import { checkApplicantCanStartMatchingGrant } from "@/lib/a2f-applicant-eligibility";
import { redirect } from "next/navigation";

export default async function ApplicantMatchingGrantPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");
    const eligibility = await checkApplicantCanStartMatchingGrant(session.user.id);
    const { id } = await params;
    if (!eligibility.eligible || eligibility.a2fId !== Number(id)) {
        redirect("/access-to-finance");
    }
    return <MatchingGrantApplicationWizard a2fId={Number(id)} mode="applicant" />;
}
