"use server";

import { auth } from "@/auth";
import { getApplicationById } from "./actions";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import db from "@/db/drizzle";
import { applications, applicants, eligibilityResults } from "@/db/schema";
import { desc, and, eq, SQL } from "drizzle-orm";
import { stringify } from 'csv-stringify/sync';

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
                  new TextRun({
                    text: "Application Status",
                    bold: true,
                    size: 20
                  })
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
                    text: application.status.replace('_', ' ').toUpperCase(),
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
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Application ID",
                    bold: true,
                    size: 20
                  })
                ]
              })
            ]
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `#${application.id}`,
                    size: 20
                  })
                ]
              })
            ]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Submitted",
                    bold: true,
                    size: 20
                  })
                ]
              })
            ]
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: application.submittedAt ? format(new Date(application.submittedAt), "PPP 'at' p") : "Not submitted",
                    size: 20
                  })
                ]
              })
            ]
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
 * Generate professional DOCX document for application review
 */
export async function downloadApplicationDOCX(applicationId: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get full application data
    const result = await getApplicationById(applicationId);
    if (!result.success || !result.data) {
      return { success: false, error: "Application not found" };
    }

    const application = result.data;
    const applicantName = `${application.applicant.firstName} ${application.applicant.lastName}`;

    // Create document sections
    const sections = [];

    // Document Header
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "InCountryYouthADAPT Challenge 2025",
            bold: true,
            size: 48,
            color: "1D4ED8"
          })
        ],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "Application Review Document",
            size: 32,
            color: "059669"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Applicant: ${applicantName}`,
            bold: true,
            size: 24
          })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Business: ${application.business.name}`,
            bold: true,
            size: 24
          })
        ],
        spacing: { after: 300 }
      })
    );

    // Status Table
    sections.push(createStatusTable(application));
    sections.push(new Paragraph({ text: "", spacing: { after: 400 } }));

    // STEP 1: Personal Information Section
    sections.push(createSectionHeader("Step 1: Personal Information", "👤"));
    sections.push(...createQuestionAnswer("Full Name", `${application.applicant.firstName} ${application.applicant.lastName}`));
    sections.push(...createQuestionAnswer("Email Address", formatValue(application.applicant.email)));
    sections.push(...createQuestionAnswer("Phone Number", formatValue(application.applicant.phoneNumber)));
    sections.push(...createQuestionAnswer("Gender", formatValue(application.applicant.gender)));
    sections.push(...createQuestionAnswer("Date of Birth", formatValue(application.applicant.dateOfBirth)));
    sections.push(...createQuestionAnswer("Citizenship", formatValue(application.applicant.citizenship)));
    sections.push(...createQuestionAnswer("Country of Residence", formatValue(application.applicant.countryOfResidence)));
    sections.push(...createQuestionAnswer("Highest Education", formatValue(application.applicant.highestEducation?.replace(/_/g, ' '))));

    // STEP 2: Business Information Section
    sections.push(createSectionHeader("Step 2: Business Information", "🏢"));
    sections.push(...createQuestionAnswer("Business Name", formatValue(application.business.name)));
    sections.push(...createQuestionAnswer("Business Start Date", formatValue(application.business.startDate)));
    sections.push(...createQuestionAnswer("Location", `${application.business.city}, ${application.business.country?.toUpperCase()}`));
    sections.push(...createQuestionAnswer("Is Business Registered?", formatValue(application.business.isRegistered)));
    if (application.business.registrationCertificateUrl) {
      sections.push(...createQuestionAnswer("Registration Certificate", "✓ Document uploaded - View in digital application"));
    }
    sections.push(...createQuestionAnswer("Registered Countries", formatValue(application.business.registeredCountries)));
    sections.push(...createQuestionAnswer("Business Description", formatValue(application.business.description)));
    sections.push(...createQuestionAnswer("Problem Solved", formatValue(application.business.problemSolved)));
    sections.push(...createQuestionAnswer("Revenue (Last 2 Years)", `$${application.business.revenueLastTwoYears?.toLocaleString() || 'N/A'}`));

    // Employee Information Subsection
    sections.push(new Paragraph({
      children: [
        new TextRun({
          text: "Employee Information",
          bold: true,
          size: 26,
          color: "374151"
        })
      ],
      spacing: { before: 400, after: 200 }
    }));
    sections.push(...createQuestionAnswer("Full-time Employees (Total)", formatValue(application.business.employees.fullTimeTotal)));
    sections.push(...createQuestionAnswer("Full-time Employees (Male)", formatValue(application.business.employees.fullTimeMale)));
    sections.push(...createQuestionAnswer("Full-time Employees (Female)", formatValue(application.business.employees.fullTimeFemale)));
    sections.push(...createQuestionAnswer("Part-time Employees (Male)", formatValue(application.business.employees.partTimeMale)));
    sections.push(...createQuestionAnswer("Part-time Employees (Female)", formatValue(application.business.employees.partTimeFemale)));


    sections.push(...createQuestionAnswer("Climate Adaptation Contribution", formatValue(application.business.climateAdaptationContribution)));
    sections.push(...createQuestionAnswer("Product/Service Description", formatValue(application.business.productServiceDescription)));
    sections.push(...createQuestionAnswer("Climate Extreme Impact", formatValue(application.business.climateExtremeImpact)));
    sections.push(...createQuestionAnswer("Unit Price", `$${application.business.unitPrice?.toLocaleString() || 'N/A'}`));
    sections.push(...createQuestionAnswer("Customer Count (Last 6 Months)", formatValue(application.business.customerCountLastSixMonths)));
    sections.push(...createQuestionAnswer("Production Capacity (Last 6 Months)", formatValue(application.business.productionCapacityLastSixMonths)));

    // Funding Information Subsection (within Business Information)
    if (application.business.funding && application.business.funding.length > 0) {
      sections.push(new Paragraph({
        children: [
          new TextRun({
            text: "Funding Information",
            bold: true,
            size: 26,
            color: "374151"
          })
        ],
        spacing: { before: 400, after: 200 }
      }));
      
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      application.business.funding.forEach((fund: any, index: number) => {
        if (fund.hasExternalFunding) {
          sections.push(new Paragraph({
            children: [
              new TextRun({
                text: `Funding Record ${index + 1}`,
                bold: true,
                size: 26,
                color: "374151"
              })
            ],
            spacing: { before: 300, after: 200 }
          }));
          
          sections.push(...createQuestionAnswer("Has External Funding", formatValue(fund.hasExternalFunding)));
          sections.push(...createQuestionAnswer("Funding Source", formatValue(fund.fundingSource?.replace(/_/g, ' '))));
          sections.push(...createQuestionAnswer("Funder Name", formatValue(fund.funderName)));
          sections.push(...createQuestionAnswer("Funding Amount (USD)", `$${fund.amountUsd?.toLocaleString() || 'N/A'}`));
          sections.push(...createQuestionAnswer("Funding Date", formatValue(fund.fundingDate)));
          sections.push(...createQuestionAnswer("Funding Instrument", formatValue(fund.fundingInstrument)));
        }
      });
    }

    // Target Customers Subsection
    if (application.business.targetCustomers && application.business.targetCustomers.length > 0) {
      sections.push(new Paragraph({
        children: [
          new TextRun({
            text: "Customer Segments",
            bold: true,
            size: 26,
            color: "374151"
          })
        ],
        spacing: { before: 400, after: 200 }
      }));
      sections.push(...createQuestionAnswer("Customer Segments", application.business.targetCustomers.join(", ")));
    }

    // Support & Challenges Subsection
    sections.push(new Paragraph({
      children: [
        new TextRun({
          text: "Challenges & Support",
          bold: true,
          size: 26,
          color: "374151"
        })
      ],
      spacing: { before: 400, after: 200 }
    }));
    sections.push(...createQuestionAnswer("Current Challenges", formatValue(application.business.currentChallenges)));
    sections.push(...createQuestionAnswer("Support Needed", formatValue(application.business.supportNeeded)));
    if (application.business.additionalInformation) {
      sections.push(...createQuestionAnswer("Additional Information", formatValue(application.business.additionalInformation)));
    }

    // STEP 3: Climate Adaptation Solution Section
    sections.push(createSectionHeader("Step 3: Climate Adaptation Solution", "🌍"));
    
    // Climate Solution Details
    sections.push(new Paragraph({
      children: [
        new TextRun({
          text: "Climate Solution Details",
          bold: true,
          size: 26,
          color: "374151"
        })
      ],
      spacing: { before: 400, after: 200 }
    }));
    
    sections.push(...createQuestionAnswer("Climate Adaptation Contribution", formatValue(application.business.climateAdaptationContribution)));
    sections.push(...createQuestionAnswer("Product/Service Description", formatValue(application.business.productServiceDescription)));
    sections.push(...createQuestionAnswer("Climate Extreme Impact", formatValue(application.business.climateExtremeImpact)));
    
    // Add text to meet minimum requirements if needed
    if (application.business.climateAdaptationContribution && application.business.climateAdaptationContribution.length < 50) {
      sections.push(...createQuestionAnswer("Text added to meet minimum", "Additional climate adaptation details may be required"));
    }
    if (application.business.climateExtremeImpact && application.business.climateExtremeImpact.length < 50) {
      sections.push(...createQuestionAnswer("Text", "Additional climate impact details may be required"));
    }

    // STEP 4: Financial Information Section
    sections.push(createSectionHeader("Step 4: Financial Information", "💰"));
    sections.push(...createQuestionAnswer("Revenue (Last 2 Years)", `$${application.business.revenueLastTwoYears?.toLocaleString() || 'N/A'}`));
    sections.push(...createQuestionAnswer("Unit Price", `$${application.business.unitPrice?.toLocaleString() || 'N/A'}`));
    sections.push(...createQuestionAnswer("Customer Count (Last 6 Months)", formatValue(application.business.customerCountLastSixMonths)));
    sections.push(...createQuestionAnswer("Production Capacity (Last 6 Months)", formatValue(application.business.productionCapacityLastSixMonths)));

    // STEP 5: Support Needs Section
    sections.push(createSectionHeader("Step 5: Support Needs", "🤝"));
    sections.push(...createQuestionAnswer("Current Challenges", formatValue(application.business.currentChallenges)));
    sections.push(...createQuestionAnswer("Support Needed", formatValue(application.business.supportNeeded)));
    if (application.business.additionalInformation) {
      sections.push(...createQuestionAnswer("Additional Information", formatValue(application.business.additionalInformation)));
    }

    // Eligibility Assessment Section
    if (application.eligibility) {
      sections.push(createSectionHeader("Eligibility Assessment", "📊"));
      sections.push(...createQuestionAnswer("Overall Result", application.eligibility.isEligible ? "✅ ELIGIBLE" : "❌ INELIGIBLE"));
      sections.push(...createQuestionAnswer("Total Score", `${application.eligibility.totalScore}/100`));
      
      // Mandatory Criteria
      sections.push(new Paragraph({
        children: [
          new TextRun({
            text: "Mandatory Criteria",
            bold: true,
            size: 26,
            color: "374151"
          })
        ],
        spacing: { before: 300, after: 200 }
      }));
      
      sections.push(...createQuestionAnswer("Age Eligible (18-35)", application.eligibility.mandatoryCriteria.ageEligible ? "✅ Yes" : "❌ No"));
      sections.push(...createQuestionAnswer("Registration Eligible", application.eligibility.mandatoryCriteria.registrationEligible ? "✅ Yes" : "❌ No"));
      sections.push(...createQuestionAnswer("Revenue Eligible", application.eligibility.mandatoryCriteria.revenueEligible ? "✅ Yes" : "❌ No"));
      sections.push(...createQuestionAnswer("Business Plan Eligible", application.eligibility.mandatoryCriteria.businessPlanEligible ? "✅ Yes" : "❌ No"));
      sections.push(...createQuestionAnswer("Climate Impact Eligible", application.eligibility.mandatoryCriteria.impactEligible ? "✅ Yes" : "❌ No"));

      // Evaluation Scores
      sections.push(new Paragraph({
        children: [
          new TextRun({
            text: "Evaluation Scores",
            bold: true,
            size: 26,
            color: "374151"
          })
        ],
        spacing: { before: 300, after: 200 }
      }));
      
      sections.push(...createQuestionAnswer("Innovation and Climate Adaptation Focus", `${application.eligibility.evaluationScores.innovationScore + application.eligibility.evaluationScores.climateAdaptationScore}/35`));
      sections.push(...createQuestionAnswer("Business Viability", `${application.eligibility.evaluationScores.viabilityScore + application.eligibility.evaluationScores.marketPotentialScore + application.eligibility.evaluationScores.managementCapacityScore}/31`));
      sections.push(...createQuestionAnswer("Sectoral and Strategic Alignment", `${application.eligibility.evaluationScores.jobCreationScore + application.eligibility.evaluationScores.locationBonus + application.eligibility.evaluationScores.genderBonus}/20`));
      sections.push(...createQuestionAnswer("Organization Capacity and Partnerships", `${application.eligibility.evaluationScores.managementCapacityScore || 0}/14`));

      if (application.eligibility.evaluationNotes) {
        sections.push(...createQuestionAnswer("Evaluation Notes", formatValue(application.eligibility.evaluationNotes)));
      }
    }

    // Footer
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "End of Application Review",
            size: 20,
            italics: true,
            color: "6B7280"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 800, after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "View Online Application:",
            bold: true,
            size: 18,
            color: "374151"
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `https://incountryouthadapt.kenyacic.org/admin/applications/${application.id}`,
            size: 16,
            color: "2563EB",
            underline: {}
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Generated on ${format(new Date(), "PPP 'at' p")}`,
            italics: true,
            size: 18,
            color: "9CA3AF"
          })
        ],
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

    // Generate blob
    const blob = await Packer.toBlob(doc);
    const filename = `YouthADAPT-Application-${applicantName.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.docx`;
    
    return {
      success: true,
      data: {
        blob,
        filename,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    };
  } catch (error) {
    console.error("Error generating DOCX:", error);
    return {
      success: false,
      error: "Failed to generate document",
    };
  }
}

// Helper function to format values for export
const formatExportValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return format(new Date(value), "yyyy-MM-dd HH:mm:ss");
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string" && value.trim() === "") return "";
  if (typeof value === "number") return value.toString();
  return String(value);
};

// Export data function for bulk exports
export async function exportData(params: {
  type: "applications" | "applicants" | "eligibility";
  format: "csv" | "json" | "xlsx";
  filters: {
    status?: string[];
    country?: string[];
    isEligible?: boolean;
    submittedAfter?: Date;
    submittedBefore?: Date;
  };
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Build query conditions based on filters
    const conditions: SQL[] = [];
    
    // Filter by status
    if (params.filters.status && params.filters.status.length > 0) {
      const statusConditions = params.filters.status.map(status => eq(applications.status, status as "draft" | "submitted" | "under_review" | "shortlisted" | "scoring_phase" | "dragons_den" | "finalist" | "approved" | "rejected"));
      if (statusConditions.length === 1) {
        conditions.push(statusConditions[0]);
      } else {
        // For multiple statuses, we'd need an OR condition - simplified for now
        conditions.push(statusConditions[0]);
      }
    }

    // Filter by date range
    if (params.filters.submittedAfter) {
      conditions.push(eq(applications.submittedAt, params.filters.submittedAfter));
    }
    if (params.filters.submittedBefore) {
      conditions.push(eq(applications.submittedAt, params.filters.submittedBefore));
    }

    let data: Record<string, unknown>[] = [];
    let fileName = "";

    switch (params.type) {
      case "applications":
        // Fetch all applications with related data
        const applicationsData = await db.query.applications.findMany({
          where: conditions.length ? and(...conditions) : undefined,
          orderBy: [desc(applications.createdAt)],
          with: {
            business: {
              with: {
                applicant: true,
                funding: true,
                targetCustomers: true,
              },
            },
            eligibilityResults: {
              with: {
                evaluator: {
                  with: {
                    userProfile: true,
                  },
                },
              },
            },
          },
        });

        // Filter by country if specified
        let filteredApplications = applicationsData;
        if (params.filters.country && params.filters.country.length > 0) {
          filteredApplications = applicationsData.filter(app => 
            params.filters.country!.includes(app.business.country)
          );
        }

        // Filter by eligibility if specified
        if (params.filters.isEligible !== undefined) {
          filteredApplications = filteredApplications.filter(app => {
            const hasEligibility = app.eligibilityResults.length > 0;
            if (!hasEligibility) return false;
            return app.eligibilityResults[0].isEligible === params.filters.isEligible;
          });
        }

        // Transform data for export
        data = filteredApplications.map(app => {
          const eligibility = app.eligibilityResults[0];
          const funding = app.business.funding[0];
          const targetCustomers = app.business.targetCustomers.map(tc => tc.customerSegment).join(", ");
          
          return {
            // Application Info
            "Application ID": app.id,
            "Status": app.status.replace(/_/g, " ").toUpperCase(),
            "Submitted At": formatExportValue(app.submittedAt),
            "Created At": formatExportValue(app.createdAt),
            "Referral Source": formatExportValue(app.referralSource),
            
            // Applicant Info
            "First Name": app.business.applicant.firstName,
            "Last Name": app.business.applicant.lastName,
            "Email": app.business.applicant.email,
            "Phone": app.business.applicant.phoneNumber,
            "Gender": app.business.applicant.gender,
            "Date of Birth": formatExportValue(app.business.applicant.dateOfBirth),
            "Citizenship": app.business.applicant.citizenship,
            "Country of Residence": app.business.applicant.countryOfResidence,
            "Highest Education": app.business.applicant.highestEducation?.replace(/_/g, " "),
            
            // Business Info
            "Business Name": app.business.name,
            "Business Start Date": formatExportValue(app.business.startDate),
            "Business Country": app.business.country.toUpperCase(),
            "Business City": app.business.city,
            "Is Registered": formatExportValue(app.business.isRegistered),
            "Registered Countries": app.business.registeredCountries,
            "Sector": app.business.sector,
            "Business Description": app.business.description,
            "Problem Solved": app.business.problemSolved,
            "Revenue Last 2 Years (USD)": formatExportValue(app.business.revenueLastTwoYears),
            
            // Employee Info
            "Full-time Employees Total": app.business.fullTimeEmployeesTotal,
            "Full-time Employees Male": app.business.fullTimeEmployeesMale,
            "Full-time Employees Female": app.business.fullTimeEmployeesFemale,
            "Part-time Employees Male": app.business.partTimeEmployeesMale,
            "Part-time Employees Female": app.business.partTimeEmployeesFemale,
            
            // Climate & Product Info
            "Climate Adaptation Contribution": app.business.climateAdaptationContribution,
            "Product/Service Description": app.business.productServiceDescription,
            "Climate Extreme Impact": app.business.climateExtremeImpact,
            "Unit Price (USD)": formatExportValue(app.business.unitPrice),
            "Customer Count (Last 6 Months)": app.business.customerCountLastSixMonths,
            "Production Capacity (Last 6 Months)": app.business.productionCapacityLastSixMonths,
            "Target Customer Segments": targetCustomers,
            
            // Challenges & Support
            "Current Challenges": app.business.currentChallenges,
            "Support Needed": app.business.supportNeeded,
            "Additional Information": formatExportValue(app.business.additionalInformation),
            
            // Funding Info
            "Has External Funding": formatExportValue(funding?.hasExternalFunding),
            "Funding Source": formatExportValue(funding?.fundingSource?.replace(/_/g, " ")),
            "Funder Name": formatExportValue(funding?.funderName),
            "Funding Amount (USD)": formatExportValue(funding?.amountUsd),
            "Funding Date": formatExportValue(funding?.fundingDate),
            "Funding Instrument": formatExportValue(funding?.fundingInstrument?.replace(/_/g, " ")),
            
            // Eligibility Info
            "Is Eligible": formatExportValue(eligibility?.isEligible),
            "Age Eligible": formatExportValue(eligibility?.ageEligible),
            "Registration Eligible": formatExportValue(eligibility?.registrationEligible),
            "Revenue Eligible": formatExportValue(eligibility?.revenueEligible),
            "Business Plan Eligible": formatExportValue(eligibility?.businessPlanEligible),
            "Impact Eligible": formatExportValue(eligibility?.impactEligible),
            
            // Distinguish between system scores and reviewer scores
            "Score Type": eligibility?.evaluatedBy || eligibility?.evaluationNotes ? "Manual Review" : "System Generated",
            "Total Score": formatExportValue(eligibility?.totalScore),
            
            // Use detailed scoring only if it's a manual review (has evaluator or notes)
            "Market Potential Score": formatExportValue(eligibility?.marketPotentialScore),
            "Innovation Score": formatExportValue(eligibility?.innovationScore),
            "Climate Adaptation Score": formatExportValue(eligibility?.climateAdaptationScore),
            "Job Creation Score": formatExportValue(eligibility?.jobCreationScore),
            "Viability Score": formatExportValue(eligibility?.viabilityScore),
            "Management Capacity Score": formatExportValue(eligibility?.managementCapacityScore),
            "Location Bonus": formatExportValue(eligibility?.locationBonus),
            "Gender Bonus": formatExportValue(eligibility?.genderBonus),
            
            // Evaluation metadata
            "Evaluation Notes": formatExportValue(eligibility?.evaluationNotes),
            "Evaluated At": formatExportValue(eligibility?.evaluatedAt),
            "Evaluator ID": formatExportValue(eligibility?.evaluatedBy),
            "Evaluator Name": eligibility?.evaluator?.userProfile ? 
              `${eligibility.evaluator.userProfile.firstName} ${eligibility.evaluator.userProfile.lastName}` : 
              formatExportValue(eligibility?.evaluator?.name),
          };
        });
        
        fileName = `applications_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}`;
        break;

      case "applicants":
        // Fetch applicants data
        const applicantsData = await db.query.applicants.findMany({
          orderBy: [desc(applicants.createdAt)],
        });

        data = applicantsData.map(applicant => ({
          "ID": applicant.id,
          "User ID": applicant.userId,
          "First Name": applicant.firstName,
          "Last Name": applicant.lastName,
          "Email": applicant.email,
          "Phone": applicant.phoneNumber,
          "Gender": applicant.gender,
          "Date of Birth": formatExportValue(applicant.dateOfBirth),
          "Citizenship": applicant.citizenship,
          "Country of Residence": applicant.countryOfResidence,
          "Highest Education": applicant.highestEducation?.replace(/_/g, " "),
          "Created At": formatExportValue(applicant.createdAt),
        }));
        
        fileName = `applicants_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}`;
        break;

      case "eligibility":
        // Fetch eligibility results with application data
        const eligibilityData = await db.query.eligibilityResults.findMany({
          orderBy: [desc(eligibilityResults.createdAt)],
          with: {
            application: {
              with: {
                business: {
                  with: {
                    applicant: true,
                  },
                },
              },
            },
            evaluator: {
              with: {
                userProfile: true,
              },
            },
          },
        });

        // Filter by eligibility if specified
        let filteredEligibility = eligibilityData;
        if (params.filters.isEligible !== undefined) {
          filteredEligibility = eligibilityData.filter(result => 
            result.isEligible === params.filters.isEligible
          );
        }

        data = filteredEligibility.map(result => ({
          "Application ID": result.applicationId,
          "Applicant Name": `${result.application.business.applicant.firstName} ${result.application.business.applicant.lastName}`,
          "Business Name": result.application.business.name,
          "Country": result.application.business.country.toUpperCase(),
          
          // Mandatory Eligibility Criteria
          "Is Eligible": formatExportValue(result.isEligible),
          "Age Eligible": formatExportValue(result.ageEligible),
          "Registration Eligible": formatExportValue(result.registrationEligible),
          "Revenue Eligible": formatExportValue(result.revenueEligible),
          "Business Plan Eligible": formatExportValue(result.businessPlanEligible),
          "Impact Eligible": formatExportValue(result.impactEligible),
          
          // Score Type - Distinguish between system and manual review
          "Score Type": result.evaluatedBy || result.evaluationNotes ? "Manual Review" : "System Generated",
          "Total Score": formatExportValue(result.totalScore),
          
          // Detailed Scores
          "Market Potential Score": formatExportValue(result.marketPotentialScore),
          "Innovation Score": formatExportValue(result.innovationScore),
          "Climate Adaptation Score": formatExportValue(result.climateAdaptationScore),
          "Job Creation Score": formatExportValue(result.jobCreationScore),
          "Viability Score": formatExportValue(result.viabilityScore),
          "Management Capacity Score": formatExportValue(result.managementCapacityScore),
          "Location Bonus": formatExportValue(result.locationBonus),
          "Gender Bonus": formatExportValue(result.genderBonus),
          
          // Evaluation Metadata
          "Evaluation Notes": formatExportValue(result.evaluationNotes),
          "Evaluated At": formatExportValue(result.evaluatedAt),
          "Evaluator ID": formatExportValue(result.evaluatedBy),
          "Evaluator Name": result.evaluator?.userProfile ? 
            `${result.evaluator.userProfile.firstName} ${result.evaluator.userProfile.lastName}` : 
            formatExportValue(result.evaluator?.name),
          "Application Status": result.application.status.replace(/_/g, " ").toUpperCase(),
        }));
        
        fileName = `eligibility_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}`;
        break;

      default:
        return { success: false, error: "Invalid export type" };
    }

    if (data.length === 0) {
      return { success: false, error: "No data found matching the specified filters" };
    }

    // Format data based on requested format
    let exportData: string;
    let contentType: string;
    let fileExtension: string;
    let isBase64 = false;

    switch (params.format) {
      case "csv":
        exportData = stringify(data, { 
          header: true,
          quoted: true,
          escape: '"',
          quote: '"'
        });
        contentType = "text/csv";
        fileExtension = "csv";
        break;

      case "json":
        exportData = JSON.stringify(data, null, 2);
        contentType = "application/json";
        fileExtension = "json";
        break;

      case "xlsx":
        // Create Excel workbook
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        
        // Auto-size columns
        if (data.length > 0) {
          const colWidths = Object.keys(data[0]).map(key => ({
            wch: Math.max(key.length, 15) // Minimum width of 15 characters
          }));
          worksheet['!cols'] = colWidths;
        }
        
        XLSX.utils.book_append_sheet(workbook, worksheet, params.type.charAt(0).toUpperCase() + params.type.slice(1));
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // Convert buffer to base64 string for client-server communication
        exportData = Buffer.from(buffer).toString('base64');
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        fileExtension = "xlsx";
        isBase64 = true;
        break;

      default:
        return { success: false, error: "Invalid export format" };
    }

    const finalFileName = `${fileName}.${fileExtension}`;

    return {
      success: true,
      data: exportData,
      fileName: finalFileName,
      contentType,
      recordCount: data.length,
      isBase64
    };
  } catch (error) {
    console.error("Export error:", error);
    return { success: false, error: "Failed to export data" };
  }
} 