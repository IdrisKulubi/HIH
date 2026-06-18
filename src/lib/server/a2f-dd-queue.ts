import db from "@/db/drizzle";
import { a2fDueDiligenceReports, a2fPipeline } from "@/db/schema";
import { and, eq, inArray, notExists, sql } from "drizzle-orm";

const AWAITING_INITIAL_DD_STATUSES = ["a2f_pipeline", "due_diligence_initial"] as const;

export function a2fCasesAwaitingInitialDdWhere() {
    return and(
        eq(a2fPipeline.screeningRequired, false),
        inArray(a2fPipeline.status, [...AWAITING_INITIAL_DD_STATUSES]),
        notExists(
            db
                .select({ id: a2fDueDiligenceReports.id })
                .from(a2fDueDiligenceReports)
                .where(
                    and(
                        eq(a2fDueDiligenceReports.a2fId, a2fPipeline.id),
                        eq(a2fDueDiligenceReports.stage, "initial"),
                        eq(a2fDueDiligenceReports.isComplete, true)
                    )
                )
        )
    );
}

export async function countA2fCasesAwaitingInitialDd(): Promise<number> {
    const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(a2fPipeline)
        .where(a2fCasesAwaitingInitialDdWhere());

    return row?.count ?? 0;
}
