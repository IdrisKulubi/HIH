import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { parseA2fPipelineId } from "@/lib/a2f-routes";
import { A2fEntryLayoutClient } from "./A2fEntryLayoutClient";

export default async function A2fEntryLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const session = await auth();
    const userRole = session?.user?.role ?? "";

    if (userRole === "a2f_committee") {
        const a2fId = parseA2fPipelineId(id);
        redirect(a2fId ? `/a2f/committee/${a2fId}` : "/a2f/committee");
    }

    const a2fId = parseA2fPipelineId(id);
    if (a2fId === null) {
        redirect("/a2f");
    }

    return (
        <A2fEntryLayoutClient a2fId={a2fId} viewerRole={userRole}>
            {children}
        </A2fEntryLayoutClient>
    );
}
