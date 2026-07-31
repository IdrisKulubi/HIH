export type JobBreakdown = {
  total: number;
  male: number;
  female: number;
  youth: number;
  plwd: number;
  refugee: number;
};

export function calculateProfitLoss(revenue: number, costs: number): number {
  return revenue - costs;
}

export function quarterlyToMonthlyEquivalent(value: number): number {
  return value / 3;
}

export function addJobBreakdowns(...rows: JobBreakdown[]): JobBreakdown {
  return rows.reduce<JobBreakdown>(
    (total, row) => ({
      total: total.total + row.total,
      male: total.male + row.male,
      female: total.female + row.female,
      youth: total.youth + row.youth,
      plwd: total.plwd + row.plwd,
      refugee: total.refugee + row.refugee,
    }),
    { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 }
  );
}

export function jobBreakdownIssues(label: string, row: JobBreakdown): string[] {
  const issues: string[] = [];
  for (const [key, value] of Object.entries(row)) {
    if (!Number.isInteger(value) || value < 0) issues.push(`${label} ${key} must be a whole number of zero or more`);
  }
  if (row.male + row.female !== row.total) {
    issues.push(`${label} male and female jobs must equal the total`);
  }
  for (const dimension of ["youth", "plwd", "refugee"] as const) {
    if (row[dimension] > row.total) issues.push(`${label} ${dimension} jobs cannot exceed the total`);
  }
  return issues;
}
