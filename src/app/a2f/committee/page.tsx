import { getCommitteePipelineList } from "@/lib/actions/a2f-committee";
import { CommitteeDashboardClient } from "@/components/a2f/committee/CommitteeDashboardClient";

export default async function A2fCommitteePage() {
    const res = await getCommitteePipelineList();

    return (
        <CommitteeDashboardClient
            initialItems={res.success && res.data ? res.data : []}
            initialError={res.success ? undefined : res.error ?? "Failed to load cases"}
        />
    );
}
