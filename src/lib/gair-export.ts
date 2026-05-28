import {
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    TextRun,
} from "docx";
import { saveAs } from "file-saver";
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

function gairFilenameSlug(businessName: string): string {
    return businessName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "gair";
}

function bodyParagraphs(text: string): Paragraph[] {
    if (!text || text === "—") {
        return [
            new Paragraph({
                children: [new TextRun({ text: "—", size: 22, color: "1F2937" })],
                spacing: { after: 150 },
            }),
        ];
    }
    return text.split("\n").map(
        (line) =>
            new Paragraph({
                children: [new TextRun({ text: line || " ", size: 22, color: "1F2937" })],
                spacing: { after: 80 },
            })
    );
}

function sectionHeading(title: string): Paragraph {
    return new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 120 },
    });
}

function buildGairDocxParagraphs(ctx: GairExportContext): Paragraph[] {
    const exportedAt = ctx.exportedAt ?? new Date();
    const paragraphs: Paragraph[] = [
        new Paragraph({
            text: "Grant Appraisal and Improvement Report (GAIR)",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 120 },
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: `${ctx.businessName} · Application #${ctx.applicationId}`,
                    size: 22,
                    color: "4B5563",
                }),
            ],
            spacing: { after: 60 },
        }),
    ];

    if (ctx.track) {
        paragraphs.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: `Track: ${ctx.track.replace(/_/g, " ")}`,
                        size: 22,
                        color: "4B5563",
                    }),
                ],
                spacing: { after: 60 },
            })
        );
    }

    paragraphs.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: `Exported: ${format(exportedAt, "dd MMM yyyy, HH:mm")}`,
                    size: 22,
                    color: "4B5563",
                }),
            ],
            spacing: { after: 240 },
        })
    );

    if (ctx.content.recommendedInstrument || ctx.content.recommendedAmount || ctx.content.icRecommendation) {
        paragraphs.push(sectionHeading("Recommendation Summary"));
        if (ctx.content.recommendedInstrument) {
            paragraphs.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: "Instrument: ", bold: true, size: 22 }),
                        new TextRun({ text: ctx.content.recommendedInstrument, size: 22 }),
                    ],
                    spacing: { after: 80 },
                })
            );
        }
        if (ctx.content.recommendedAmount) {
            paragraphs.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: "Recommended amount (KES): ", bold: true, size: 22 }),
                        new TextRun({ text: String(ctx.content.recommendedAmount), size: 22 }),
                    ],
                    spacing: { after: 80 },
                })
            );
        }
        if (ctx.content.icRecommendation?.trim()) {
            paragraphs.push(...bodyParagraphs(ctx.content.icRecommendation.trim()));
        }
    }

    if (ctx.icDecision) {
        paragraphs.push(sectionHeading("Investment Committee Decision"));
        paragraphs.push(
            new Paragraph({
                children: [
                    new TextRun({ text: "Decision: ", bold: true, size: 22 }),
                    new TextRun({
                        text: IC_LABELS[ctx.icDecision] ?? ctx.icDecision,
                        size: 22,
                    }),
                ],
                spacing: { after: 80 },
            })
        );
        if (ctx.approvedGrantAmount != null && String(ctx.approvedGrantAmount).trim()) {
            paragraphs.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: "Approved grant amount (KES): ", bold: true, size: 22 }),
                        new TextRun({ text: String(ctx.approvedGrantAmount), size: 22 }),
                    ],
                    spacing: { after: 80 },
                })
            );
        }
        if (ctx.decisionConditions?.trim()) {
            paragraphs.push(
                new Paragraph({
                    children: [new TextRun({ text: "Conditions", bold: true, size: 22 })],
                    spacing: { before: 120, after: 80 },
                })
            );
            paragraphs.push(...bodyParagraphs(ctx.decisionConditions.trim()));
        }
        if (ctx.decisionNotes?.trim()) {
            paragraphs.push(
                new Paragraph({
                    children: [new TextRun({ text: "Decision notes", bold: true, size: 22 })],
                    spacing: { before: 120, after: 80 },
                })
            );
            paragraphs.push(...bodyParagraphs(ctx.decisionNotes.trim()));
        }
    }

    for (const section of GAIR_SECTIONS) {
        paragraphs.push(sectionHeading(section.label));
        paragraphs.push(...bodyParagraphs(sectionBody(ctx.content, section.key)));
    }

    return paragraphs;
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

export async function downloadGairDocx(ctx: GairExportContext): Promise<void> {
    const doc = new Document({
        sections: [{ children: buildGairDocxParagraphs(ctx) }],
    });
    const blob = await Packer.toBlob(doc);
    const slug = gairFilenameSlug(ctx.businessName);
    const filename = `GAIR-${slug}-${format(ctx.exportedAt ?? new Date(), "yyyy-MM-dd")}.docx`;
    saveAs(blob, filename);
}

/** Opens GAIR in a new tab and triggers print (Save as PDF). Returns false if pop-up blocked. */
export function exportGairPdf(ctx: GairExportContext): boolean {
    const html = buildGairPrintHtml(ctx);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const printWindow = window.open(url, "_blank");
    if (!printWindow) {
        URL.revokeObjectURL(url);
        return false;
    }

    let printed = false;
    const runPrint = () => {
        if (printed) return;
        const doc = printWindow.document;
        if (doc.readyState !== "complete" || !doc.body?.childElementCount) return;

        printed = true;
        try {
            printWindow.focus();
            printWindow.print();
        } finally {
            URL.revokeObjectURL(url);
        }
    };

    printWindow.addEventListener("load", () => setTimeout(runPrint, 200), { once: true });
    window.setTimeout(runPrint, 400);
    window.setTimeout(runPrint, 1000);

    return true;
}
