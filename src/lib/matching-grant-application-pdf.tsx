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
        letterSpacing: 0.6,
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
        gap: 6,
        marginBottom: 12,
    },
    metric: {
        flex: 1,
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

function answered(value: string | null | undefined): string {
    const trimmed = (value ?? "").trim();
    return trimmed.length > 0 ? trimmed : "Not answered";
}

function kes(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return "Not answered";
    return `KES ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(value)}`;
}

function yesNo(value: boolean): string {
    return value ? "Yes" : "No";
}

function share(part: number, total: number): string {
    const pct = total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
    return `${pct}%`;
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

    return {
        enterpriseName,
        statusLabel: statusLabel(view.status),
        trackLabel: context.track === "acceleration" ? "Accelerator" : "Foundation",
        annualRevenue: revenue > 0 ? kes(revenue) : "Not set",
        bireShare: share(view.bireGrantAmount, view.totalProjectAmount),
        enterpriseShare: share(view.enterpriseContributionAmount, view.totalProjectAmount),
        generatedAt: formatStamp(generatedAt) ?? generatedAt.toISOString(),
        updatedAt: formatStamp(context.updatedAt),
        returnReason: context.returnReason?.trim() ? context.returnReason.trim() : null,
        fileName: matchingGrantPdfFileName(enterpriseName),
        sections: [
            section("1. Enterprise identification", [
                field("Enterprise name", answered(view.enterprise.name)),
                field("Trading name", answered(view.enterprise.tradingName)),
                field("Registration number", answered(view.enterprise.registrationNumber)),
                field("Legal structure", answered(view.enterprise.legalStructure)),
                field("Registration date", answered(view.enterprise.registrationDate)),
                field("Year operations started", answered(view.enterprise.yearOperationsStarted)),
                field("Sector", answered(view.enterprise.sector)),
                field("County", answered(view.enterprise.county)),
                field("Sub-county / ward", answered(view.enterprise.subCountyWard)),
                field("GPS / pin location", answered(view.enterprise.gpsLocation)),
                field("Physical address", answered(view.enterprise.physicalAddress)),
                field("Postal address", answered(view.enterprise.postalAddress)),
                field("Ownership structure", answered(view.enterprise.ownershipStructure)),
            ]),
            section("2. Lead entrepreneur", [
                field("Full name", answered(view.lead.name)),
                field("ID / passport number", answered(view.lead.idNumber)),
                field("Gender", answered(view.lead.gender)),
                field("Date of birth", answered(view.lead.dateOfBirth)),
                field("Applicant category", answered(view.lead.applicantCategory)),
                field("Role in enterprise", answered(view.lead.role)),
                field("Phone", answered(view.lead.phone)),
                field("Email", answered(view.lead.email)),
                field("Education", answered(view.lead.education)),
                field("Relevant experience", answered(view.lead.experience)),
            ]),
            section(
                "3. Other owners or partners",
                [],
                owners.map((row, index) => ({
                    title: `Owner / partner ${index + 1}`,
                    fields: [
                        field("Name", answered(row.name)),
                        field("Role", answered(row.role)),
                        field("Ownership %", `${row.ownershipPct}%`),
                        field("Gender", answered(row.gender)),
                        field("Category", answered(row.category)),
                    ],
                })),
                "No other owners or partners were added."
            ),
            section("4. Programme engagement", [
                field("BIRE client ID", answered(view.programme.bireClientId)),
                field("Regional hub", answered(view.programme.regionalHub)),
                field("TA lead", answered(view.programme.taLead)),
                field("Date joined programme", answered(view.programme.dateJoined)),
                field("Duration in TA support (months)", answered(view.programme.taDurationMonths)),
                field("Key TA milestones achieved", answered(view.programme.taMilestones)),
                field("Programme support received", answered(view.programme.supportReceived)),
            ]),
            section("5. Financial overview", [
                field("Annual revenue 2025 (KES)", kes(view.financial.annualRevenue2025)),
                field("Annual revenue 2024 (KES)", kes(view.financial.annualRevenue2024)),
                field("Annual revenue 2023 (KES)", kes(view.financial.annualRevenue2023)),
                field("Average monthly revenue (KES)", kes(view.financial.monthlyRevenue)),
                field("Monthly operating costs (KES)", kes(view.financial.monthlyOperatingCosts)),
                field("Profitability", answered(view.financial.profitability)),
                field("Full-time employees", view.financial.employeeCount == null ? "Not answered" : String(view.financial.employeeCount)),
                field("Casual / contract workers", view.financial.casualWorkers == null ? "Not answered" : String(view.financial.casualWorkers)),
                field("Financial recordkeeping status", answered(view.financial.recordkeepingStatus)),
                field("Revenue streams", answered(view.financial.revenueStreams)),
                field("Financial obligations", answered(view.financial.financialObligations)),
                field("Additional financial notes", answered(view.financial.narrative)),
            ]),
            section("6. Grant request and co-investment", [
                field("Project title", answered(view.projectTitle)),
                field("Total project investment (KES)", kes(view.totalProjectAmount)),
                field("BIRE grant amount (KES)", kes(view.bireGrantAmount)),
                field("Enterprise contribution (KES)", kes(view.enterpriseContributionAmount)),
                field("Preferred co-investment percentage", `${view.preferredCoInvestmentPct}%`),
                field("Co-investment source", answered(view.coInvestmentSource)),
                field("Why is this funding needed now?", answered(view.fundingNeed)),
                field("What would happen without this grant?", answered(view.withoutGrantImpact)),
                field("Co-investment notes / justification", answered(view.coInvestmentJustification)),
                field(
                    "CAPEX-only confirmation",
                    view.capexOnlyConfirmed
                        ? "Yes — the request is for CAPEX only (productive equipment, technology adoption, climate-resilient infrastructure, or operational upgrades)."
                        : "No"
                ),
            ]),
            section("7. Other funding and leverage", [
                field("Other grants", answered(view.otherFunding.otherGrants)),
                field("Loans", answered(view.otherFunding.loans)),
                field("Investors", answered(view.otherFunding.investors)),
                field("Own savings", answered(view.otherFunding.ownSavings)),
                field("Future investment / lender leverage", answered(view.otherFunding.leveragePotential)),
                field("Summary / additional notes", answered(view.otherFunding.description)),
            ]),
            section("8. Governance and compliance", [
                field("Registration status", answered(view.governance.registrationStatus)),
                field("KRA PIN", answered(view.governance.kraPin)),
                field("Sector licenses / permits", answered(view.governance.licensesPermits)),
                field("Tax compliance", answered(view.governance.taxCompliance)),
                field("Litigation or disputes", answered(view.governance.litigationDisputes)),
                field("Previous grant / programme funding", answered(view.governance.previousProgrammeFunding)),
                field("Key risks", answered(view.governance.risks)),
                field("Mitigation plan", answered(view.governance.mitigationPlan)),
                field("Compliance gaps", answered(view.governance.complianceGaps)),
                field("Additional notes", answered(view.governance.notes)),
            ]),
            section("9. Business, financial and impact overview", [
                field("Business description", answered(view.business.businessDescription)),
                field("Problem solved", answered(view.business.problemSolved)),
                field("Value chain node", answered(view.business.valueChainNode)),
                field("Products / services", answered(view.business.productsServices)),
                field("Target market and estimated size", answered(view.business.targetMarket)),
                field("Target customers", answered(view.business.targetCustomers)),
                field("Marketing and sales strategy", answered(view.business.marketingSalesStrategy)),
                field("Competitive advantages", answered(view.business.competitiveAdvantages)),
                field("Projected monthly revenue after investment", answered(view.projectedMonthlyRevenue)),
                field("Projected annual revenue after investment", answered(view.projectedAnnualRevenue)),
                field("Projected revenue growth rate", answered(view.projectedGrowthRate)),
                field("Projection assumptions", answered(view.projectionAssumptions)),
                field("Employment terms", answered(view.employmentTerms)),
                field("Inclusion strategy", answered(view.inclusionStrategy)),
                field("Environmental / climate impact", answered(view.environmentalImpact)),
                field("Environmental outcome indicators", answered(view.environmentalIndicators)),
                field("Value chain / community impact", answered(view.communityImpact)),
                field("Innovation element", answered(view.innovationElement)),
            ]),
            section(
                "10. Eligible use of funds — detailed budget",
                [
                    field(
                        "Use-of-funds confirmation",
                        view.useOfFundsAcknowledged
                            ? "Yes — the budget excludes personal expenses, loan repayments, and routine overhead costs not linked to the approved CAPEX investment."
                            : "No"
                    ),
                ],
                budget.map((row, index) => ({
                    title: `Budget line ${index + 1}`,
                    fields: [
                        field("Investment item", answered(row.item)),
                        field("CAPEX category", capexCategoryLabel(row.category)),
                        field("Total cost", kes(row.totalCost)),
                        field("BIRE grant", kes(row.bireGrant)),
                        field("Enterprise contribution", kes(row.enterpriseContribution)),
                        field(
                            "Confirmed CAPEX-eligible item",
                            row.confirmedEligible
                                ? "Yes — not a personal expense, loan repayment, or unrelated overhead."
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
                        field("Activity / milestone", answered(row.activity)),
                        field("Expected completion", answered(row.completionDate)),
                        field("Disbursement tranche", answered(row.tranche)),
                        field("Verification method", answered(row.verificationMethod)),
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
                        field("Role / job type", answered(row.role)),
                        field("Women", String(row.women || 0)),
                        field("Youth", String(row.youth || 0)),
                        field("PWD", String(row.pwd || 0)),
                        field("Total", String((row.women || 0) + (row.youth || 0) + (row.pwd || 0))),
                    ],
                })),
                "No job creation rows were added."
            ),
            section("13. Supporting documents", [
                field("Mandatory documents enclosed", `${documents.enclosed} of ${documents.total}`),
                ...view.documents.map((row) => field(row.document, documentAnswer(row))),
            ]),
            section("14. Declaration", [
                field("Applicant full name", answered(view.declarationName)),
                field(
                    "Declaration",
                    view.declarationAccepted
                        ? "Accepted — the applicant declares that all information is true, complete, and subject to verification."
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
    const lines = [`Attached — ${name} (${requirement})`];
    if (row.sourceLabel?.trim()) lines.push(row.sourceLabel.trim());
    lines.push(row.url.trim());
    return lines.join("\n");
}

function QuestionAnswer({ question, answer }: MatchingGrantPdfField) {
    return (
        <View style={styles.qa} wrap={answer.length < 240 ? false : undefined}>
            <Text style={styles.question}>{question}</Text>
            <Text style={styles.answer}>{answer}</Text>
        </View>
    );
}

export function MatchingGrantApplicationPdfDocument({ model }: { model: MatchingGrantPdfModel }) {
    return (
        <Document
            title={`Access to Finance application — ${model.enterpriseName}`}
            author="BIRE Programme"
            subject="Matching Grant application questions and answers"
        >
            <Page size="A4" style={styles.page}>
                <View style={styles.banner}>
                    <Text style={styles.kicker}>BIRE Innovation Fund</Text>
                    <Text style={styles.title}>Access to Finance</Text>
                    <Text style={styles.subtitle}>Matching Grant application — questions and answers</Text>
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
                        <Text>{model.returnReason}</Text>
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

export async function renderMatchingGrantApplicationPdf(model: MatchingGrantPdfModel): Promise<Buffer> {
    const buffer = await renderToBuffer(<MatchingGrantApplicationPdfDocument model={model} />);
    return Buffer.from(buffer);
}
