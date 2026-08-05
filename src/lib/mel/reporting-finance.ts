export const FUNDING_TYPE_LABELS = {
  loan: "Loan",
  matching_grant: "Matching Grant",
  repayable_grant: "Repayable Grant",
  other: "Other",
} as const;

export type FundingType = keyof typeof FUNDING_TYPE_LABELS;

export type FundingTypeBreakdown = {
  type: FundingType;
  label: string;
  amount: number;
  enterpriseCount: number;
  percentage: number;
};

type FundingRecord = {
  businessId: number;
  financeValue: number | null;
  financeEntries: Array<{
    financeType: string;
    amount: number;
  }>;
};

const FUNDING_TYPES = Object.keys(FUNDING_TYPE_LABELS) as FundingType[];

export function buildFundingTypeBreakdown(records: FundingRecord[]): FundingTypeBreakdown[] {
  const amounts = new Map<FundingType, number>(FUNDING_TYPES.map((type) => [type, 0]));
  const enterprises = new Map<FundingType, Set<number>>(
    FUNDING_TYPES.map((type) => [type, new Set<number>()])
  );

  for (const record of records) {
    const entries = record.financeEntries.length > 0
      ? record.financeEntries
      : record.financeValue && record.financeValue > 0
        ? [{ financeType: "other", amount: record.financeValue }]
        : [];

    for (const entry of entries) {
      const type = isFundingType(entry.financeType) ? entry.financeType : "other";
      const amount = Number.isFinite(entry.amount) && entry.amount >= 0 ? entry.amount : 0;
      amounts.set(type, (amounts.get(type) ?? 0) + amount);
      if (amount > 0) enterprises.get(type)?.add(record.businessId);
    }
  }

  const total = FUNDING_TYPES.reduce((sum, type) => sum + (amounts.get(type) ?? 0), 0);
  return FUNDING_TYPES.map((type) => {
    const amount = amounts.get(type) ?? 0;
    return {
      type,
      label: FUNDING_TYPE_LABELS[type],
      amount,
      enterpriseCount: enterprises.get(type)?.size ?? 0,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    };
  });
}

function isFundingType(value: string): value is FundingType {
  return value in FUNDING_TYPE_LABELS;
}
