export enum ApplicationTrack {
    FOUNDATION = 'FOUNDATION',
    ACCELERATION = 'ACCELERATION',
}

export enum EligibilityStatus {
    ELIGIBLE = 'ELIGIBLE',
    DISQUALIFIED = 'DISQUALIFIED',
}

export interface ScreeningFormData {
    registeredInKenya: 'yes' | 'no';
    businessType: 'limited' | 'partnership' | 'cooperative' | 'cbo' | 'sole' | 'unregistered';
    yearsInOperation: 'less_than_1' | '1_to_2' | 'more_than_2';
    annualRevenue: 'less_than_500k' | '500k_to_3m' | 'more_than_3m';
    employees: '1_to_4' | '5_to_20' | 'more_than_20';
    hasFinancialRecords: 'yes' | 'no';
    hasAuditedAccounts: 'yes' | 'no';
}

export interface EligibilityResult {
    status: EligibilityStatus;
    track?: ApplicationTrack;
    reasons?: string[];
}
