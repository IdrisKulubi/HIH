import { MatchingGrantApplicationWizard } from "@/app/a2f/[id]/matching-grant/page";
import { auth } from "@/auth";
import { assertApplicantOwnsPipeline } from "@/lib/a2f-access";
import { redirect } from "next/navigation";

export default async function ApplicantMatchingGrantPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");
    const { id } = await params;
    const a2fId = Number(id);
    if (!Number.isInteger(a2fId) || a2fId <= 0) {
        redirect("/access-to-finance");
    }
    const ownership = await assertApplicantOwnsPipeline(session.user.id, a2fId);
    if (!ownership.ok) {
        redirect("/access-to-finance");
    }
    return <MatchingGrantApplicationWizard a2fId={a2fId} mode="applicant" />;
}
