
import { PhaseConfig } from "@/components/application/admin/due-diligence/DueDiligenceForm";

// Criteria Options Helper
const options = [
    { score: 5, label: "Excellent / Clear" },
    { score: 3, label: "Adequate / Moderate" },
    { score: 1, label: "Weak / Unclear" },
    { score: 0, label: "None / Risk" },
];

export const PHASE_1_CONFIG: PhaseConfig = [
    {
        title: "Business Legitimacy (20 Points)",
        criteria: [
            {
                name: "Registration Status",
                options: [
                    { score: 5, label: "Valid & Verified", description: "Certificate valid, details match applicant, active." },
                    { score: 3, label: "Incomplete", description: "Registration exists but docs incomplete/unclear." },
                    { score: 1, label: "Claim Only", description: "Verbal claim or screenshot only." },
                    { score: 0, label: "No Evidence", description: "No registration or evidence." },
                ],
                guidelines: "5: Valid certificate or business number provided; details match applicant; registration active. 3: Registration exists but documentation incomplete, unclear, or mismatched minor details. 1: Only verbal claim or screenshot—insufficient evidence but possible to verify later. 0: No registration; no traceable evidence."
            },
            {
                name: "Ownership Structure",
                options: [
                    { score: 5, label: "Clear Structure", description: "Clearly explains owners, shares, roles." },
                    { score: 3, label: "Roles Unclear", description: "Owners named but roles undefined." },
                    { score: 1, label: "Conflicting", description: "Stories conflict or vague info." },
                    { score: 0, label: "Unknown", description: "Cannot explain ownership." },
                ],
                guidelines: "5: Applicant clearly explains owners, shareholding %, and roles; no contradictions. 3: Owners named but roles unclear or undefined; acceptable for micro-business. 1: Conflicting stories, unclear co-ownership, or vague information. 0: Applicant cannot explain who owns the business; significant governance risk."
            },
            {
                name: "Physical Address",
                options: [
                    { score: 5, label: "Detailed", description: "Consistent location with landmarks." },
                    { score: 3, label: "General Area", description: "Identifiable estate/area only." },
                    { score: 1, label: "Vague", description: "Unclear if premise exists." },
                    { score: 0, label: "None", description: "No physical premises described." },
                ],
                guidelines: "5: Detailed, consistent location with landmarks; verifiable and stable. 3: Identifiable general area but lacking detail (e.g., estate only). 1: Vague location; unclear if business exists physically. 0: No physical premises described."
            },
            {
                name: "Years in Operation",
                options: [
                    { score: 5, label: "4+ Years", description: "Continuous operation." },
                    { score: 3, label: "1–2 Years", description: "Stable activity." },
                    { score: 1, label: "< 1 Year", description: "Early stage." },
                    { score: 0, label: "< 3 Months", description: "High stability risk." },
                ],
                guidelines: "5: 4+ years continuous operation. 3: 1–2 years with stable activity. 1: Less than 1 year; early stage. 0: <3 months; high-risk stability."
            }
        ]
    },
    {
        title: "Operational Fit (20 Points)",
        criteria: [
            {
                name: "Sector Alignment",
                options: [
                    { score: 5, label: "Direct Alignment", description: "Agric, Waste, Services." },
                    { score: 3, label: "Indirect", description: "Relevant but tangential." },
                    { score: 1, label: "Weak Link", description: "Borderline relevance." },
                    { score: 0, label: "Misaligned", description: "Completely outside scope." },
                ],
                guidelines: "5: Direct alignment with BIRE sectors (agriculture, waste, services). 3: Indirect relevance but still within program scope. 1: Weak or borderline link. 0: Completely outside program scope."
            },
            {
                name: "Business Model Clarity",
                options: [
                    { score: 5, label: "Clear Model", description: "Value, delivery, & revenue clear." },
                    { score: 3, label: "Understandable", description: "Missing some details." },
                    { score: 1, label: "Unclear", description: "Scattered explanations." },
                    { score: 0, label: "Incoherent", description: "No coherent model." },
                ],
                guidelines: "5: Applicant clearly explains value creation, delivery, and revenue generation. 3: Understandable but missing details (pricing, customers, delivery). 1: Very unclear; scattered explanations. 0: No coherent model."
            },
            {
                name: "Operational Capacity",
                options: [
                    { score: 5, label: "Realistic", description: "Estimates and workflow clear." },
                    { score: 3, label: "Partial", description: "Ideally valid, needs check." },
                    { score: 1, label: "Overstated", description: "Inconsistent claims." },
                    { score: 0, label: "None", description: "No operations running." },
                ],
                guidelines: "5: Applicant provides realistic production estimates and workflow. 3: Capacity partly explained but may need validation. 1: Overstated or inconsistent capacity claims. 0: No operations currently running."
            },
            {
                name: "Staffing Structure",
                options: [
                    { score: 5, label: "Clear Roles", description: "Stable workforce." },
                    { score: 3, label: "Present", description: "Staff exist, roles unclear." },
                    { score: 1, label: "Informal", description: "Founder + casuals only." },
                    { score: 0, label: "None", description: "No support staff." },
                ],
                guidelines: "5: Clear roles for full/part-time staff; stable workforce. 3: Some staff exist but roles unclear. 1: Founder largely works alone; informal staff only. 0: No support staff at all."
            }
        ]
    },
    {
        title: "Market & Revenue (20 Points)",
        criteria: [
            {
                name: "Market Understanding",
                options: [
                    { score: 5, label: "Deep Insight", description: "knows target, demand, segments." },
                    { score: 3, label: "General Idea", description: "Lacks depth." },
                    { score: 1, label: "Poor", description: "Don't know who buys." },
                    { score: 0, label: "None", description: "Cannot explain market." },
                ],
                guidelines: "5: Applicant clearly states target market, demand drivers, and customer segments. 3: General idea of market but lacking depth. 1: Poor understanding of who buys/why. 0: Cannot explain market."
            },
            {
                name: "Customer Base Clarity",
                options: [
                    { score: 5, label: "3+ Groups", description: "Defined + recurring buyers." },
                    { score: 3, label: "1-2 Groups", description: "Limited segments." },
                    { score: 1, label: "Generic", description: "Inconsistent explanations." },
                    { score: 0, label: "None", description: "No customers." },
                ],
                guidelines: "5: ≥3 defined customer groups + recurring buyers. 3: 1–2 customer groups. 1: Inconsistent or generic explanations. 0: No identifiable customers."
            },
            {
                name: "Competition Awareness",
                options: [
                    { score: 5, label: "Aware", description: "Names 2+ competitors." },
                    { score: 3, label: "Basic", description: "Names 1 competitor." },
                    { score: 1, label: "Naive", description: "Claims 'No competition'." },
                    { score: 0, label: "None", description: "Unaware of competitors." },
                ],
                guidelines: "5: Names ≥2 genuine competitors + differentiation. 3: Names 1 competitor. 1: Says “No competition”—this shows low maturity. 0: Cannot identify any competitor."
            },
            {
                name: "Revenue Consistency",
                options: [
                    { score: 5, label: "Realistic", description: "Consistent with biz type." },
                    { score: 3, label: "Plausible", description: "Minor gaps." },
                    { score: 1, label: "Contradictory", description: "Unrealistic numbers." },
                    { score: 0, label: "Unclear", description: "No revenue clarity." },
                ],
                guidelines: "5: Revenue estimates realistic and consistent with business type. 3: Minor gaps but generally plausible. 1: Contradictory numbers or unrealistic pricing. 0: No revenue clarity."
            }
        ]
    },
    {
        title: "Financial Documentation (25 Points)",
        criteria: [
            {
                name: "Bank Statements",
                options: [
                    { score: 5, label: "Active", description: "Reflects ongoing activity." },
                    { score: 3, label: "Usable", description: "Partial/Unclear categorization." },
                    { score: 1, label: "Minimal", description: "Account exists, low activity." },
                    { score: 0, label: "None", description: "Not available." },
                ],
                guidelines: "5: Statements available and reflect ongoing business activity. 3: Partial months or unclear categorization but usable. 1: Very low/no business activity, but account exists. 0: None available."
            },
            {
                name: "Mpesa Statements",
                options: [
                    { score: 5, label: "Active", description: "Matches business nature." },
                    { score: 3, label: "Mixed", description: "Low volume or mixed." },
                    { score: 1, label: "Minimal", description: "Very little activity." },
                    { score: 0, label: "None", description: "No history." },
                ],
                guidelines: "5: Active transactions matching business nature. 3: Low-volume or mixed personal/business activity. 1: Minimal activity. 0: No Mpesa history."
            },
            {
                name: "Bookkeeping Records",
                options: [
                    { score: 5, label: "Structured", description: "Sales records, cashbook." },
                    { score: 3, label: "Basic", description: "Informal notes." },
                    { score: 1, label: "Poor", description: "Lacking structure." },
                    { score: 0, label: "None", description: "No records." },
                ],
                guidelines: "5: Sales records, cashbook, invoices available. 3: Basic books or informal notes. 1: Lacking structure or detail. 0: No records at all."
            },
            {
                name: "Loan Disclosure",
                options: [
                    { score: 5, label: "Truthful", description: "All debts disclosed." },
                    { score: 3, label: "Partial", description: "Records incomplete." },
                    { score: 1, label: "Unclear", description: "Hesitant." },
                    { score: 0, label: "Hidden", description: "Loans discovered later." },
                ],
                guidelines: "5: All debts disclosed truthfully. 3: Partial records or inconsistent explanations. 1: Hesitation or unclear debt status. 0: Hidden loans discovered."
            },
            {
                name: "Financial Accuracy",
                options: [
                    { score: 5, label: "Consistent", description: "All numbers match." },
                    { score: 3, label: "Minor Gaps", description: "Small discrepancies." },
                    { score: 1, label: "Inconsistent", description: "Multiple issues." },
                    { score: 0, label: "Dishonest", description: "Evidence of lies." },
                ],
                guidelines: "5: All numbers consistent across statements, Mpesa, and verbal claims. 3: Minor discrepancies. 1: Multiple inconsistencies. 0: Evidence of dishonesty."
            }
        ]
    },
    {
        title: "ESG & Safeguards (15 Points)",
        criteria: [
            {
                name: "Environmental Risk",
                options: [
                    { score: 5, label: "Low Risk", description: "Responsible handling." },
                    { score: 3, label: "Manageable", description: "Minor issues." },
                    { score: 1, label: "Poor", description: "Poor waste mgmt." },
                    { score: 0, label: "High Risk", description: "Pollution." },
                ],
                guidelines: "5: Low-risk operations; responsible waste handling. 3: Minor issues but manageable. 1: Poor waste management; potential harm. 0: High pollution risk."
            },
            {
                name: "Social Practices",
                options: [
                    { score: 5, label: "Ethical", description: "Fair labor, youth/women." },
                    { score: 3, label: "Basic", description: "Compliance." },
                    { score: 1, label: "Weak", description: "Poor labor practices." },
                    { score: 0, label: "Hazardous", description: "Child labor, etc." },
                ],
                guidelines: "5: Fair labour, youth/women involved, ethical practices. 3: Basic compliance. 1: Weak labour practices. 0: Child labour, hazardous work."
            },
            {
                name: "Governance Basics",
                options: [
                    { score: 5, label: "Structured", description: "Clear roles." },
                    { score: 3, label: "Logical", description: "Informal but works." },
                    { score: 1, label: "Founder", description: "One-man show." },
                    { score: 0, label: "None", description: "No structure." },
                ],
                guidelines: "5: Clear roles & structure. 3: Informal but logical. 1: Founder does everything. 0: No governance structure."
            }
        ]
    }
];

export const PHASE_2_CONFIG: PhaseConfig = [
    {
        title: "Physical Verification (20 Points)",
        criteria: [
            {
                name: "Premises Existence",
                options: [
                    { score: 5, label: "Confirmed", description: "Clearly exists, active, stable." },
                    { score: 3, label: "Small/Basic", description: "Exists but limited." },
                    { score: 1, label: "Temporary", description: "Uncertain location." },
                    { score: 0, label: "None", description: "Does not exist." },
                ],
                guidelines: "5: Premises clearly exist, active, stable. 3: Premises exist but small/basic. 1: Temporary or uncertain location. 0: Nothing exists physically."
            },
            {
                name: "Operational Activity",
                options: [
                    { score: 5, label: "Ongoing", description: "Production/service visible." },
                    { score: 3, label: "Low", description: "Real but slow." },
                    { score: 1, label: "Minimal", description: "Hardly any activity." },
                    { score: 0, label: "None", description: "No visible operations." },
                ],
                guidelines: "5: Production/service visibly ongoing. 3: Low activity but real. 1: Minimal activity. 0: No visible operations."
            },
            {
                name: "Safety & Cleanliness",
                options: [
                    { score: 5, label: "Excellent", description: "Safe, organized, clean." },
                    { score: 3, label: "Acceptable", description: "Needs improvement." },
                    { score: 1, label: "Cluttered", description: "Unsafe zones." },
                    { score: 0, label: "Dangerous", description: "High risk environment." },
                ],
                guidelines: "5: Safe, organized, clean. 3: Acceptable but needs improvement. 1: Cluttered/unsafe zones. 0: Dangerous environment."
            },
            {
                name: "Business Continuity Evidence",
                options: [
                    { score: 5, label: "Stable", description: "Inventory, equipment show stability." },
                    { score: 3, label: "General", description: "Some gaps." },
                    { score: 1, label: "Struggling", description: "Signs of inconsistency." },
                    { score: 0, label: "None", description: "No signs of ongoing business." },
                ],
                guidelines: "5: Inventory, equipment, workflow show stability. 3: Some gaps but generally stable. 1: Signs of struggle or inconsistency. 0: Nothing suggests ongoing business."
            }
        ]
    },
    {
        title: "Operations Validation (25 Points)",
        criteria: [
            {
                name: "Machinery/Tools",
                options: [
                    { score: 5, label: "Operational", description: "Present and working." },
                    { score: 3, label: "Underutilized", description: "Present." },
                    { score: 1, label: "Broken", description: "Outdated or broken." },
                    { score: 0, label: "None", description: "No tools found." },
                ],
                guidelines: "5: Tools present and operational. 3: Present but underutilized. 1: Broken or outdated. 0: None."
            },
            {
                name: "Inventory Levels",
                options: [
                    { score: 5, label: "Good", description: "Matches business scale." },
                    { score: 3, label: "Moderate", description: "Average levels." },
                    { score: 1, label: "Low", description: "Very little." },
                    { score: 0, label: "Zero", description: "No inventory." },
                ],
                guidelines: "5: Inventory matches scale of business. 3: Moderate levels. 1: Very little inventory. 0: Zero inventory."
            },
            {
                name: "Production Capacity Reality",
                options: [
                    { score: 5, label: "Matches", description: "Setup matches claimed capacity." },
                    { score: 3, label: "Slight Gap", description: "Small mismatch." },
                    { score: 1, label: "Large Gap", description: "Claims were overstated." },
                    { score: 0, label: "None", description: "No capacity." },
                ],
                guidelines: "5: Physical setup matches claimed capacity. 3: Slight mismatch. 1: Large mismatch. 0: No capacity."
            },
            {
                name: "Workforce Presence",
                options: [
                    { score: 5, label: "Active", description: "Staff working, clear roles." },
                    { score: 3, label: "Present", description: "Some staff found." },
                    { score: 1, label: "Casuals", description: "Inconsistent." },
                    { score: 0, label: "None", description: "No staff seen." },
                ],
                guidelines: "5: Staff working with clear roles. 3: Some staff present. 1: Only casuals or inconsistent staffing. 0: No staff."
            },
            {
                name: "Operational Workflow",
                options: [
                    { score: 5, label: "Efficient", description: "Good flow." },
                    { score: 3, label: "Adequate", description: "Works okay." },
                    { score: 1, label: "Poor", description: "Chaotic." },
                    { score: 0, label: "None", description: "No workflow." },
                ],
                guidelines: "5: Efficient workflow. 3: Adequate. 1: Poor/chaotic. 0: No observable workflow."
            }
        ]
    },
    {
        title: "Financial Validation (25 Points)",
        criteria: [
            {
                name: "Sales Records",
                options: [
                    { score: 5, label: "Verified", description: "Receipts/books consistent." },
                    { score: 3, label: "Usable", description: "Informal." },
                    { score: 1, label: "Patchy", description: "Incomplete." },
                    { score: 0, label: "None", description: "Not found." },
                ],
                guidelines: "5: Receipts/books available and consistent. 3: Informal but usable. 1: Patchy. 0: None."
            },
            {
                name: "Mpesa/POS Activity",
                options: [
                    { score: 5, label: "Active", description: "Real transactions visible." },
                    { score: 3, label: "Low", description: "Real but low volume." },
                    { score: 1, label: "Minimal", description: "Very low." },
                    { score: 0, label: "None", description: "No activity." },
                ],
                guidelines: "5: Real business transactions visible. 3: Low but real. 1: Very low. 0: No activity."
            },
            {
                name: "Bank Activity",
                options: [
                    { score: 5, label: "Consistent", description: "Deposits/withdrawals match." },
                    { score: 3, label: "Low", description: "Low activity." },
                    { score: 1, label: "Inconsistent", description: "Unclear." },
                    { score: 0, label: "None", description: "No activity." },
                ],
                guidelines: "5: Consistent deposits/withdrawals for business. 3: Low activity. 1: Inconsistent or unclear. 0: No account activity."
            },
            {
                name: "Loan Verification",
                options: [
                    { score: 5, label: "Confirmed", description: "Loans confirmed & honest." },
                    { score: 3, label: "Partial", description: "Partial confirmation." },
                    { score: 1, label: "Unclear", description: "Inconsistent info." },
                    { score: 0, label: "Hidden", description: "Debt hiding detected." },
                ],
                guidelines: "5: Loans confirmed + honest. 3: Partial confirmation. 1: Unclear or inconsistent. 0: Hiding debt."
            },
            {
                name: "Cashflow Stability",
                options: [
                    { score: 5, label: "Stable", description: "Supports growth." },
                    { score: 3, label: "Acceptable", description: "Okay." },
                    { score: 1, label: "Unstable", description: "Cashflow issues." },
                    { score: 0, label: "None", description: "No pattern." },
                ],
                guidelines: "5: Cashflow supports growth. 3: Acceptable. 1: Unstable. 0: No pattern."
            }
        ]
    },
    {
        title: "Governance and HR (15 Points)",
        criteria: [
            {
                name: "Staff Interviews",
                options: [
                    { score: 5, label: "Aligned", description: "Staff understand roles." },
                    { score: 3, label: "Clear", description: "Some clarity." },
                    { score: 1, label: "Weak", description: "Weak alignment." },
                    { score: 0, label: "Empty", description: "No staff/Contradictions." },
                ],
                guidelines: "5: Staff clearly understand roles & confirm business operations. 3: Some clarity. 1: Weak alignment. 0: No staff or contradictions."
            },
            {
                name: "Founder Involvement",
                options: [
                    { score: 5, label: "Active", description: "Daily engagement." },
                    { score: 3, label: "Semi", description: "Semi-involved." },
                    { score: 1, label: "Rare", description: "Rarely involved." },
                    { score: 0, label: "Absent", description: "Absent." },
                ],
                guidelines: "5: Founder is actively engaged daily. 3: Semi-involved. 1: Rarely involved. 0: Absent."
            },
            {
                name: "Role Clarity",
                options: [
                    { score: 5, label: "Defined", description: "Structured." },
                    { score: 3, label: "Informal", description: "Working." },
                    { score: 1, label: "None", description: "No clear roles." },
                    { score: 0, label: "Vacuum", description: "Total vacuum." },
                ],
                guidelines: "5: Defined structure. 3: Informal but working. 1: No clear roles. 0: Total governance vacuum."
            }
        ]
    },
    {
        title: "ESG & Safeguards (15 Points)",
        criteria: [
            {
                name: "Environmental Practices",
                options: [
                    { score: 5, label: "Good", description: "Proper waste mgmt." },
                    { score: 3, label: "Average", description: "Some gaps." },
                    { score: 1, label: "Poor", description: "Poor disposal." },
                    { score: 0, label: "Hazardous", description: "Hazardous." },
                ],
                guidelines: "5: Proper waste management. 3: Some gaps but no major risks. 1: Poor disposal. 0: Hazardous practices."
            },
            {
                name: "Worker Safety",
                options: [
                    { score: 5, label: "Safe", description: "PPE, equipment." },
                    { score: 3, label: "Basic", description: "Some safety." },
                    { score: 1, label: "Inadequate", description: "Low protection." },
                    { score: 0, label: "Unsafe", description: "Highly unsafe." },
                ],
                guidelines: "5: PPE, safe equipment, safety processes. 3: Basic safety observed. 1: Inadequate protection. 0: Highly unsafe conditions."
            },
            {
                name: "Inclusivity",
                options: [
                    { score: 5, label: "Included", description: "Youth/Women/PWD." },
                    { score: 3, label: "Some", description: "Some inclusion." },
                    { score: 1, label: "Limited", description: "Very limited." },
                    { score: 0, label: "None", description: "None." },
                ],
                guidelines: "5: Youth/women/PWD meaningfully included. 3: Some inclusion. 1: Very limited. 0: None."
            }
        ]
    }
];
