import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
} from "docx";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import type {
    FoundationApplicationFormData,
    AccelerationApplicationFormData,
} from "@/components/application/schemas/bire-application-schema";

type Track = "foundation" | "acceleration";

interface BireDocumentGeneratorOptions {
    formData: FoundationApplicationFormData | AccelerationApplicationFormData;
    track: Track;
    applicantName: string;
}

// Helper function to format values for display
const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "Not provided";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return value.toLocaleString();
    if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "None selected";
    if (typeof value === "string" && value.trim() === "") return "Not provided";
    if (typeof value === "string") {
        return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return String(value);
};

// Helper function to format currency
const formatCurrency = (value: unknown): string => {
    if (typeof value !== "number") return "Not provided";
    return `KES ${value.toLocaleString()}`;
};

// Helper function to create a section header
const createSectionHeader = (title: string, emoji: string) => {
    return new Paragraph({
        children: [
            new TextRun({
                text: `${emoji} ${title}`,
                bold: true,
                size: 32,
                color: "2563EB",
            }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
        alignment: AlignmentType.LEFT,
    });
};



// Helper function to create a question-answer pair
const createQuestionAnswer = (question: string, answer: string) => {
    return [
        new Paragraph({
            children: [
                new TextRun({
                    text: question,
                    bold: true,
                    size: 22,
                    color: "374151",
                }),
            ],
            spacing: { before: 150, after: 80 },
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: answer,
                    size: 20,
                    color: "1F2937",
                }),
            ],
            spacing: { after: 150 },
            indent: { left: 360 },
        }),
    ];
};

// Generate DOCX for Foundation Track
function generateFoundationSections(formData: FoundationApplicationFormData): Paragraph[] {
    const sections: Paragraph[] = [];

    // Applicant Details
    sections.push(createSectionHeader("Applicant Details", "👤"));
    sections.push(...createQuestionAnswer("First Name", formatValue(formData.applicant?.firstName)));
    sections.push(...createQuestionAnswer("Last Name", formatValue(formData.applicant?.lastName)));
    sections.push(...createQuestionAnswer("Gender", formatValue(formData.applicant?.gender)));
    sections.push(...createQuestionAnswer("Email", formatValue(formData.applicant?.email)));
    sections.push(...createQuestionAnswer("Phone Number", formatValue(formData.applicant?.phoneNumber)));

    // Business Eligibility
    sections.push(createSectionHeader("Business Profile & Eligibility", "🏢"));
    sections.push(...createQuestionAnswer("Business Name", formatValue(formData.business?.name)));
    sections.push(...createQuestionAnswer("Business Sector", formatValue(formData.business?.sector)));
    sections.push(...createQuestionAnswer("County", formatValue(formData.business?.county)));
    sections.push(...createQuestionAnswer("City", formatValue(formData.business?.city)));
    sections.push(...createQuestionAnswer("Is Registered", formatValue(formData.business?.isRegistered)));
    sections.push(...createQuestionAnswer("Registration Certificate", formData.business?.registrationCertificateUrl ? "Uploaded" : "Not provided"));
    sections.push(...createQuestionAnswer("Years Operational", formatValue(formData.business?.yearsOperational)));
    sections.push(...createQuestionAnswer("Has Financial Records", formatValue(formData.business?.hasFinancialRecords)));
    sections.push(...createQuestionAnswer("Financial Records", formData.business?.financialRecordsUrl ? "Uploaded" : "Not provided"));

    // Commercial Viability
    sections.push(createSectionHeader("Commercial Viability", "💰"));
    sections.push(...createQuestionAnswer("Revenue (Last Year)", formatCurrency(formData.commercialViability?.revenueLastYear)));
    sections.push(...createQuestionAnswer("Customer Count", formatValue(formData.commercialViability?.customerCount)));
    sections.push(...createQuestionAnswer("External Funding", formatValue(formData.commercialViability?.hasExternalFunding)));
    if (formData.commercialViability?.hasExternalFunding) {
        sections.push(...createQuestionAnswer("External Funding Details", formatValue(formData.commercialViability?.externalFundingDetails)));
    }

    // Market Potential
    sections.push(createSectionHeader("Market Potential", "📈"));
    sections.push(...createQuestionAnswer("Relative Pricing", formatValue(formData.marketPotential?.relativePricing)));
    sections.push(...createQuestionAnswer("Product Differentiation", formatValue(formData.marketPotential?.productDifferentiation)));
    sections.push(...createQuestionAnswer("Threat of Substitutes", formatValue(formData.marketPotential?.threatOfSubstitutes)));
    sections.push(...createQuestionAnswer("Ease of Market Entry", formatValue(formData.marketPotential?.easeOfMarketEntry)));
    sections.push(...createQuestionAnswer("Competitor Overview", formatValue(formData.marketPotential?.competitorOverview)));

    // Social Impact
    sections.push(createSectionHeader("Social Impact", "🌱"));
    sections.push(...createQuestionAnswer("Environmental Impact", formatValue(formData.socialImpact?.environmentalImpact)));
    sections.push(...createQuestionAnswer("Environmental Impact Description", formatValue(formData.socialImpact?.environmentalImpactDescription)));
    sections.push(...createQuestionAnswer("Full-time Employees Total", formatValue(formData.socialImpact?.fullTimeEmployeesTotal)));
    sections.push(...createQuestionAnswer("Full-time Employees Women", formatValue(formData.socialImpact?.fullTimeEmployeesWomen)));
    sections.push(...createQuestionAnswer("Full-time Employees Youth", formatValue(formData.socialImpact?.fullTimeEmployeesYouth)));
    sections.push(...createQuestionAnswer("Full-time Employees PWD", formatValue(formData.socialImpact?.fullTimeEmployeesPwd)));
    sections.push(...createQuestionAnswer("Business Compliance", formatValue(formData.socialImpact?.businessCompliance)));

    return sections;
}

// Generate DOCX for Acceleration Track
function generateAccelerationSections(formData: AccelerationApplicationFormData): Paragraph[] {
    const sections: Paragraph[] = [];

    // Applicant Details
    sections.push(createSectionHeader("Applicant Details", "👤"));
    sections.push(...createQuestionAnswer("First Name", formatValue(formData.applicant?.firstName)));
    sections.push(...createQuestionAnswer("Last Name", formatValue(formData.applicant?.lastName)));
    sections.push(...createQuestionAnswer("Gender", formatValue(formData.applicant?.gender)));
    sections.push(...createQuestionAnswer("Email", formatValue(formData.applicant?.email)));
    sections.push(...createQuestionAnswer("Phone Number", formatValue(formData.applicant?.phoneNumber)));

    // Business Eligibility
    sections.push(createSectionHeader("Business Profile & Eligibility", "🏢"));
    sections.push(...createQuestionAnswer("Business Name", formatValue(formData.business?.name)));
    sections.push(...createQuestionAnswer("Business Sector", formatValue(formData.business?.sector)));
    sections.push(...createQuestionAnswer("County", formatValue(formData.business?.county)));
    sections.push(...createQuestionAnswer("City", formatValue(formData.business?.city)));
    sections.push(...createQuestionAnswer("Is Registered", formatValue(formData.business?.isRegistered)));
    sections.push(...createQuestionAnswer("Registration Certificate", formData.business?.registrationCertificateUrl ? "Uploaded" : "Not provided"));
    sections.push(...createQuestionAnswer("Has Financial Records", formatValue(formData.business?.hasFinancialRecords)));
    sections.push(...createQuestionAnswer("Financial Records", formData.business?.financialRecordsUrl ? "Uploaded" : "Not provided"));

    // Revenue Performance
    sections.push(createSectionHeader("Revenue Performance", "💰"));
    sections.push(...createQuestionAnswer("Years Operational", formatValue(formData.revenues?.yearsOperational)));
    sections.push(...createQuestionAnswer("Revenue (Last Year)", formatCurrency(formData.revenues?.revenueLastYear)));
    sections.push(...createQuestionAnswer("Growth History", formatValue(formData.revenues?.growthHistory)));
    sections.push(...createQuestionAnswer("Future Sales Growth", formatValue(formData.revenues?.futureSalesGrowth)));
    sections.push(...createQuestionAnswer("Future Sales Growth Reason", formatValue(formData.revenues?.futureSalesGrowthReason)));
    sections.push(...createQuestionAnswer("External Funding", formatValue(formData.revenues?.hasExternalFunding)));
    if (formData.revenues?.hasExternalFunding) {
        sections.push(...createQuestionAnswer("External Funding Details", formatValue(formData.revenues?.externalFundingDetails)));
    }
    sections.push(...createQuestionAnswer("Audited Accounts", formData.revenues?.auditedAccountsUrl ? "Uploaded" : "Not provided"));

    // Impact Potential
    sections.push(createSectionHeader("Impact Potential", "📊"));
    sections.push(...createQuestionAnswer("Full-time Employees Total", formatValue(formData.impactPotential?.fullTimeEmployeesTotal)));
    sections.push(...createQuestionAnswer("Full-time Employees Women", formatValue(formData.impactPotential?.fullTimeEmployeesWomen)));
    sections.push(...createQuestionAnswer("Full-time Employees Youth", formatValue(formData.impactPotential?.fullTimeEmployeesYouth)));
    sections.push(...createQuestionAnswer("Full-time Employees PWD", formatValue(formData.impactPotential?.fullTimeEmployeesPwd)));
    sections.push(...createQuestionAnswer("Job Creation Potential", formatValue(formData.impactPotential?.jobCreationPotential)));

    // Scalability
    sections.push(createSectionHeader("Scalability", "📈"));
    sections.push(...createQuestionAnswer("Market Differentiation", formatValue(formData.scalability?.marketDifferentiation)));
    sections.push(...createQuestionAnswer("Competitive Advantage", formatValue(formData.scalability?.competitiveAdvantage)));
    sections.push(...createQuestionAnswer("Competitive Advantage Source", formatValue(formData.scalability?.competitiveAdvantageSource)));
    sections.push(...createQuestionAnswer("Technology Integration", formatValue(formData.scalability?.technologyIntegration)));
    sections.push(...createQuestionAnswer("Sales Marketing Integration", formatValue(formData.scalability?.salesMarketingIntegration)));

    // Social & Environmental Impact
    sections.push(createSectionHeader("Social & Environmental Impact", "🌱"));
    sections.push(...createQuestionAnswer("Social Impact Contribution", formatValue(formData.socialImpact?.socialImpactContribution)));
    sections.push(...createQuestionAnswer("Supplier Involvement", formatValue(formData.socialImpact?.supplierInvolvement)));
    sections.push(...createQuestionAnswer("Supplier Support Description", formatValue(formData.socialImpact?.supplierSupportDescription)));
    sections.push(...createQuestionAnswer("Environmental Impact", formatValue(formData.socialImpact?.environmentalImpact)));
    sections.push(...createQuestionAnswer("Environmental Impact Description", formatValue(formData.socialImpact?.environmentalImpactDescription)));

    // Business Model
    sections.push(createSectionHeader("Business Model", "💡"));
    sections.push(...createQuestionAnswer("Business Model Uniqueness", formatValue(formData.businessModel?.businessModelUniqueness)));
    sections.push(...createQuestionAnswer("Customer Value Proposition", formatValue(formData.businessModel?.customerValueProposition)));
    sections.push(...createQuestionAnswer("Competitive Advantage Strength", formatValue(formData.businessModel?.competitiveAdvantageStrength)));

    return sections;
}

export async function generateBireApplicationDocx({
    formData,
    track,
    applicantName,
}: BireDocumentGeneratorOptions) {
    const submissionDate = new Date();
    const trackLabel = track === "foundation" ? "Foundation Track" : "Acceleration Track";
    const trackColor = track === "foundation" ? "059669" : "2563EB";

    // Create document sections
    const sections: Paragraph[] = [];

    // Document Header
    sections.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: "Hand-in-Hand Kenya",
                    bold: true,
                    size: 48,
                    color: "1D4ED8",
                }),
            ],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: "BIRE Application Form",
                    size: 36,
                    color: "F97316",
                    bold: true,
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: trackLabel,
                    size: 28,
                    color: trackColor,
                    bold: true,
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: `Applicant: ${applicantName}`,
                    bold: true,
                    size: 24,
                }),
            ],
            spacing: { after: 100 },
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: `Generated on: ${format(submissionDate, "PPP 'at' p")}`,
                    size: 22,
                    color: "6B7280",
                }),
            ],
            spacing: { after: 600 },
        })
    );

    // Add track-specific sections
    if (track === "foundation") {
        sections.push(...generateFoundationSections(formData as FoundationApplicationFormData));
    } else {
        sections.push(...generateAccelerationSections(formData as AccelerationApplicationFormData));
    }

    // Footer
    sections.push(
        new Paragraph({
            children: [
                new TextRun({
                    text: "─".repeat(50),
                    size: 20,
                    color: "D1D5DB",
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 200 },
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: "End of Application",
                    size: 20,
                    italics: true,
                    color: "6B7280",
                }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
        }),
        new Paragraph({
            children: [
                new TextRun({
                    text: "Hand-in-Hand Kenya © " + new Date().getFullYear(),
                    italics: true,
                    size: 18,
                    color: "9CA3AF",
                }),
            ],
            alignment: AlignmentType.CENTER,
        })
    );

    // Create the document
    const doc = new Document({
        sections: [
            {
                properties: {},
                children: sections,
            },
        ],
    });

    // Generate and download the document
    const blob = await Packer.toBlob(doc);
    const sanitizedName = applicantName.replace(/[^a-zA-Z0-9]/g, "-");
    const fileName = `BIRE-${track}-Application-${sanitizedName}-${format(submissionDate, "yyyy-MM-dd")}.docx`;

    saveAs(blob, fileName);
}
