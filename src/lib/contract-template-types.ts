/** Shared contract / offer letter template fields (client-safe). */
export interface ContractTemplateVariables {
    enterpriseName: string;
    applicantName: string;
    applicantEmail: string;
    county: string;
    agreementType: string;
    totalProjectAmount: string;
    hihContribution: string;
    enterpriseContribution: string;
    termMonths: number;
    interestRate: number;
    gracePeriodMonths: number;
    repaymentStartDate: string;
    firstRepaymentDue: string;
}
