import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import {
    MATCHING_GRANT_CAPEX_CATEGORIES,
    filterFilledBudgetItems,
    filterFilledJobs,
    filterFilledMilestones,
    filterFilledOtherOwners,
    resolveAnnualRevenueForEligibility,
} from "@/lib/matching-grant-form-types";
import { countMandatoryMgDocumentsEnclosed } from "@/lib/mg-supporting-documents";
import { type MatchingGrantApplicationView } from "@/lib/matching-grant-application-view";

const GREEN = "#0f5c45";
const GREEN_SOFT = "#e7f3ee";
const SLATE_900 = "#0f172a";
const SLATE_600 = "#475569";
const SLATE_200 = "#e2e8f0";

const styles = StyleSheet.create({
    page: {
        paddingTop: 36,
        paddingBottom: 52,
        paddingHorizontal: 36,
        fontSize: 9,
        fontFamily: "Helvetica",
        color: SLATE_900,
        lineHeight: 1.4,
    },
    banner: {
        backgroundColor: GREEN,
        borderRadius: 4,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 14,
    },
    kicker: {
        fontSize: 8,
        color: "#d1fae5",
        fontFamily: "Helvetica-Bold",
        textTransform: "uppercase",
        marginBottom: 3,
    },
    title: {
        fontSize: 16,
        fontFamily: "Helvetica-Bold",
        color: "#ffffff",
    },
    subtitle: {
        fontSize: 10,
        color: "#d1fae5",
        marginTop: 2,
    },
    enterprise: {
        fontSize: 13,
        fontFamily: "Helvetica-Bold",
        marginBottom: 2,
    },
    meta: {
        fontSize: 8,
        color: SLATE_600,
        marginBottom: 8,
    },
    metricRow: {
        flexDirection: "row",
        marginBottom: 12,
    },
    metric: {
        width: 124,
        marginRight: 8,
        backgroundColor: GREEN_SOFT,
        borderRadius: 4,
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    metricLabel: {
        fontSize: 7,
        color: SLATE_600,
        marginBottom: 2,
    },
    metricValue: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
    },
    notice: {
        borderWidth: 1,
        borderColor: "#fcd34d",
        backgroundColor: "#fffbeb",
        borderRadius: 4,
        padding: 8,
        marginBottom: 10,
    },
    noticeLabel: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        marginBottom: 2,
    },
    section: {
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 11,
        fontFamily: "Helvetica-Bold",
        color: GREEN,
        borderBottomWidth: 1,
        borderBottomColor: SLATE_200,
        paddingBottom: 3,
        marginTop: 8,
        marginBottom: 6,
    },
    group: {
        marginBottom: 6,
        paddingLeft: 6,
        borderLeftWidth: 2,
        borderLeftColor: "#b7d9cc",
    },
    groupTitle: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        marginBottom: 3,
    },
    qa: {
        marginBottom: 5,
    },
    question: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        color: SLATE_600,
        marginBottom: 1,
    },
    answer: {
        fontSize: 9,
        color: SLATE_900,
    },
    footer: {
        position: "absolute",
        bottom: 22,
        left: 36,
        right: 36,
        fontSize: 7,
        color: SLATE_600,
        textAlign: "center",
        borderTopWidth: 1,
        borderTopColor: SLATE_200,
        paddingTop: 6,
    },
});

export interface MatchingGrantPdfField {
    question: string;
    answer: string;
}

export interface MatchingGrantPdfGroup {
    title: string;
    fields: MatchingGrantPdfField[];
}

export interface MatchingGrantPdfSection {
    title: string;
    fields: MatchingGrantPdfField[];
    groups: MatchingGrantPdfGroup[];
    emptyMessage?: string;
}

export interface MatchingGrantPdfModel {
    enterpriseName: string;
    statusLabel: string;
    trackLabel: string;
    annualRevenue: string;
    bireShare: string;
    enterpriseShare: string;
    generatedAt: string;
    updatedAt: string | null;
    returnReason: string | null;
    fileName: string;
    adjustments: string[];
    sections: MatchingGrantPdfSection[];
}

export interface MatchingGrantPdfContext {
    pipelineRevenue: number;
    track: string | null | undefined;
    returnReason?: string | null;
    updatedAt?: unknown;
    declarationAcceptedAt?: unknown;
    generatedAt?: Date;
}

const MAX_PRINTABLE_AMOUNT = 1_000_000_000_000;
const UNUSUAL_CHARACTERS = /[^\n\r\t\x20-\x7E\u00A0-\u00FF]/;

function preparePdfText(value: string | null | undefined): { text: string; problem?: string } {
    const trimmed = (value ?? "").trim();
    if (!trimmed) return { text: "Not answered" };

    const normalized = trimmed
        .replace(/[\u2018\u2019\u2032]/g, "'")
        .replace(/[\u201C\u201D]/g, "\"")
        .replace(/[\u2013\u2014\u2212]/g, "-")
        .replace(/\u2026/g, "...")
        .replace(/[\u00A0\u202F\u2007\u2009]/g, " ")
        .replace(/[\u200B-\u200D\uFEFF]/g, "");
    const hadUnusualCharacters = UNUSUAL_CHARACTERS.test(normalized);
    const printable = normalized
        .replace(new RegExp(UNUSUAL_CHARACTERS.source, "g"), "")
        .replace(/[^\S\n]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .replace(/\S{48}/g, (token) => `${token} `);

    if (!printable) {
        return {
            text: "Not answered. The original answer used symbols that cannot be printed in this PDF. Re-enter it in plain text, or type None if it does not apply.",
            problem: "unusual symbols were removed and nothing readable was left",
        };
    }
    if (hadUnusualCharacters) {
        return { text: printable, problem: "unusual symbols were removed" };
    }
    return { text: printable };
}

function answered(value: string | null | undefined): string {
    return preparePdfText(value).text;
}

function formatAmount(value: number): string {
    const negative = value < 0;
    const absolute = Math.abs(value);
    const rounded = Math.round(absolute * 100) / 100;
    const [whole, fraction] = rounded.toFixed(2).split(".");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const amount = fraction === "00" ? grouped : `${grouped}.${fraction}`;
    return negative ? `-${amount}` : amount;
}

function kes(value: number | null | undefined): { text: string; problem?: string } {
    if (value == null || !Number.isFinite(value)) return { text: "Not answered" };
    if (Math.abs(value) > MAX_PRINTABLE_AMOUNT) {
        return {
            text: "Not a valid amount. Enter a normal figure in Kenyan shillings, or None if this does not apply.",
            problem: "the number is too large to print",
        };
    }
    return { text: `KES ${formatAmount(value)}` };
}

function share(part: number, total: number): string {
    if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return "0%";
    if (Math.abs(part) > MAX_PRINTABLE_AMOUNT || Math.abs(total) > MAX_PRINTABLE_AMOUNT) {
        return "Not a valid percentage";
    }
    const pct = Math.round((part / total) * 1000) / 10;
    if (!Number.isFinite(pct) || Math.abs(pct) > 1000) return "Not a valid percentage";
    return `${pct}%`;
}

function countAnswer(value: number | null): { text: string; problem?: string } {
    if (value == null || !Number.isFinite(value)) return { text: "Not answered" };
    if (Math.abs(value) > 1_000_000) {
        return {
            text: "Not a valid count. Enter a normal number, or None if this does not apply.",
            problem: "the number is too large to print",
        };
    }
    return { text: String(value) };
}

function percentAnswer(value: number): { text: string; problem?: string } {
    if (!Number.isFinite(value) || Math.abs(value) > 1000) {
        return {
            text: "Not a valid percentage. Enter a number from 0 to 100.",
            problem: "the percentage is not a usable number",
        };
    }
    return { text: `${value}%` };
}

function formatStamp(value: unknown): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function statusLabel(status: string): string {
    if (status === "submitted") return "Submitted";
    if (status === "returned_for_correction") return "Returned for correction";
    return "Draft";
}

function capexCategoryLabel(value: string): string {
    const match = MATCHING_GRANT_CAPEX_CATEGORIES.find((item) => item.value === value);
    return match?.label ?? answered(value);
}

export function matchingGrantPdfFileName(enterpriseName: string): string {
    const base = enterpriseName
        .trim()
        .replace(/[^\w\s-]+/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
    return `${base || "enterprise"}-access-to-finance-application.pdf`;
}

function field(question: string, answer: string): MatchingGrantPdfField {
    return { question, answer };
}

function section(
    title: string,
    fields: MatchingGrantPdfField[],
    groups: MatchingGrantPdfGroup[] = [],
    emptyMessage?: string
): MatchingGrantPdfSection {
    return { title, fields, groups, emptyMessage };
}

export function buildMatchingGrantPdfModel(
    view: MatchingGrantApplicationView,
    context: MatchingGrantPdfContext
): MatchingGrantPdfModel {
    const generatedAt = context.generatedAt ?? new Date();
    const enterpriseName = view.enterprise.name.trim() || "Enterprise";
    const revenue = resolveAnnualRevenueForEligibility(view.financial, context.pipelineRevenue);
    const owners = filterFilledOtherOwners(view.otherOwners);
    const budget = filterFilledBudgetItems(view.budgetItems);
    const milestones = filterFilledMilestones(view.milestones);
    const jobs = filterFilledJobs(view.jobs);
    const documents = countMandatoryMgDocumentsEnclosed(view.documents);
    const acceptedAt = formatStamp(context.declarationAcceptedAt);
    const adjustments: string[] = [];
    const money = (question: string, value: number | null | undefined) => {
        const formatted = kes(value);
        if (formatted.problem) adjustments.push(`${question} (${formatted.problem})`);
        return formatted.text;
    };
    const count = (question: string, value: number | null) => {
        const formatted = countAnswer(value);
        if (formatted.problem) adjustments.push(`${question} (${formatted.problem})`);
        return formatted.text;
    };
    const percent = (question: string, value: number) => {
        const formatted = percentAnswer(value);
        if (formatted.problem) adjustments.push(`${question} (${formatted.problem})`);
        return formatted.text;
    };
    const textAnswer = (question: string, value: string | null | undefined) => {
        const prepared = preparePdfText(value);
        if (prepared.problem) adjustments.push(`${question} (${prepared.problem})`);
        return prepared.text;
    };

    return {
        enterpriseName: preparePdfText(enterpriseName).text,
        statusLabel: statusLabel(view.status),
        trackLabel: context.track === "acceleration" ? "Accelerator" : "Foundation",
        annualRevenue: revenue > 0 && revenue <= MAX_PRINTABLE_AMOUNT ? `KES ${formatAmount(revenue)}` : revenue > MAX_PRINTABLE_AMOUNT ? "Not a valid amount" : "Not set",
        bireShare: share(view.bireGrantAmount, view.totalProjectAmount),
        enterpriseShare: share(view.enterpriseContributionAmount, view.totalProjectAmount),
        generatedAt: formatStamp(generatedAt) ?? generatedAt.toISOString(),
        updatedAt: formatStamp(context.updatedAt),
        returnReason: context.returnReason?.trim() ? context.returnReason.trim() : null,
        fileName: matchingGrantPdfFileName(enterpriseName),
        adjustments,
        sections: [
            section("1. Enterprise identification", [
                field("Enterprise name", textAnswer("Enterprise name", view.enterprise.name)),
                field("Trading name", textAnswer("Trading name", view.enterprise.tradingName)),
                field("Registration number", textAnswer("Registration number", view.enterprise.registrationNumber)),
                field("Legal structure", textAnswer("Legal structure", view.enterprise.legalStructure)),
                field("Registration date", textAnswer("Registration date", view.enterprise.registrationDate)),
                field("Year operations started", textAnswer("Year operations started", view.enterprise.yearOperationsStarted)),
                field("Sector", textAnswer("Sector", view.enterprise.sector)),
                field("County", textAnswer("County", view.enterprise.county)),
                field("Sub-county / ward", textAnswer("Sub-county / ward", view.enterprise.subCountyWard)),
                field("GPS / pin location", textAnswer("GPS / pin location", view.enterprise.gpsLocation)),
                field("Physical address", textAnswer("Physical address", view.enterprise.physicalAddress)),
                field("Postal address", textAnswer("Postal address", view.enterprise.postalAddress)),
                field("Ownership structure", textAnswer("Ownership structure", view.enterprise.ownershipStructure)),
            ]),
            section("2. Lead entrepreneur", [
                field("Full name", textAnswer("Full name", view.lead.name)),
                field("ID / passport number", textAnswer("ID / passport number", view.lead.idNumber)),
                field("Gender", textAnswer("Gender", view.lead.gender)),
                field("Date of birth", textAnswer("Date of birth", view.lead.dateOfBirth)),
                field("Applicant category", textAnswer("Applicant category", view.lead.applicantCategory)),
                field("Role in enterprise", textAnswer("Role in enterprise", view.lead.role)),
                field("Phone", textAnswer("Phone", view.lead.phone)),
                field("Email", textAnswer("Email", view.lead.email)),
                field("Education", textAnswer("Education", view.lead.education)),
                field("Relevant experience", textAnswer("Relevant experience", view.lead.experience)),
            ]),
            section(
                "3. Other owners or partners",
                [],
                owners.map((row, index) => ({
                    title: `Owner / partner ${index + 1}`,
                    fields: [
                        field("Name", textAnswer(`Owner / partner ${index + 1} name`, row.name)),
                        field("Role", textAnswer(`Owner / partner ${index + 1} role`, row.role)),
                        field("Ownership %", percent(`Owner / partner ${index + 1} ownership`, row.ownershipPct)),
                        field("Gender", textAnswer(`Owner / partner ${index + 1} gender`, row.gender)),
                        field("Category", textAnswer(`Owner / partner ${index + 1} category`, row.category)),
                    ],
                })),
                "No other owners or partners were added."
            ),
            section("4. Programme engagement", [
                field("BIRE client ID", textAnswer("BIRE client ID", view.programme.bireClientId)),
                field("Regional hub", textAnswer("Regional hub", view.programme.regionalHub)),
                field("TA lead", textAnswer("TA lead", view.programme.taLead)),
                field("Date joined programme", textAnswer("Date joined programme", view.programme.dateJoined)),
                field("Duration in TA support (months)", textAnswer("Duration in TA support (months)", view.programme.taDurationMonths)),
                field("Key TA milestones achieved", textAnswer("Key TA milestones achieved", view.programme.taMilestones)),
                field("Programme support received", textAnswer("Programme support received", view.programme.supportReceived)),
            ]),
            section("5. Financial overview", [
                field("Annual revenue 2025 (KES)", money("Annual revenue 2025", view.financial.annualRevenue2025)),
                field("Annual revenue 2024 (KES)", money("Annual revenue 2024", view.financial.annualRevenue2024)),
                field("Annual revenue 2023 (KES)", money("Annual revenue 2023", view.financial.annualRevenue2023)),
                field("Average monthly revenue (KES)", money("Average monthly revenue", view.financial.monthlyRevenue)),
                field("Monthly operating costs (KES)", money("Monthly operating costs", view.financial.monthlyOperatingCosts)),
                field("Profitability", textAnswer("Profitability", view.financial.profitability)),
                field("Full-time employees", count("Full-time employees", view.financial.employeeCount)),
                field("Casual / contract workers", count("Casual / contract workers", view.financial.casualWorkers)),
                field("Financial recordkeeping status", textAnswer("Financial recordkeeping status", view.financial.recordkeepingStatus)),
                field("Revenue streams", textAnswer("Revenue streams", view.financial.revenueStreams)),
                field("Financial obligations", textAnswer("Financial obligations", view.financial.financialObligations)),
                field("Additional financial notes", textAnswer("Additional financial notes", view.financial.narrative)),
            ]),
            section("6. Grant request and co-investment", [
                field("Project title", textAnswer("Project title", view.projectTitle)),
                field("Total project investment (KES)", money("Total project investment", view.totalProjectAmount)),
                field("BIRE grant amount (KES)", money("BIRE grant amount", view.bireGrantAmount)),
                field("Enterprise contribution (KES)", money("Enterprise contribution", view.enterpriseContributionAmount)),
                field("Preferred co-investment percentage", percent("Preferred co-investment percentage", view.preferredCoInvestmentPct)),
                field("Co-investment source", textAnswer("Co-investment source", view.coInvestmentSource)),
                field("Why is this funding needed now?", textAnswer("Why is this funding needed now?", view.fundingNeed)),
                field("What would happen without this grant?", textAnswer("What would happen without this grant?", view.withoutGrantImpact)),
                field("Co-investment notes / justification", textAnswer("Co-investment notes / justification", view.coInvestmentJustification)),
                field(
                    "CAPEX-only confirmation",
                    view.capexOnlyConfirmed
                        ? "Yes - the request is for CAPEX only (productive equipment, technology adoption, climate-resilient infrastructure, or operational upgrades)."
                        : "No"
                ),
            ]),
            section("7. Other funding and leverage", [
                field("Other grants", textAnswer("Other grants", view.otherFunding.otherGrants)),
                field("Loans", textAnswer("Loans", view.otherFunding.loans)),
                field("Investors", textAnswer("Investors", view.otherFunding.investors)),
                field("Own savings", textAnswer("Own savings", view.otherFunding.ownSavings)),
                field("Future investment / lender leverage", textAnswer("Future investment / lender leverage", view.otherFunding.leveragePotential)),
                field("Summary / additional notes", textAnswer("Summary / additional notes", view.otherFunding.description)),
            ]),
            section("8. Governance and compliance", [
                field("Registration status", textAnswer("Registration status", view.governance.registrationStatus)),
                field("KRA PIN", textAnswer("KRA PIN", view.governance.kraPin)),
                field("Sector licenses / permits", textAnswer("Sector licenses / permits", view.governance.licensesPermits)),
                field("Tax compliance", textAnswer("Tax compliance", view.governance.taxCompliance)),
                field("Litigation or disputes", textAnswer("Litigation or disputes", view.governance.litigationDisputes)),
                field("Previous grant / programme funding", textAnswer("Previous grant / programme funding", view.governance.previousProgrammeFunding)),
                field("Key risks", textAnswer("Key risks", view.governance.risks)),
                field("Mitigation plan", textAnswer("Mitigation plan", view.governance.mitigationPlan)),
                field("Compliance gaps", textAnswer("Compliance gaps", view.governance.complianceGaps)),
                field("Additional notes", textAnswer("Additional notes", view.governance.notes)),
            ]),
            section("9. Business, financial and impact overview", [
                field("Business description", textAnswer("Business description", view.business.businessDescription)),
                field("Problem solved", textAnswer("Problem solved", view.business.problemSolved)),
                field("Value chain node", textAnswer("Value chain node", view.business.valueChainNode)),
                field("Products / services", textAnswer("Products / services", view.business.productsServices)),
                field("Target market and estimated size", textAnswer("Target market and estimated size", view.business.targetMarket)),
                field("Target customers", textAnswer("Target customers", view.business.targetCustomers)),
                field("Marketing and sales strategy", textAnswer("Marketing and sales strategy", view.business.marketingSalesStrategy)),
                field("Competitive advantages", textAnswer("Competitive advantages", view.business.competitiveAdvantages)),
                field("Projected monthly revenue after investment", textAnswer("Projected monthly revenue after investment", view.projectedMonthlyRevenue)),
                field("Projected annual revenue after investment", textAnswer("Projected annual revenue after investment", view.projectedAnnualRevenue)),
                field("Projected revenue growth rate", textAnswer("Projected revenue growth rate", view.projectedGrowthRate)),
                field("Projection assumptions", textAnswer("Projection assumptions", view.projectionAssumptions)),
                field("Employment terms", textAnswer("Employment terms", view.employmentTerms)),
                field("Inclusion strategy", textAnswer("Inclusion strategy", view.inclusionStrategy)),
                field("Environmental / climate impact", textAnswer("Environmental / climate impact", view.environmentalImpact)),
                field("Environmental outcome indicators", textAnswer("Environmental outcome indicators", view.environmentalIndicators)),
                field("Value chain / community impact", textAnswer("Value chain / community impact", view.communityImpact)),
                field("Innovation element", textAnswer("Innovation element", view.innovationElement)),
            ]),
            section(
                "10. Eligible use of funds - detailed budget",
                [
                    field(
                        "Use-of-funds confirmation",
                        view.useOfFundsAcknowledged
                            ? "Yes - the budget excludes personal expenses, loan repayments, and routine overhead costs not linked to the approved CAPEX investment."
                            : "No"
                    ),
                ],
                budget.map((row, index) => ({
                    title: `Budget line ${index + 1}`,
                    fields: [
                        field("Investment item", textAnswer(`Budget line ${index + 1} item`, row.item)),
                        field("CAPEX category", capexCategoryLabel(row.category)),
                        field("Total cost", money(`Budget line ${index + 1} total cost`, row.totalCost)),
                        field("BIRE grant", money(`Budget line ${index + 1} BIRE grant`, row.bireGrant)),
                        field("Enterprise contribution", money(`Budget line ${index + 1} enterprise contribution`, row.enterpriseContribution)),
                        field(
                            "Confirmed CAPEX-eligible item",
                            row.confirmedEligible
                                ? "Yes - not a personal expense, loan repayment, or unrelated overhead."
                                : "No"
                        ),
                    ],
                })),
                budget.length === 0 ? "No budget lines were added." : undefined
            ),
            section(
                "11. Implementation milestones",
                [],
                milestones.map((row, index) => ({
                    title: `Milestone ${index + 1}`,
                    fields: [
                        field("Activity / milestone", textAnswer(`Milestone ${index + 1} activity`, row.activity)),
                        field("Expected completion", textAnswer(`Milestone ${index + 1} completion`, row.completionDate)),
                        field("Disbursement tranche", textAnswer(`Milestone ${index + 1} tranche`, row.tranche)),
                        field("Verification method", textAnswer(`Milestone ${index + 1} verification`, row.verificationMethod)),
                    ],
                })),
                "No implementation milestones were added."
            ),
            section(
                "12. Job creation plan",
                [],
                jobs.map((row, index) => ({
                    title: `Job row ${index + 1}`,
                    fields: [
                        field("Role / job type", textAnswer(`Job row ${index + 1} role`, row.role)),
                        field("Women", count(`Job row ${index + 1} women`, row.women)),
                        field("Youth", count(`Job row ${index + 1} youth`, row.youth)),
                        field("PWD", count(`Job row ${index + 1} PWD`, row.pwd)),
                        field("Total", count(`Job row ${index + 1} total`, (row.women || 0) + (row.youth || 0) + (row.pwd || 0))),
                    ],
                })),
                "No job creation rows were added."
            ),
            section("13. Supporting documents", [
                field("Mandatory documents enclosed", `${documents.enclosed} of ${documents.total}`),
                ...view.documents.map((row) => field(row.document, textAnswer(row.document, documentAnswer(row)))),
            ]),
            section("14. Declaration", [
                field("Applicant full name", textAnswer("Applicant full name", view.declarationName)),
                field(
                    "Declaration",
                    view.declarationAccepted
                        ? "Accepted - the applicant declares that all information is true, complete, and subject to verification."
                        : "Not accepted"
                ),
                ...(acceptedAt ? [field("Declaration accepted at", acceptedAt)] : []),
            ]),
        ],
    };
}

function documentAnswer(row: MatchingGrantApplicationView["documents"][number]): string {
    const requirement = row.mandatory === "Yes" ? "Mandatory" : row.mandatory;
    if (!row.url.trim()) return `Not attached (${requirement})`;
    const name = row.fileName?.trim() || "File attached";
    const lines = [`Attached - ${name} (${requirement})`];
    if (row.sourceLabel?.trim()) lines.push(row.sourceLabel.trim());
    lines.push(row.url.trim());
    return lines.join("\n");
}

function QuestionAnswer({ question, answer }: MatchingGrantPdfField) {
    return (
        <View style={styles.qa}>
            <Text style={styles.question}>{question}</Text>
            <Text style={styles.answer}>{answer}</Text>
        </View>
    );
}

export function MatchingGrantApplicationPdfDocument({ model }: { model: MatchingGrantPdfModel }) {
    return (
        <Document
            title={`Access to Finance application - ${model.enterpriseName}`}
            author="BIRE Programme"
            subject="Matching Grant application questions and answers"
        >
            <Page size="A4" style={styles.page}>
                <View style={styles.banner}>
                    <Text style={styles.kicker}>BIRE Innovation Fund</Text>
                    <Text style={styles.title}>Access to Finance</Text>
                    <Text style={styles.subtitle}>Matching Grant application - questions and answers</Text>
                </View>

                <Text style={styles.enterprise}>{model.enterpriseName}</Text>
                <Text style={styles.meta}>
                    {`Status: ${model.statusLabel}  ·  Downloaded ${model.generatedAt}`}
                    {model.updatedAt ? `  ·  Last updated ${model.updatedAt}` : ""}
                </Text>

                <View style={styles.metricRow}>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Track</Text>
                        <Text style={styles.metricValue}>{model.trackLabel}</Text>
                    </View>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Annual revenue</Text>
                        <Text style={styles.metricValue}>{model.annualRevenue}</Text>
                    </View>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabel}>BIRE share</Text>
                        <Text style={styles.metricValue}>{model.bireShare}</Text>
                    </View>
                    <View style={styles.metric}>
                        <Text style={styles.metricLabel}>Enterprise share</Text>
                        <Text style={styles.metricValue}>{model.enterpriseShare}</Text>
                    </View>
                </View>

                {model.returnReason ? (
                    <View style={styles.notice}>
                        <Text style={styles.noticeLabel}>Returned for correction</Text>
                        <Text>{preparePdfText(model.returnReason).text}</Text>
                    </View>
                ) : null}

                {model.adjustments.length > 0 ? (
                    <View style={styles.notice}>
                        <Text style={styles.noticeLabel}>Some answers could not be printed as entered</Text>
                        <Text>
                            {`The rest of this application is included. Correct these answers, using a normal value or None where a question does not apply, then download again if you need them in full: ${model.adjustments.join("; ")}.`}
                        </Text>
                    </View>
                ) : null}

                {model.sections.map((block) => (
                    <View key={block.title} style={styles.section}>
                        <Text style={styles.sectionTitle}>{block.title}</Text>
                        {block.fields.map((item) => (
                            <QuestionAnswer key={`${block.title}-${item.question}`} {...item} />
                        ))}
                        {block.groups.map((group) => (
                            <View key={`${block.title}-${group.title}`} style={styles.group}>
                                <Text style={styles.groupTitle}>{group.title}</Text>
                                {group.fields.map((item) => (
                                    <QuestionAnswer key={`${group.title}-${item.question}`} {...item} />
                                ))}
                            </View>
                        ))}
                        {block.groups.length === 0 && block.emptyMessage ? (
                            <Text style={styles.answer}>{block.emptyMessage}</Text>
                        ) : null}
                    </View>
                ))}

                <Text
                    style={styles.footer}
                    fixed
                    render={({ pageNumber, totalPages }) =>
                        `BIRE Programme · Access to Finance · Matching Grant application · Page ${pageNumber} of ${totalPages}`
                    }
                />
            </Page>
        </Document>
    );
}

export function explainMatchingGrantPdfFailure(error: unknown, adjustments: string[] = []): string {
    const listed = adjustments.slice(0, 6).join("; ");
    const correction = listed
        ? ` Correct these answers, using a normal value or None where a question does not apply, then download again: ${listed}.`
        : " If a step is marked in red, open it and replace any oversized number, long unbroken web link, or unusual symbol. Use None where a question does not apply, then download again.";
    const message = error instanceof Error ? error.message : "";
    if (/unsupported number/i.test(message)) {
        return `The PDF could not be created because an answer contains a value the document cannot print.${correction}`;
    }
    return `The PDF could not be created.${correction}`;
}

export async function renderMatchingGrantApplicationPdf(model: MatchingGrantPdfModel): Promise<Buffer> {
    const buffer = await renderToBuffer(<MatchingGrantApplicationPdfDocument model={model} />);
    return Buffer.from(buffer);
}
