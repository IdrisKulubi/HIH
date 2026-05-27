import { format } from "date-fns";
import type { AppraisalContent } from "@/lib/actions/a2f-investment-appraisals";
import type { IcDecision } from "@/lib/actions/a2f-investment-appraisals";

const GAIR_SECTIONS: Array<{ key: keyof AppraisalContent; label: string }> = [
    { key: "businessOverview", label: "Business Overview" },
    { key: "caseForFinancing", label: "Case For Matching Grant Financing" },
    { key: "amountRequestedAndBudget", label: "Amount Requested And Budget" },
    { key: "useOfFunds", label: "Use Of Funds" },
    { key: "otherFundingLeverage", label: "Other Funding Or Leverage" },
    { key: "financialOverviewAndProjections", label: "Financial Overview And Projections" },
    { key: "projectTeam", label: "Project Team" },
    { key: "socioEconomicImpact", label: "Socio-Economic Impact" },
    { key: "innovationAspects", label: "Innovation Aspects" },
    { key: "strengths", label: "Strengths" },
    { key: "weaknesses", label: "Weaknesses" },
    { key: "mitigationConsiderations", label: "Mitigation Considerations" },
    { key: "scoringSummary", label: "Scoring Summary" },
    { key: "conclusionAndRecommendation", label: "Conclusion And IC Recommendation" },
    { key: "conditions", label: "Conditions" },
    { key: "dataSources", label: "Data Sources" },
];

const IC_LABELS: Record<IcDecision, string> = {
    approved: "Approved",
    approved_with_conditions: "Approved with Conditions",
    deferred: "Deferred",
    declined: "Declined",
};

export interface GairExportContext {
    businessName: string;
    applicationId: number;
    track?: string | null;
    content: Partial<AppraisalContent>;
    icDecision?: IcDecision | null;
    approvedGrantAmount?: string | number | null;
    decisionNotes?: string | null;
    decisionConditions?: string | null;
    exportedAt?: Date;
}

function sectionBody(content: Partial<AppraisalContent>, key: keyof AppraisalContent): string {
    const value = content[key];
    return typeof value === "string" && value.trim() ? value.trim() : "—";
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function formatMultilineHtml(text: string): string {
    return escapeHtml(text).replace(/\n/g, "<br />");
}

export function buildGairMarkdown(ctx: GairExportContext): string {
    const exportedAt = ctx.exportedAt ?? new Date();
    const lines: string[] = [
        "# Grant Appraisal and Improvement Report (GAIR)",
        "",
        `**Enterprise:** ${ctx.businessName}`,
        `**Application ID:** #${ctx.applicationId}`,
    ];

    if (ctx.track) lines.push(`**Track:** ${ctx.track.replace(/_/g, " ")}`);
    lines.push(`**Exported:** ${format(exportedAt, "dd MMM yyyy, HH:mm")}`);
    lines.push("");

    if (ctx.content.recommendedInstrument || ctx.content.recommendedAmount) {
        lines.push("## Recommendation Summary", "");
        if (ctx.content.recommendedInstrument) {
            lines.push(`- **Instrument:** ${ctx.content.recommendedInstrument}`);
        }
        if (ctx.content.recommendedAmount) {
            lines.push(`- **Recommended amount (KES):** ${ctx.content.recommendedAmount}`);
        }
        if (ctx.content.icRecommendation) {
            lines.push("", ctx.content.icRecommendation);
        }
        lines.push("");
    }

    if (ctx.icDecision) {
        lines.push("## Investment Committee Decision", "");
        lines.push(`- **Decision:** ${IC_LABELS[ctx.icDecision] ?? ctx.icDecision}`);
        if (ctx.approvedGrantAmount != null && String(ctx.approvedGrantAmount).trim()) {
            lines.push(`- **Approved grant amount (KES):** ${ctx.approvedGrantAmount}`);
        }
        if (ctx.decisionConditions?.trim()) {
            lines.push("", "### Conditions", "", ctx.decisionConditions.trim());
        }
        if (ctx.decisionNotes?.trim()) {
            lines.push("", "### Decision notes", "", ctx.decisionNotes.trim());
        }
        lines.push("");
    }

    for (const section of GAIR_SECTIONS) {
        lines.push(`## ${section.label}`, "", sectionBody(ctx.content, section.key), "");
    }

    return lines.join("\n").trimEnd() + "\n";
}

export function buildGairPrintHtml(ctx: GairExportContext): string {
    const exportedAt = ctx.exportedAt ?? new Date();
    const sectionsHtml = GAIR_SECTIONS.map(
        (section) => `
        <section class="gair-section">
            <h2>${escapeHtml(section.label)}</h2>
            <div class="gair-body">${formatMultilineHtml(sectionBody(ctx.content, section.key))}</div>
        </section>`
    ).join("");

    const recommendationHtml =
        ctx.content.recommendedInstrument || ctx.content.recommendedAmount || ctx.content.icRecommendation
            ? `<section class="gair-section gair-meta">
                <h2>Recommendation Summary</h2>
                <ul>
                    ${ctx.content.recommendedInstrument ? `<li><strong>Instrument:</strong> ${escapeHtml(ctx.content.recommendedInstrument)}</li>` : ""}
                    ${ctx.content.recommendedAmount ? `<li><strong>Recommended amount (KES):</strong> ${escapeHtml(String(ctx.content.recommendedAmount))}</li>` : ""}
                </ul>
                ${ctx.content.icRecommendation ? `<div class="gair-body">${formatMultilineHtml(ctx.content.icRecommendation)}</div>` : ""}
            </section>`
            : "";

    const decisionHtml = ctx.icDecision
        ? `<section class="gair-section gair-meta">
            <h2>Investment Committee Decision</h2>
            <ul>
                <li><strong>Decision:</strong> ${escapeHtml(IC_LABELS[ctx.icDecision] ?? ctx.icDecision)}</li>
                ${ctx.approvedGrantAmount != null && String(ctx.approvedGrantAmount).trim()
                    ? `<li><strong>Approved grant amount (KES):</strong> ${escapeHtml(String(ctx.approvedGrantAmount))}</li>`
                    : ""}
            </ul>
            ${ctx.decisionConditions?.trim() ? `<h3>Conditions</h3><div class="gair-body">${formatMultilineHtml(ctx.decisionConditions)}</div>` : ""}
            ${ctx.decisionNotes?.trim() ? `<h3>Decision notes</h3><div class="gair-body">${formatMultilineHtml(ctx.decisionNotes)}</div>` : ""}
        </section>`
        : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>GAIR — ${escapeHtml(ctx.businessName)}</title>
    <style>
        @page { margin: 18mm 16mm; }
        body { font-family: Georgia, "Times New Roman", serif; color: #111; line-height: 1.5; font-size: 11pt; max-width: 210mm; margin: 0 auto; padding: 12mm 0; }
        h1 { font-size: 18pt; margin: 0 0 4mm; }
        .subtitle { color: #444; font-size: 10pt; margin-bottom: 10mm; }
        h2 { font-size: 12pt; margin: 8mm 0 2mm; border-bottom: 1px solid #ccc; padding-bottom: 1mm; }
        h3 { font-size: 10.5pt; margin: 4mm 0 1mm; }
        .gair-section { margin-bottom: 6mm; page-break-inside: avoid; }
        .gair-meta { background: #f8f8f8; padding: 4mm; border: 1px solid #e5e5e5; border-radius: 2mm; }
        .gair-body { white-space: pre-wrap; }
        ul { margin: 2mm 0; padding-left: 5mm; }
        @media print { body { padding: 0; } }
    </style>
</head>
<body>
    <h1>Grant Appraisal and Improvement Report (GAIR)</h1>
    <p class="subtitle">
        <strong>${escapeHtml(ctx.businessName)}</strong> · Application #${ctx.applicationId}
        ${ctx.track ? ` · ${escapeHtml(ctx.track.replace(/_/g, " "))} Track` : ""}
        · Exported ${escapeHtml(format(exportedAt, "dd MMM yyyy, HH:mm"))}
    </p>
    ${recommendationHtml}
    ${decisionHtml}
    ${sectionsHtml}
</body>
</html>`;
}

export function downloadGairMarkdown(ctx: GairExportContext): void {
    const markdown = buildGairMarkdown(ctx);
    const slug = ctx.businessName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "gair";
    const filename = `GAIR-${slug}-${format(ctx.exportedAt ?? new Date(), "yyyy-MM-dd")}.md`;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

export function openGairPrintPreview(ctx: GairExportContext): void {
    const html = buildGairPrintHtml(ctx);
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
        printWindow.print();
    };
}
