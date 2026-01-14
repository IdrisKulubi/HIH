"use server";

import { auth } from "@/auth";
import { getApplicationById } from "./admin-applications";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { format } from 'date-fns';

// Helper function to format values for display
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return format(new Date(value), "PPP");
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "None";
  if (typeof value === "string" && value.trim() === "") return "Not provided";
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
};

// Helper function to format currency
const formatCurrency = (value: unknown): string => {
  if (value === null || value === undefined) return "Not provided";
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num === 'number' && !isNaN(num)) {
    return `KES ${num.toLocaleString()}`;
  }
  return String(value);
};

// Helper function to create a section header
const createSectionHeader = (title: string, icon: string) => {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${icon} ${title}`,
        bold: true,
        size: 32,
        color: "2563EB"
      })
    ],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 400, after: 200 },
    alignment: AlignmentType.LEFT
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
          color: "374151"
        })
      ],
      spacing: { before: 200, after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: answer,
          size: 20,
          color: "1F2937"
        })
      ],
      spacing: { after: 200 },
      indent: { left: 360 }
    })
  ];
};

// Helper function to create a status badge table
//eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStatusTable = (application: any) => {
  return new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Application Status", bold: true, size: 20 })
                ]
              })
            ],
            width: { size: 30, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: (application.status || 'submitted').replace('_', ' ').toUpperCase(),
                    bold: true,
                    size: 20,
                    color: application.status === 'approved' ? '059669' :
                      application.status === 'rejected' ? 'DC2626' :
                        application.status === 'under_review' ? 'D97706' : '2563EB'
                  })
                ]
              })
            ],
            width: { size: 70, type: WidthType.PERCENTAGE }
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Application ID", bold: true, size: 20 })] })]
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: `#${application.id}`, size: 20 })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Track", bold: true, size: 20 })] })]
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: (application.track || 'foundation').toUpperCase(), size: 20 })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Submitted", bold: true, size: 20 })] })]
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({
                text: application.submittedAt ? format(new Date(application.submittedAt), "MMMM do, yyyy 'at' h:mm a") : "Not submitted",
                size: 20
              })]
            })]
          })
        ]
      })
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }
    },
    width: { size: 100, type: WidthType.PERCENTAGE }
  });
};

/**
 * Generate enhanced professional DOCX document for BIRE application review
 */
export async function downloadEnhancedApplicationDOCX(applicationId: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await getApplicationById(applicationId);
    if (!result.success || !result.data) {
      return { success: false, error: "Application not found" };
    }

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const application = result.data as any;
    const applicantName = `${application.applicant?.firstName || ''} ${application.applicant?.lastName || ''}`.trim() || 'Unknown Applicant';
    const business = application.business || {};

    const sections = [];

    // Document Header
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: "BIRE 2026 Programme", bold: true, size: 48, color: "1D4ED8" })
        ],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Application Review Document", bold: true, size: 28, color: "6B7280" })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 }
      }),
      new Paragraph({
        children: [new TextRun({ text: `Business: ${business.name || 'N/A'}`, bold: true, size: 26 })],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [new TextRun({ text: `Applicant: ${applicantName}`, bold: true, size: 24 })],
        spacing: { after: 300 }
      })
    );

    // Status Table
    sections.push(createStatusTable(application));
    sections.push(new Paragraph({ text: "", spacing: { after: 400 } }));

    // =====================
    // SECTION 1: APPLICANT INFO
    // =====================
    sections.push(createSectionHeader("Applicant Information", "👤"));
    sections.push(...createQuestionAnswer("Full Name", applicantName));
    sections.push(...createQuestionAnswer("Email Address", formatValue(application.applicant?.email)));
    sections.push(...createQuestionAnswer("Phone Number", formatValue(application.applicant?.phoneNumber)));
    sections.push(...createQuestionAnswer("Gender", formatValue(application.applicant?.gender)));
    sections.push(...createQuestionAnswer("Date of Birth", application.applicant?.dob ? format(new Date(application.applicant.dob), "PPP") : "Not provided"));
    sections.push(...createQuestionAnswer("ID/Passport Number", formatValue(application.applicant?.idPassportNumber)));

    // =====================
    // SECTION 2: BUSINESS INFO
    // =====================
    sections.push(createSectionHeader("Business Information", "🏢"));
    sections.push(...createQuestionAnswer("Business Name", formatValue(business.name)));
    sections.push(...createQuestionAnswer("Sector", formatValue(business.sector?.replace(/_/g, ' '))));
    if (business.sectorOther) {
      sections.push(...createQuestionAnswer("Sector (Other)", formatValue(business.sectorOther)));
    }
    sections.push(...createQuestionAnswer("Location", `${business.city || 'N/A'}, ${business.county?.replace(/_/g, ' ') || ''}, ${(business.country || '').toUpperCase()}`));
    sections.push(...createQuestionAnswer("Years Operational", formatValue(business.yearsOperational)));
    sections.push(...createQuestionAnswer("Is Registered?", formatValue(business.isRegistered)));
    sections.push(...createQuestionAnswer("Registration Type", formatValue(business.registrationType?.replace(/_/g, ' '))));
    sections.push(...createQuestionAnswer("Business Description", formatValue(business.description)));
    sections.push(...createQuestionAnswer("Problem Solved", formatValue(business.problemSolved)));
    if (business.businessModelDescription) {
      sections.push(...createQuestionAnswer("Business Model Description", formatValue(business.businessModelDescription)));
    }

    // =====================
    // SECTION 3: FINANCIAL INFO
    // =====================
    sections.push(createSectionHeader("Financial Information", "💰"));
    sections.push(...createQuestionAnswer("Revenue Last Year", formatCurrency(business.revenueLastYear)));
    sections.push(...createQuestionAnswer("Customer Count", formatValue(business.customerCount)));
    sections.push(...createQuestionAnswer("Has Financial Records?", formatValue(business.hasFinancialRecords)));
    sections.push(...createQuestionAnswer("Has Audited Accounts?", formatValue(business.hasAuditedAccounts)));
    sections.push(...createQuestionAnswer("Has External Funding?", formatValue(business.hasExternalFunding)));
    if (business.externalFundingDetails) {
      sections.push(...createQuestionAnswer("External Funding Details", formatValue(business.externalFundingDetails)));
    }

    // =====================
    // SECTION 4: EMPLOYEES
    // =====================
    sections.push(createSectionHeader("Employee Information", "👥"));
    sections.push(...createQuestionAnswer("Full-time Employees (Total)", formatValue(business.fullTimeEmployeesTotal)));
    sections.push(...createQuestionAnswer("Full-time Employees (Women)", formatValue(business.fullTimeEmployeesWomen)));
    sections.push(...createQuestionAnswer("Full-time Employees (Youth)", formatValue(business.fullTimeEmployeesYouth)));
    sections.push(...createQuestionAnswer("Full-time Employees (PWD)", formatValue(business.fullTimeEmployeesPwd)));

    // =====================
    // SECTION 5: MARKET & COMPETITION
    // =====================
    sections.push(createSectionHeader("Market & Competition", "📊"));
    sections.push(...createQuestionAnswer("Relative Pricing", formatValue(business.relativePricing)));
    sections.push(...createQuestionAnswer("Product Differentiation", formatValue(business.productDifferentiation)));
    sections.push(...createQuestionAnswer("Threat of Substitutes", formatValue(business.threatOfSubstitutes)));
    sections.push(...createQuestionAnswer("Competitor Overview", formatValue(business.competitorOverview)));
    sections.push(...createQuestionAnswer("Ease of Market Entry", formatValue(business.easeOfMarketEntry)));
    if (business.marketDifferentiation) {
      sections.push(...createQuestionAnswer("Market Differentiation", formatValue(business.marketDifferentiation?.replace(/_/g, ' '))));
    }
    if (business.marketDifferentiationDescription) {
      sections.push(...createQuestionAnswer("Differentiation Description", formatValue(business.marketDifferentiationDescription)));
    }

    // =====================
    // SECTION 6: BUSINESS MODEL
    // =====================
    sections.push(createSectionHeader("Business Model", "💡"));
    sections.push(...createQuestionAnswer("Business Model Innovation", formatValue(business.businessModelInnovation)));
    sections.push(...createQuestionAnswer("Digitization Level", formatValue(business.digitizationLevel)));
    if (business.digitizationReason) {
      sections.push(...createQuestionAnswer("Digitization Reason", formatValue(business.digitizationReason)));
    }
    sections.push(...createQuestionAnswer("Business Model Uniqueness", formatValue(business.businessModelUniqueness)));
    if (business.businessModelUniquenessDescription) {
      sections.push(...createQuestionAnswer("Uniqueness Description", formatValue(business.businessModelUniquenessDescription)));
    }
    sections.push(...createQuestionAnswer("Customer Value Proposition", formatValue(business.customerValueProposition)));
    sections.push(...createQuestionAnswer("Competitive Advantage", formatValue(business.competitiveAdvantage)));
    if (business.competitiveAdvantageSource) {
      sections.push(...createQuestionAnswer("Competitive Advantage Source", formatValue(business.competitiveAdvantageSource)));
    }
    if (business.competitiveAdvantageStrength) {
      sections.push(...createQuestionAnswer("Competitive Advantage Strength", formatValue(business.competitiveAdvantageStrength)));
    }
    if (business.competitiveAdvantageBarriers) {
      sections.push(...createQuestionAnswer("Competitive Advantage Barriers", formatValue(business.competitiveAdvantageBarriers)));
    }

    // =====================
    // SECTION 7: GROWTH & SCALABILITY
    // =====================
    sections.push(createSectionHeader("Growth & Scalability", "🚀"));
    sections.push(...createQuestionAnswer("Growth History", formatValue(business.growthHistory)));
    sections.push(...createQuestionAnswer("Average Annual Revenue Growth", formatValue(business.averageAnnualRevenueGrowth)));
    sections.push(...createQuestionAnswer("Future Sales Growth", formatValue(business.futureSalesGrowth)));
    if (business.futureSalesGrowthReason) {
      sections.push(...createQuestionAnswer("Future Growth Reason", formatValue(business.futureSalesGrowthReason)));
    }
    sections.push(...createQuestionAnswer("Scalability Plan", formatValue(business.scalabilityPlan)));
    sections.push(...createQuestionAnswer("Market Scale Potential", formatValue(business.marketScalePotential)));
    sections.push(...createQuestionAnswer("Technology Integration", formatValue(business.technologyIntegration)));
    if (business.technologyIntegrationDescription) {
      sections.push(...createQuestionAnswer("Tech Integration Details", formatValue(business.technologyIntegrationDescription)));
    }
    sections.push(...createQuestionAnswer("Sales & Marketing Integration", formatValue(business.salesMarketingIntegration)));
    if (business.salesMarketingApproach) {
      sections.push(...createQuestionAnswer("Sales & Marketing Approach", formatValue(business.salesMarketingApproach)));
    }

    // =====================
    // SECTION 8: SOCIAL & ENVIRONMENTAL IMPACT
    // =====================
    sections.push(createSectionHeader("Social & Environmental Impact", "🌍"));
    sections.push(...createQuestionAnswer("Environmental Impact", formatValue(business.environmentalImpact)));
    if (business.environmentalImpactDescription) {
      sections.push(...createQuestionAnswer("Environmental Impact Description", formatValue(business.environmentalImpactDescription)));
    }
    sections.push(...createQuestionAnswer("Social Impact Contribution", formatValue(business.socialImpactContribution)));
    if (business.socialImpactContributionDescription) {
      sections.push(...createQuestionAnswer("Social Impact Details", formatValue(business.socialImpactContributionDescription)));
    }
    sections.push(...createQuestionAnswer("Business Compliance", formatValue(business.businessCompliance)));
    sections.push(...createQuestionAnswer("Job Creation Potential", formatValue(business.jobCreationPotential)));
    sections.push(...createQuestionAnswer("Projected Inclusion (Women/Youth/PWD)", formatValue(business.projectedInclusion)));
    sections.push(...createQuestionAnswer("Supplier Involvement", formatValue(business.supplierInvolvement)));
    if (business.supplierSupportDescription) {
      sections.push(...createQuestionAnswer("Supplier Support Description", formatValue(business.supplierSupportDescription)));
    }

    // =====================
    // SECTION 9: DOCUMENTS
    // =====================
    sections.push(createSectionHeader("Uploaded Documents", "📁"));
    sections.push(...createQuestionAnswer("Registration Certificate", business.registrationCertificateUrl ? "✓ Uploaded" : "Not uploaded"));
    sections.push(...createQuestionAnswer("Financial Records", business.financialRecordsUrl ? "✓ Uploaded" : "Not uploaded"));
    sections.push(...createQuestionAnswer("Audited Accounts", business.auditedAccountsUrl ? "✓ Uploaded" : "Not uploaded"));
    sections.push(...createQuestionAnswer("Compliance Documents", business.complianceDocumentsUrl ? "✓ Uploaded" : "Not uploaded"));
    sections.push(...createQuestionAnswer("Sales Evidence", business.salesEvidenceUrl ? "✓ Uploaded" : "Not uploaded"));
    sections.push(...createQuestionAnswer("Tax Compliance", business.taxComplianceUrl ? "✓ Uploaded" : "Not uploaded"));
    sections.push(...createQuestionAnswer("Photos", business.photosUrl ? "✓ Uploaded" : "Not uploaded"));

    // =====================
    // SECTION 10: ELIGIBILITY (if available)
    // =====================
    if (application.eligibility) {
      sections.push(createSectionHeader("Eligibility Assessment", "✅"));
      sections.push(...createQuestionAnswer("Overall Eligible", application.eligibility.isEligible ? "✅ YES" : "❌ NO"));
      sections.push(...createQuestionAnswer("Total Score", `${application.eligibility.totalScore || 0}/100`));

      if (application.eligibility.mandatoryCriteria) {
        sections.push(...createQuestionAnswer("Age Eligible", application.eligibility.mandatoryCriteria.ageEligible ? "✅ Yes" : "❌ No"));
        sections.push(...createQuestionAnswer("Registration Eligible", application.eligibility.mandatoryCriteria.registrationEligible ? "✅ Yes" : "❌ No"));
        sections.push(...createQuestionAnswer("Revenue Eligible", application.eligibility.mandatoryCriteria.revenueEligible ? "✅ Yes" : "❌ No"));
      }
    }

    // =====================
    // SECTION 11: DECLARATIONS
    // =====================
    sections.push(createSectionHeader("Declarations", "✍️"));
    sections.push(...createQuestionAnswer("Social Safeguarding?", formatValue(business.hasSocialSafeguarding)));
    sections.push(...createQuestionAnswer("Declarant Name", formatValue(business.declarationName)));
    sections.push(...createQuestionAnswer("Declaration Date", business.declarationDate ? format(new Date(business.declarationDate), "PPP") : "Not provided"));

    // Footer
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: "— End of Document —", size: 20, italics: true, color: "6B7280" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 800, after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: `Generated on ${format(new Date(), "PPP 'at' p")}`, italics: true, size: 18, color: "9CA3AF" })],
        alignment: AlignmentType.CENTER
      })
    );

    // Create the document
    const doc = new Document({
      sections: [{
        properties: {},
        children: sections
      }]
    });

    // Generate buffer (not blob - blobs can't be serialized in server actions)
    const buffer = await Packer.toBuffer(doc);
    const base64 = buffer.toString('base64');
    const filename = `BIRE-Application-${business.name?.replace(/\s+/g, '-') || applicationId}-${format(new Date(), 'yyyy-MM-dd')}.docx`;

    return {
      success: true,
      data: {
        base64,
        filename,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    };
  } catch (error) {
    console.error("Error generating enhanced DOCX:", error);
    return {
      success: false,
      error: "Failed to generate document",
    };
  }
}