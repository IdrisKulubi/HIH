"use client";

import { use } from "react";
import { MatchingGrantApplicationWizard } from "@/app/a2f/[id]/matching-grant/page";

export default function ApplicantMatchingGrantPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    return <MatchingGrantApplicationWizard a2fId={Number(id)} mode="applicant" />;
}
