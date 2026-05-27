# Innovation Fund Management Module Feature Tracker

## Summary

This tracker converts the BIRE Innovation Fund brief and the attached Matching Grant Application Form, A2F Scoring Criteria, and GAIR template into implementation-ready system requirements.

This document supersedes older A2F notes where they conflict with the May 2026 attachments, especially for the Matching Grant scoring structure, revenue gates, and qualifying threshold.

## Status Legend

| Status | Meaning |
| --- | --- |
| TODO | Feature or update still needs to be implemented. |
| IN PROGRESS | Work has started but is not complete. |
| DONE | Existing code already appears to support the item or the item has been completed. |

## Matching Grant Workflow

`Application Submitted -> Revenue Eligibility -> Reviewer Scoring -> GAIR Preparation -> Investment Committee Review -> Approval -> Procurement & Grant Management -> Monitoring/Reporting`

| Step | Status | Required System Behaviour |
| --- | --- | --- |
| 1. Enterprise submits Matching Grant application | DONE | Enterprise completes and submits the online Matching Grant form through the portal. |
| 2. System checks revenue eligibility | DONE | System validates track-specific revenue rules before the application proceeds. |
| 3. Reviewer scores application | DONE | Reviewer scores using the correct Foundation or Accelerator Matching Grant rubric. |
| 4. System calculates qualification result | DONE | System calculates total score, applies revenue hard gate, and shows whether the enterprise qualifies. |
| 5. Qualified cases proceed to GAIR | DONE | Only enterprises that meet revenue eligibility and score at least 60 proceed to GAIR preparation. |
| 6. GAIR is generated or populated | DONE | GAIR is populated from application and scoring data, then completed by staff. |
| 7. Investment Committee reviews GAIR | DONE | IC reviews the GAIR and records approve, approve with conditions, defer, or decline decision. |
| 8. Approved case moves to procurement and grant management | DONE | Approved enterprises move into procurement tracking, disbursement, implementation monitoring, documentation, and reporting. |

## Track And Revenue Rules

| Rule | Status | Requirement |
| --- | --- | --- |
| Foundation Track revenue gate | DONE | Foundation enterprises must generally have annual revenue from KES 500,000 to KES 3,000,000. |
| Accelerator Track revenue gate | DONE | Accelerator enterprises must generally have annual revenue above KES 3,000,000. |
| Foundation revenue score bands | DONE | `> KES 2,000,000 = 10`, `KES 1,000,000-2,000,000 = 6`, `KES 500,000-1,000,000 = 3`, below KES 500,000 or above KES 3,000,000 = `0` and ineligible for Foundation. |
| Accelerator revenue score bands | DONE | `> KES 5,000,000 = 10`, `KES 3,500,000-5,000,000 = 6`, `KES 3,000,000-3,500,000 = 3`, below KES 3,000,000 = `0` and ineligible for Accelerator. |
| Revenue evidence | TODO | Revenue must be verified from supporting documents such as bank or M-Pesa statements, financial statements, management accounts, or audited accounts where available. |
| Disputed or unverifiable revenue | TODO | If revenue is disputed or unverifiable, the case must be escalated to the Programme Coordinator and must not be estimated. |

## Enterprise Online Matching Grant Application

| Feature | Status | Required Fields / Behaviour |
| --- | --- | --- |
| Application shell and workflow | DONE | Build a multi-step Matching Grant application workflow for enterprises. |
| Track selection | DONE | Allow enterprise or staff to select Foundation Track or Accelerator Track. |
| Enterprise identification | DONE | Capture enterprise name, trading name, registration number, legal structure, registration date, year operations started, physical address, county, sub-county or ward, GPS or pin location, and postal address. |
| Lead entrepreneur details | DONE | Capture full name, ID or passport number, gender, date of birth, applicant category, phone, email, role, education, and relevant experience. |
| Other owners or partners | DONE | Capture names, roles, ownership percentages, gender, and category for other owners or partners where applicable. |
| Programme engagement | DONE | Capture BIRE client ID, regional hub, TA lead, date joined, duration in TA support, and key milestones achieved in TA phase. |
| Business overview | DONE | Capture sector, value chain node, business description, problem solved, target market and estimated size, marketing and sales strategy, and competitive advantages. |
| Financial overview | DONE | Capture annual revenue for 2025, 2024, and 2023 where available, monthly revenue, monthly operating costs, profitability, employee count, casual or contract workers, revenue streams, financial obligations, and financial recordkeeping status. |
| Grant request summary | DONE | Capture total project investment, amount requested from BIRE, enterprise co-investment amount, co-investment source, project title or purpose, funding need, and consequence of not receiving the grant. |
| CAPEX-only rule | DONE | Show and enforce that Matching Grant funds are for CAPEX financing only. |
| Eligible use-of-funds categories | DONE | Allow eligible uses including productive equipment, technology adoption, climate-resilient infrastructure, and operational upgrades linked to the approved investment. |
| Ineligible use-of-funds categories | DONE | Prevent or flag personal expenses, loan repayments, and routine overhead costs not linked to the approved investment. |
| Detailed budget | DONE | Capture each investment item, total actual cost, BIRE grant amount, and enterprise co-investment amount. |
| Co-investment structure | DONE | Default to minimum 70% BIRE grant and 30% enterprise contribution, while allowing case-specific investment notes. |
| Other funding or leverage | DONE | Capture other grants, loans, investors, own savings, and future investment or lender leverage potential. |
| Implementation milestones | DONE | Capture key activities, expected completion dates, disbursement tranches, and verification methods. |
| Financial projections | DONE | Capture projected monthly revenue after investment, projected annual revenue after investment, projected growth rate, and key assumptions. |
| Job creation plan | DONE | Capture planned jobs by role and by women, youth, persons with disabilities, and total. |
| Quality of employment | DONE | Capture wages, contracts, working conditions, and inclusion strategy. |
| Environmental and climate impact | DONE | Capture whether the investment has climate or environmental benefit, the expected impact, and measurable indicators. |
| Broader socio-economic impact | DONE | Capture value chain or community impact and innovation element. |
| Governance and compliance | DONE | Capture registration status, sector licenses or permits, tax compliance, KRA PIN, litigation or disputes, and previous grant or programme funding. |
| Supporting document upload checklist | DONE | Capture required uploads and confirmation checkboxes for ID or passport, registration certificate, KRA PIN, trade license, bank or M-Pesa statements, financial statements or accounts, business plan or executive summary, governance documents, market contracts or LPOs where available. |
| Applicant declaration | DONE | Capture applicant declaration, name, date, signature acknowledgement, and optional co-applicant or authorised signatory. |
| Official-use-only information | DONE | Keep official review fields restricted to staff, including reference number, date received, received by, eligibility result, initial score, due diligence status, IC decision, approved grant amount, and reviewer sign-off. |

## Matching Grant Scoring Model

The Matching Grant scoring model must be configured separately for Foundation Enterprises and Accelerator Enterprises. Both tracks use the same five main categories and 100-point total, but revenue bands differ by track.

| Category | Max Points | Status | Required Parameters |
| --- | ---: | --- | --- |
| Financial Readiness & Co-Investment | 20 | DONE | Current annual revenue, revenue growth trend, co-investment commitment and source quality. |
| Market & Scalability Potential | 25 | DONE | Market assessment and demand evidence, scalability of business model, competitive differentiation and uniqueness. |
| Impact & Inclusion Potential | 30 | DONE | Projected direct decent jobs, jobs targeting women/youth/PWDs, environmental and climate resilience impact. |
| Investment Plan & Leverage Potential | 15 | DONE | Clarity and quality of use of funds, additional funding leverage potential. |
| Innovation | 10 | DONE | Exceptional innovation elements across circular or green model, process or product efficiency, market reach, technology, or other differentiated innovation. |
| Total | 100 | DONE | System must calculate the total automatically from reviewer inputs. |

## Scoring Decision Logic

| Rule | Status | Requirement |
| --- | --- | --- |
| Qualifying score | DONE | Enterprises scoring `60` and above may proceed if they also pass the revenue hard gate. |
| Below-threshold score | DONE | Enterprises scoring below `60` must not advance and should be referred for further TA support. |
| Revenue hard gate | DONE | Revenue score of `0` automatically disqualifies the enterprise regardless of total score. |
| Missing evidence | TODO | Missing evidence scores `0` for that parameter and the reviewer must document the evidence gap. |
| No rounding up | TODO | Reviewers must assign the highest band the enterprise fully meets and must not round up partial evidence. |
| Reviewer notes | DONE | Reviewer must be able to add scoring rationale and evidence notes. |
| Qualification flag | DONE | System should display `YES` only when total score is at least `60` and revenue score is greater than `0`; otherwise display `NO`. |

## GAIR Generation And Appraisal

| Feature | Status | Required Fields / Behaviour |
| --- | --- | --- |
| GAIR generation trigger | DONE | GAIR workspace is available from qualified A2F records through the appraisal route; scoring already advances qualified Matching Grant cases to IC appraisal. |
| GAIR auto-population | DONE | GAIR auto-population now pulls from the Matching Grant application, scoring data, due diligence, and application fallback data. |
| Business overview | DONE | Populate enterprise name, entrepreneur name, ownership, sector focus, total project budget, project details, location, employees, ownership structure, business description, programme support, and indicators to be tracked. |
| Case for financing | DONE | Populate amount requested, why funding is needed, use of funds, other funding or leverage, business case, financial overview, projections, and assumptions. |
| Project team | DONE | Populate owner or founder education and experience. |
| Socio-economic impact | DONE | Populate BIRE indicator-aligned impact, including jobs, inclusion, community or value chain effects, and environmental outcomes. |
| Innovation aspects | DONE | Populate how financing improves production, operational efficiency, market reach, technologies, or other innovation dimensions. |
| Strengths and weaknesses | DONE | Capture main strengths, main weaknesses, and mitigation considerations. |
| Conclusion and IC recommendation | DONE | Capture final appraisal conclusion, prepared by, recommended amount, instrument, IC recommendation, and editable conditions. |
| GAIR export | DONE | Support generating or exporting the GAIR as a formal document for Investment Committee review. |

## Investment Committee Workflow

| Feature | Status | Required Behaviour |
| --- | --- | --- |
| IC review workspace foundation | DONE | Existing A2F module has appraisal and approval foundations through investment appraisal records. |
| IC decision options | DONE | Add or confirm decisions: approved, approved with conditions, declined, deferred. |
| Approval conditions | DONE | Capture conditions or mitigation requirements before moving to contracting/procurement. |
| Approved grant amount | DONE | Capture the approved grant amount separately from the requested amount. |
| Pipeline transition | DONE | Approved enterprises advance toward contracting; declined/deferred cases record the IC decision and do not proceed to contracting/disbursement. |

## Procurement And Grant Management

| Feature | Status | Required Behaviour |
| --- | --- | --- |
| A2F pipeline foundation | DONE | Existing module already has pipeline stages for A2F, IC appraisal, contracting, disbursement, and monitoring. |
| Contracting foundation | DONE | Existing module already has grant agreement and signed contract foundations. |
| Disbursement ledger foundation | DONE | Existing module already has a disbursement/repayment ledger foundation. |
| Procurement tracking | DONE | Track procurement items, suppliers, quotes, purchase status, delivery, and verification documents. |
| Approved grant management | DONE | Track approved grant amount, enterprise contribution, BIRE contribution, tranche plan, and disbursement conditions through IC decisions, agreements, procurement items, milestones, and linked ledger records. |
| Disbursement controls | DONE | Matching Grant disbursements must link to a verified grant milestone/tranche, can optionally link to procurement items, and cannot exceed the approved agreement amount. |
| Implementation monitoring | DONE | Track milestone progress, site verification, status notes, issues, and corrective actions. |
| Documentation | DONE | Store procurement records, receipts, delivery notes, photos, verification reports, and other supporting documents through procurement and milestone evidence URLs. |
| Reporting | IN PROGRESS | Grant management workspace shows operational monitoring data; consolidated reporting for jobs, inclusion, environment, and revenue growth remains to be added. |

## Required Updates To Existing A2F Code

| Area | Status | Required Update |
| --- | --- | --- |
| Existing A2F foundations | DONE | Current code already includes foundations for pipeline, scoring, appraisal/GAIR-like documents, contracting, and disbursements. |
| Matching Grant scoring max | DONE | Replace the current Matching Grant 110-point model with the new 100-point A2F criteria. |
| Bonus points | DONE | Remove Matching Grant bonus points unless later approved by the programme team. |
| Foundation vs Accelerator variants | DONE | Add Foundation and Accelerator scoring variants under Matching Grant, including different revenue bands. |
| Threshold logic | DONE | Replace older UI and backend threshold assumptions with `>= 60` plus revenue hard gate. |
| Qualification status | DONE | Store and display qualification outcome, including `Qualified`, `Not Qualified - Score`, `Ineligible - Revenue`, and `Refer for TA Support`. |
| CAPEX validation | DONE | Add validation and reviewer flags for CAPEX-only eligible uses. |
| Co-investment validation | DONE | Calculate BIRE and enterprise percentages and flag cases below the expected 30% enterprise contribution unless justified as investment-case-specific. |
| GAIR data source | DONE | GAIR pulls from the new Matching Grant application fields, latest Matching Grant scoring record, DD report, and legacy application fallback data. |
| Repayable Grant isolation | DONE | Repayable grant UI and scoring paths removed; portal is Matching Grant only (DB enum retained for safety). |

## Acceptance Checks

| Check | Status | Acceptance Criteria |
| --- | --- | --- |
| Application coverage | TODO | Tracker and implementation cover every section of the Matching Grant Application Form. |
| Scoring coverage | TODO | Tracker and implementation cover every category, parameter, score band, and threshold from the A2F Scoring Criteria workbook. |
| GAIR coverage | DONE | Tracker and implementation cover all main GAIR sections and can populate them from captured application, scoring, DD, and pipeline data. |
| Status fields | DONE | Every tracker row in this document includes a status field. |
| Conflicting older requirements | DONE | Older 110-point Matching Grant scoring and 70-point threshold assumptions are flagged as needing replacement for Matching Grant. |
| Version-controlled tracker | DONE | This document is stored in the repo under `src/docs/innovation-fund-management-module.md`. |

## Assumptions

- This first phase systemizes the Matching Grant component only.
- The staff portal is Matching Grant only; repayable grant flows have been removed from the UI.
- No DOCX output is required for this tracker unless requested separately.
- All implementation work should update this tracker as features move from `TODO` to `IN PROGRESS` to `DONE`.
