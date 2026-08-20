import { eq, inArray } from "drizzle-orm";
import db from "@/db/drizzle";
import {
  businesses,
  melDqaIssues,
  melEvidenceReviews,
  melLearningActions,
  melMonitoringEvidence,
  melMonitoringEvidenceReferences,
  melMonitoringFinanceEntries,
  melMonitoringJobs,
  melMonitoringResponses,
  melMonitoringSubmissions,
  melMonitoringWaste,
  melReviewDecisions,
} from "@/db/schema";

function groupBy<T, K extends string | number>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const grouped = new Map<K, T[]>();
  for (const item of items) {
    const id = key(item);
    const current = grouped.get(id);
    if (current) current.push(item);
    else grouped.set(id, [item]);
  }
  return grouped;
}

export async function loadEnterpriseExportDataset(businessId: number) {
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
    columns: {
      id: true,
      name: true,
      verificationStatus: true,
      isRegistered: true,
      registrationType: true,
      sector: true,
      sectorOther: true,
      description: true,
      country: true,
      county: true,
      city: true,
      yearsOperational: true,
    },
    with: {
      applicant: {
        columns: {
          firstName: true,
          lastName: true,
          gender: true,
          dob: true,
          phoneNumber: true,
          email: true,
        },
      },
      application: {
        columns: { track: true, status: true },
      },
      kycProfile: {
        columns: { status: true, hubName: true, gpsCoordinates: true },
      },
    },
  });
  if (!business) return null;

  const submissionRows = await db.query.melMonitoringSubmissions.findMany({
    where: eq(melMonitoringSubmissions.businessId, businessId),
    with: {
      reportingPeriod: {
        columns: { id: true, label: true, code: true, startDate: true },
      },
    },
  });
  const submissionIds = submissionRows.map((row) => row.id);

  const empty = {
    response: null as typeof melMonitoringResponses.$inferSelect | null,
    financeEntries: [] as Array<typeof melMonitoringFinanceEntries.$inferSelect>,
    jobs: [] as Array<typeof melMonitoringJobs.$inferSelect>,
    waste: [] as Array<typeof melMonitoringWaste.$inferSelect>,
    evidence: [] as Array<typeof melMonitoringEvidence.$inferSelect & { reviews: Array<typeof melEvidenceReviews.$inferSelect> }>,
    evidenceReferences: [] as Array<
      typeof melMonitoringEvidenceReferences.$inferSelect & {
        sourceEvidence: typeof melMonitoringEvidence.$inferSelect & { reviews: Array<typeof melEvidenceReviews.$inferSelect> };
      }
    >,
    reviewDecisions: [] as Array<typeof melReviewDecisions.$inferSelect>,
    dqaIssues: [] as Array<typeof melDqaIssues.$inferSelect>,
  };

  if (submissionIds.length === 0) {
    const learningActions = await db.query.melLearningActions.findMany({
      where: eq(melLearningActions.businessId, businessId),
    });
    return {
      business,
      submissions: submissionRows.map((row) => ({ ...row, ...empty })),
      learningActions,
    };
  }

  const [
    responses,
    financeEntries,
    jobs,
    waste,
    evidence,
    evidenceReferences,
    reviewDecisions,
    dqaIssues,
    learningActions,
  ] = await Promise.all([
    db.query.melMonitoringResponses.findMany({
      where: inArray(melMonitoringResponses.submissionId, submissionIds),
    }),
    db.query.melMonitoringFinanceEntries.findMany({
      where: inArray(melMonitoringFinanceEntries.submissionId, submissionIds),
    }),
    db.query.melMonitoringJobs.findMany({
      where: inArray(melMonitoringJobs.submissionId, submissionIds),
    }),
    db.query.melMonitoringWaste.findMany({
      where: inArray(melMonitoringWaste.submissionId, submissionIds),
    }),
    db.query.melMonitoringEvidence.findMany({
      where: inArray(melMonitoringEvidence.submissionId, submissionIds),
    }),
    db.query.melMonitoringEvidenceReferences.findMany({
      where: inArray(melMonitoringEvidenceReferences.submissionId, submissionIds),
    }),
    db.query.melReviewDecisions.findMany({
      where: inArray(melReviewDecisions.submissionId, submissionIds),
    }),
    db.query.melDqaIssues.findMany({
      where: inArray(melDqaIssues.submissionId, submissionIds),
    }),
    db.query.melLearningActions.findMany({
      where: eq(melLearningActions.businessId, businessId),
    }),
  ]);

  const sourceEvidenceIds = [...new Set(evidenceReferences.map((reference) => reference.sourceEvidenceId))];
  const reviewEvidenceIds = [...new Set([...evidence.map((item) => item.id), ...sourceEvidenceIds])];
  const [sourceEvidence, reviews] = await Promise.all([
    sourceEvidenceIds.length > 0
      ? db.query.melMonitoringEvidence.findMany({
          where: inArray(melMonitoringEvidence.id, sourceEvidenceIds),
        })
      : Promise.resolve([]),
    reviewEvidenceIds.length > 0
      ? db.query.melEvidenceReviews.findMany({
          where: inArray(melEvidenceReviews.evidenceId, reviewEvidenceIds),
        })
      : Promise.resolve([]),
  ]);

  const reviewsByEvidence = groupBy(reviews, (item) => item.evidenceId);
  const sourceById = new Map(sourceEvidence.map((item) => [item.id, item]));
  const financeBySubmission = groupBy(financeEntries, (item) => item.submissionId);
  const jobsBySubmission = groupBy(jobs, (item) => item.submissionId);
  const wasteBySubmission = groupBy(waste, (item) => item.submissionId);
  const evidenceBySubmission = groupBy(evidence, (item) => item.submissionId);
  const referencesBySubmission = groupBy(evidenceReferences, (item) => item.submissionId);
  const decisionsBySubmission = groupBy(reviewDecisions, (item) => item.submissionId);
  const dqaBySubmission = groupBy(dqaIssues, (item) => item.submissionId);
  const responseBySubmission = new Map(responses.map((item) => [item.submissionId, item]));

  const submissions = submissionRows.map((row) => ({
    ...row,
    response: responseBySubmission.get(row.id) ?? null,
    financeEntries: financeBySubmission.get(row.id) ?? [],
    jobs: jobsBySubmission.get(row.id) ?? [],
    waste: wasteBySubmission.get(row.id) ?? [],
    evidence: (evidenceBySubmission.get(row.id) ?? []).map((item) => ({
      ...item,
      reviews: reviewsByEvidence.get(item.id) ?? [],
    })),
    evidenceReferences: (referencesBySubmission.get(row.id) ?? []).flatMap((reference) => {
      const source = sourceById.get(reference.sourceEvidenceId);
      if (!source) return [];
      return [{
        ...reference,
        sourceEvidence: {
          ...source,
          reviews: reviewsByEvidence.get(source.id) ?? [],
        },
      }];
    }),
    reviewDecisions: decisionsBySubmission.get(row.id) ?? [],
    dqaIssues: dqaBySubmission.get(row.id) ?? [],
  }));

  return { business, submissions, learningActions };
}

export type EnterpriseExportDataset = NonNullable<Awaited<ReturnType<typeof loadEnterpriseExportDataset>>>;
