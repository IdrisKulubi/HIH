import { renderToBuffer } from "@react-pdf/renderer";
import { format } from "date-fns";
import type { ContractTemplateVariables } from "@/lib/contract-template-types";
import { OfferLetterPdfDocument } from "@/lib/OfferLetterPdfDocument";

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

export function buildOfferLetterHtml(vars: ContractTemplateVariables): string {
    const issuedDate = format(new Date(), "dd MMM yyyy");
    const showEnterprise =
        vars.enterpriseContribution
        && vars.enterpriseContribution !== "0"
        && vars.enterpriseContribution !== "0.00";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>Offer Letter — ${escapeHtml(vars.enterpriseName)}</title>
    <style>
        @page { margin: 18mm 16mm; }
        body { font-family: Georgia, "Times New Roman", serif; color: #111; line-height: 1.5; font-size: 11pt; max-width: 210mm; margin: 0 auto; padding: 12mm 0; }
        h1 { font-size: 18pt; margin: 0 0 4mm; color: #1a5c2a; }
        .subtitle { color: #444; font-size: 10pt; margin-bottom: 10mm; }
        h2 { font-size: 12pt; margin: 8mm 0 2mm; border-bottom: 1px solid #ccc; padding-bottom: 1mm; }
        table { width: 100%; border-collapse: collapse; margin: 4mm 0; }
        td { padding: 2mm 0; vertical-align: top; }
        td.label { width: 42%; font-weight: bold; color: #374151; }
        .signatures { margin-top: 16mm; display: flex; justify-content: space-between; gap: 8mm; }
        .sign-line { width: 45%; border-top: 1px solid #333; padding-top: 2mm; font-size: 9pt; color: #555; }
    </style>
</head>
<body>
    <h1>Grant Offer Letter</h1>
    <p class="subtitle">BIRE Programme · Hand-in-Hand Kenya · ${escapeHtml(vars.agreementType)} · Issued ${escapeHtml(issuedDate)}</p>

    <h2>Recipient</h2>
    <table>
        <tr><td class="label">Enterprise</td><td>${escapeHtml(vars.enterpriseName)}</td></tr>
        <tr><td class="label">Lead entrepreneur</td><td>${escapeHtml(vars.applicantName)}</td></tr>
        <tr><td class="label">Email</td><td>${escapeHtml(vars.applicantEmail)}</td></tr>
        <tr><td class="label">County / location</td><td>${escapeHtml(vars.county)}</td></tr>
    </table>

    <h2>Approved grant terms</h2>
    <p>Hand-in-Hand Kenya is pleased to offer a matching grant to the enterprise named above, subject to the financial terms below and programme conditions.</p>
    <table>
        <tr><td class="label">Total project amount</td><td>KES ${escapeHtml(vars.totalProjectAmount)}</td></tr>
        <tr><td class="label">HiH contribution</td><td>KES ${escapeHtml(vars.hihContribution)}</td></tr>
        ${showEnterprise ? `<tr><td class="label">Enterprise co-contribution</td><td>KES ${escapeHtml(vars.enterpriseContribution)}</td></tr>` : ""}
    </table>

    <h2>Next steps</h2>
    <p>Please review this offer letter, sign where indicated, and return the signed copy via your applicant portal within fourteen (14) calendar days.</p>

    <div class="signatures">
        <div class="sign-line">For Hand-in-Hand Kenya (authorised signatory)</div>
        <div class="sign-line">Enterprise representative (sign &amp; date)</div>
    </div>
</body>
</html>`;
}

export async function renderOfferLetterPdfBuffer(vars: ContractTemplateVariables): Promise<Buffer> {
    const buffer = await renderToBuffer(OfferLetterPdfDocument({ vars }));
    return Buffer.from(buffer);
}

export function offerLetterFilename(enterpriseName: string, agreementId: number): string {
    const slug = enterpriseName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "enterprise";
    return `Offer-Letter-${slug}-${agreementId}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
}

/** Client-side print preview (fallback). */
export function exportOfferLetterPdfPreview(vars: ContractTemplateVariables): boolean {
    const html = buildOfferLetterHtml(vars);
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
    setTimeout(runPrint, 600);
    return true;
}
