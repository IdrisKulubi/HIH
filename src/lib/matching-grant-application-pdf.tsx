import React from "react";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
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

const NOT_FILLED = "Not filled";
const MAX_PRINTABLE_AMOUNT = 1_000_000_000_000;

function preparePdfText(value: string | null | undefined): string {
    const trimmed = (value ?? "").trim();
    if (!trimmed) return NOT_FILLED;

    const printable = trimmed
        .replace(/[\u2018\u2019\u2032]/g, "'")
        .replace(/[\u201C\u201D]/g, "\"")
        .replace(/[\u2013\u2014\u2212]/g, "-")
        .replace(/\u2026/g, "...")
        .replace(/[\u00A0\u202F\u2007\u2009]/g, " ")
        .replace(/[^\n\x20-\x7E]/g, "")
        .replace(/[^\S\n]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .replace(/\S{40}/g, (token) => `${token} `);

    return printable || NOT_FILLED;
}

function answered(value: string | null | undefined): string {
    return preparePdfText(value);
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

function kes(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return NOT_FILLED;
    if (Math.abs(value) > MAX_PRINTABLE_AMOUNT) return `KES ${value.toExponential(2)}`;
    return `KES ${formatAmount(value)}`;
}

function share(part: number, total: number): string {
    if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return "0%";
    const pct = Math.round((part / total) * 1000) / 10;
    if (!Number.isFinite(pct)) return NOT_FILLED;
    if (Math.abs(pct) > 1000) return `${pct.toExponential(2)}%`;
    return `${pct}%`;
}

function countAnswer(value: number | null): string {
    if (value == null || !Number.isFinite(value)) return NOT_FILLED;
    if (Math.abs(value) > 1_000_000) return value.toExponential(2);
    return String(value);
}

function percentAnswer(value: number): string {
    if (!Number.isFinite(value)) return NOT_FILLED;
    if (Math.abs(value) > 1000) return `${value.toExponential(2)}%`;
    return `${value}%`;
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
    const money = (_question: string, value: number | null | undefined) => kes(value);
    const count = (_question: string, value: number | null) => countAnswer(value);
    const percent = (_question: string, value: number) => percentAnswer(value);
    const textAnswer = (_question: string, value: string | null | undefined) => preparePdfText(value);

    return {
        enterpriseName: preparePdfText(enterpriseName) === NOT_FILLED ? "Enterprise" : preparePdfText(enterpriseName),
        statusLabel: statusLabel(view.status),
        trackLabel: context.track === "acceleration" ? "Accelerator" : "Foundation",
        annualRevenue: revenue > 0 ? kes(revenue) : NOT_FILLED,
        bireShare: share(view.bireGrantAmount, view.totalProjectAmount),
        enterpriseShare: share(view.enterpriseContributionAmount, view.totalProjectAmount),
        generatedAt: formatStamp(generatedAt) ?? generatedAt.toISOString(),
        updatedAt: formatStamp(context.updatedAt),
        returnReason: context.returnReason?.trim() ? context.returnReason.trim() : null,
        fileName: matchingGrantPdfFileName(enterpriseName),
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
                NOT_FILLED
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
                budget.length === 0 ? NOT_FILLED : undefined
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
                NOT_FILLED
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
                NOT_FILLED
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
    if (!row.url.trim()) return NOT_FILLED;
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
                        <Text>{preparePdfText(model.returnReason)}</Text>
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
                        `BIRE Programme - Access to Finance - Matching Grant application - Page ${pageNumber} of ${totalPages}`
                    }
                />
            </Page>
        </Document>
    );
}

let hyphenationReady = false;

function ensurePdfHyphenation() {
    if (hyphenationReady) return;
    Font.registerHyphenationCallback((word) => {
        if (word.length <= 24) return [word];
        const parts: string[] = [];
        for (let index = 0; index < word.length; index += 24) {
            parts.push(word.slice(index, index + 24));
        }
        return parts;
    });
    hyphenationReady = true;
}

export async function renderMatchingGrantApplicationPdf(model: MatchingGrantPdfModel): Promise<Buffer> {
    ensurePdfHyphenation();
    const buffer = await renderToBuffer(<MatchingGrantApplicationPdfDocument model={model} />);
    return Buffer.from(buffer);
}
