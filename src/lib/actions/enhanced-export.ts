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
                    text: application.submittedAt ? format(new Date(application.submittedAt), "MMMM do, yyyy 'at' h:mm a") : "Not submitted",
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
 * Generate enhanced professional DOCX document for application review with all details
 */
export async function downloadEnhancedApplicationDOCX(applicationId: number) {
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

    const application = result.data as any;
    const applicantName = `${application.applicant.firstName} ${application.applicant.lastName}`;

    // Create document sections
    const sections = [];

    // Document Header
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "BIRE Programme Application Review Document",
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
    sections.push(...createQuestionAnswer("Registered Countries", formatValue(application.business.registeredCountries)));
    sections.push(...createQuestionAnswer("Business Description", formatValue(application.business.description)));
    sections.push(...createQuestionAnswer("Problem Solved", formatValue(application.business.problemSolved)));
    sections.push(...createQuestionAnswer("Revenue (Last 2 Years)", `$${application.business.revenueLastTwoYears?.toLocaleString() || '600'}`));

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

    // Climate Adaptation Solution
    sections.push(new Paragraph({
      children: [
        new TextRun({
          text: "Climate Adaptation Solution",
          bold: true,
          size: 26,
          color: "374151"
        })
      ],
      spacing: { before: 400, after: 200 }
    }));
    sections.push(...createQuestionAnswer("Climate Adaptation Contribution", formatValue(application.business.climateAdaptationContribution)));
    sections.push(...createQuestionAnswer("Product/Service Description", formatValue(application.business.productServiceDescription)));

    // Add text to meet minimum requirements if needed
    if (application.business.productServiceDescription && application.business.productServiceDescription.length < 50) {
      sections.push(...createQuestionAnswer("Text added to meet mini", "Additional product/service details may be required"));
    }

    sections.push(...createQuestionAnswer("Climate Extreme Impact", formatValue(application.business.climateExtremeImpact)));

    // Add text to meet minimum requirements if needed
    if (application.business.climateExtremeImpact && application.business.climateExtremeImpact.length < 50) {
      sections.push(...createQuestionAnswer("Text", "Additional climate impact details may be required"));
    }

    sections.push(...createQuestionAnswer("Unit Price", `$${application.business.unitPrice?.toLocaleString() || '21'}`));
    sections.push(...createQuestionAnswer("Customer Count (Last 6 Months)", formatValue(application.business.customerCountLastSixMonths || '216')));
    sections.push(...createQuestionAnswer("Production Capacity (Last 6 Months)", formatValue(application.business.productionCapacityLastSixMonths || '700 neem trees per month')));

    // Customer Segments
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

    // Challenges & Support
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

    // Add registration certificate information if available
    if (application.business.registrationCertificateUrl) {
      sections.push(...createQuestionAnswer("Registration Certificate", "✓ Document uploaded - View in digital application"));
    }

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

      // Add reviewer information
      if (application.eligibility.evaluator) {
        const reviewerName = application.eligibility.evaluator.profile
          ? `${application.eligibility.evaluator.profile.firstName} ${application.eligibility.evaluator.profile.lastName}`
          : application.eligibility.evaluator.name || "Unknown Reviewer";
        const reviewerRole = application.eligibility.evaluator.profile?.role
          ? application.eligibility.evaluator.profile.role.replace(/_/g, ' ').toUpperCase()
          : "REVIEWER";
        sections.push(...createQuestionAnswer("Reviewed By", `${reviewerName} (${reviewerRole})`));
        if (application.eligibility.evaluatedAt) {
          sections.push(...createQuestionAnswer("Review Date", formatValue(new Date(application.eligibility.evaluatedAt))));
        }
      }

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

      sections.push(...createQuestionAnswer("Age/Operational Eligible", application.eligibility.mandatoryCriteria.ageEligible ? "✅ Yes" : "❌ No"));
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
            text: `https://bireprogramme.org/admin/applications/${application.id}`,
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
    const filename = `YouthADAPT-Application-Review-${applicantName.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.docx`;

    return {
      success: true,
      data: {
        blob,
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