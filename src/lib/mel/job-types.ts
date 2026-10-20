export const MEL_JOB_TYPE = {
  directQuality: "direct_quality",
  directNonQuality: "direct_non_quality",
  indirect: "indirect",
  legacyDirect: "direct",
} as const;

export type MelMonitoringJobType =
  | typeof MEL_JOB_TYPE.directQuality
  | typeof MEL_JOB_TYPE.directNonQuality
  | typeof MEL_JOB_TYPE.indirect;

type JobRow = { jobType: string; quarterlyTotal?: number | null };

export function findMonitoringJob<T extends JobRow>(
  jobs: T[],
  type: MelMonitoringJobType
): T | undefined {
  const match = jobs.find((job) => job.jobType === type);
  if (match) return match;
  if (type === MEL_JOB_TYPE.directQuality) {
    return jobs.find((job) => job.jobType === MEL_JOB_TYPE.legacyDirect);
  }
  return undefined;
}

export function sumDirectJobTotals(jobs: JobRow[]): number {
  return (
    (findMonitoringJob(jobs, MEL_JOB_TYPE.directQuality)?.quarterlyTotal ?? 0) +
    (findMonitoringJob(jobs, MEL_JOB_TYPE.directNonQuality)?.quarterlyTotal ?? 0)
  );
}

export type JobCountBreakdown = {
  total: number;
  male: number;
  female: number;
  youth: number;
  plwd: number;
  refugee: number;
};

export function mergeJobTotals(...jobs: Array<JobCountBreakdown | undefined>): JobCountBreakdown {
  const merged: JobCountBreakdown = { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 };
  for (const job of jobs) {
    if (!job) continue;
    merged.total += job.total;
    merged.male += job.male;
    merged.female += job.female;
    merged.youth += job.youth;
    merged.plwd += job.plwd;
    merged.refugee += job.refugee;
  }
  return merged;
}
