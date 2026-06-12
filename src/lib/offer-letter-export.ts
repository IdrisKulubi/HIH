import { readFile } from "fs/promises";
import path from "path";
import JSZip from "jszip";
import { format } from "date-fns";
import type { ContractTemplateVariables } from "@/lib/contract-template-types";

const TEMPLATE_PATH = path.join(
    process.cwd(),
    "public",
    "templates",
    "matching-grant-offer-letter-template.docx"
);

function escapeXml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function textRuns(text: string): string {
    return text
        .split("\n")
        .map((line, index) => {
            const prefix = index === 0 ? "" : "<w:br/>";
            return `${prefix}<w:t xml:space="preserve">${escapeXml(line)}</w:t>`;
        })
        .join("");
}

function paragraphText(paragraphXml: string): string {
    return Array.from(paragraphXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g))
        .map((match) => match[1].replace(/<[^>]+>/g, ""))
        .join("");
}

function replaceFirstParagraphContaining(documentXml: string, needle: string, replacement: string): string {
    let replaced = false;
    return documentXml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraphXml) => {
        if (replaced || !paragraphText(paragraphXml).includes(needle)) {
            return paragraphXml;
        }
        replaced = true;

        const paragraphOpen = paragraphXml.match(/^<w:p\b[^>]*>/)?.[0] ?? "<w:p>";
        const paragraphProps = paragraphXml.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
        const runProps = paragraphXml.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/)?.[0] ?? "";

        return `${paragraphOpen}${paragraphProps}<w:r>${runProps}${textRuns(replacement)}</w:r></w:p>`;
    });
}

function replaceCellText(cellXml: string, replacement: string): string {
    const cellOpen = cellXml.match(/^<w:tc\b[^>]*>/)?.[0] ?? "<w:tc>";
    const cellProps = cellXml.match(/<w:tcPr\b[\s\S]*?<\/w:tcPr>/)?.[0] ?? "";
    const paragraphProps = cellXml.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
    const runProps = cellXml.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/)?.[0] ?? "";

    return `${cellOpen}${cellProps}<w:p>${paragraphProps}<w:r>${runProps}${textRuns(replacement)}</w:r></w:p></w:tc>`;
}

function fillContributionTable(documentXml: string, vars: ContractTemplateVariables): string {
    let tableUpdated = false;
    return documentXml.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/, (tableXml) => {
        if (tableUpdated) return tableXml;
        tableUpdated = true;

        let rowIndex = 0;
        return tableXml.replace(/<w:tr\b[\s\S]*?<\/w:tr>/g, (rowXml) => {
            rowIndex += 1;
            if (rowIndex !== 2) return rowXml;

            const values = [
                `KES ${vars.totalProjectAmount}`,
                `KES ${vars.hihContribution}`,
                `KES ${vars.enterpriseContribution}`,
            ];
            let cellIndex = 0;
            return rowXml.replace(/<w:tc\b[\s\S]*?<\/w:tc>/g, (cellXml) => {
                const value = values[cellIndex] ?? "";
                cellIndex += 1;
                return replaceCellText(cellXml, value);
            });
        });
    });
}

function fillOfferLetterTemplate(documentXml: string, vars: ContractTemplateVariables): string {
    const issuedDate = format(new Date(), "dd MMMM yyyy");
    const applicantAddress = [vars.county, vars.applicantEmail].filter(Boolean).join("\n");
    const grantPurpose =
        "support the approved capital expenditure investment and expected outcomes agreed during appraisal.";
    const programmeGoal =
        "supporting climate-resilient and inclusive enterprise growth under the BIRE Programme.";

    let nextXml = documentXml;
    nextXml = replaceFirstParagraphContaining(nextXml, "Date:", `Date: ${issuedDate}`);
    nextXml = replaceFirstParagraphContaining(nextXml, "Enterpreneur", applicantAddress || vars.applicantName);
    nextXml = replaceFirstParagraphContaining(nextXml, "Dear Entrepreneur", `Dear ${vars.applicantName},`);
    nextXml = replaceFirstParagraphContaining(
        nextXml,
        "We refer to your matching grant application",
        `We refer to your matching grant application of KES ${vars.hihContribution} awarded by Hand in Hand EA.`
    );
    nextXml = replaceFirstParagraphContaining(
        nextXml,
        "The Matching Grant is intended",
        `The Matching Grant is intended to ${grantPurpose} This initiative will also advance the BIRE's program's goal of ${programmeGoal}`
    );
    nextXml = replaceFirstParagraphContaining(
        nextXml,
        "The detailed terms and conditions",
        `The detailed terms and conditions for utilization of the financing, the required reporting and disbursement procedures shall be agreed upon in a Matching Grant Agreement that HiH EA will sign with ${vars.enterpriseName}. The utilization of the funds will be based on an agreed upon work plan developed jointly between HiH EA and ${vars.enterpriseName}.`
    );
    nextXml = fillContributionTable(nextXml, vars);

    return nextXml;
}

export async function renderOfferLetterDocxBuffer(vars: ContractTemplateVariables): Promise<Buffer> {
    const templateBuffer = await readFile(TEMPLATE_PATH);
    const zip = await JSZip.loadAsync(templateBuffer);
    const documentFile = zip.file("word/document.xml");
    if (!documentFile) {
        throw new Error("Matching Grant offer letter template is missing word/document.xml");
    }

    const documentXml = await documentFile.async("string");
    zip.file("word/document.xml", fillOfferLetterTemplate(documentXml, vars));

    return zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
    });
}

export function offerLetterFilename(enterpriseName: string, agreementId: number): string {
    const slug = enterpriseName.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 40) || "enterprise";
    return `Matching-Grant-Offer-Letter-${slug}-${agreementId}-${format(new Date(), "yyyy-MM-dd")}.docx`;
}
