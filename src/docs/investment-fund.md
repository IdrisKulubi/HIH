# Implementation Guide: Access to Finance (A2F) & Investment Management Module

This document details the technical implementation requirements, database schema design, and frontend/backend workflows for the new **A2F & Investment Management Module** within the BIRE Portal. The guide is intended for a stack composed of **Next.js**, **Drizzle ORM**, and **Neon (PostgreSQL)**.

---

## 1. System Architecture & Module Flow

This module is triggered after an applicant passes the initial Committee Selection.

**State Machine / Pipeline Stages:**

```
A2F_PIPELINE → DUE_DILIGENCE_INITIAL → PRE_IC_SCORING → IC_APPRAISAL_REVIEW → OFFER_ISSUED → CONTRACTING → DISBURSEMENT_ACTIVE → POST_TA_MONITORING
```

---

## 2. Database Schema Design (Drizzle ORM)

To support this module, extend the Drizzle schema with these relational entities:

### 2.1 `a2f_pipeline` Table

- `id`: `UUID` (Primary Key)
- `application_id`: `UUID` (Foreign Key to base applications)
- `instrument_type`: `Enum` (`MATCHING_GRANT`, `REPAYABLE_GRANT`)
- `requested_amount`: `Decimal`
- `status`: `Enum` (Pipeline stages, as above)
- `a2f_officer_id`: `UUID` (Foreign Key to Admin users)

### 2.2 `due_diligence_reports` Table

Stores the 11-category Due Diligence data.

- `id`: `UUID` (PK)
- `a2f_id`: `UUID` (FK to a2f_pipeline)
- `stage`: `Enum` (`INITIAL`, `PRE_IC`, `POST_TA`)
- `company_overview`: `JSONB` (History, Business Model, Mission/Vision)
- `financial_dd`: `JSONB` (Revenue, Debt, Banking, Projections)
- `hr_and_risk`: `JSONB` (Org structure, Insurance, Crisis mgmt)
- `impact_esg`: `JSONB` (Climate angle, Socio-economic impacts)
- `exit_strategy`: `Text`

### 2.3 `a2f_scoring` Table

- `id`: `UUID` (PK)
- `a2f_id`: `UUID` (FK)
- `scorer_id`: `UUID` (FK)
- `instrument_type`: `Enum`
- `scores`: `JSONB` (Breakdown by criteria)
- `total_score`: `Integer`
- `bonus_points`: `Integer` (Max 10)

### 2.4 `investment_appraisals` Table (GAIR & Memos)

- `id`: `UUID` (PK)
- `a2f_id`: `UUID` (FK)
- `document_type`: `Enum` (`GAIR`, `INVESTMENT_MEMO`)
- `content`: `JSONB` (Fields: Risks/Mitigations, Source/Uses of funds, Strengths/Weaknesses)
- `ic_approval_status`: `Boolean`
- `approved_by`: `UUID[]` (Array of IC member IDs)

### 2.5 `grant_agreements` Table

- `id`: `UUID` (PK)
- `a2f_id`: `UUID` (FK)
- `agreement_type`: `Enum` (`MATCHING`, `REPAYABLE`, `WORKING_CAPITAL`)
- `total_project_amount`: `Decimal`
- `hih_contribution`: `Decimal`
- `enterprise_contribution`: `Decimal` (For Matching)
- `term_months`: `Integer` (Default 24 for Repayable)
- `interest_rate`: `Decimal` (Default 6.0 for Repayable)
- `grace_period_months`: `Integer` (Default 3 for Repayable)
- `signed_document_url`: `String` (UploadThing URL)

### 2.6 `disbursements_and_repayments` Table

- `id`: `UUID` (PK)
- `agreement_id`: `UUID` (FK)
- `transaction_type`: `Enum` (`DISBURSEMENT`, `REPAYMENT`)
- `amount`: `Decimal`
- `transaction_date`: `Timestamp`
- `proof_document_url`: `String` (UploadThing URL — Receipts/Bank slips)
- `status`: `Enum` (`PENDING`, `VERIFIED`, `REJECTED`)

---

## 3. Frontend Implementation (Next.js UI)

### 3.1 A2F Officer Dashboard

- **Kanban Board/Data Table:** View all enterprises in pipeline.
- **Filters:** Filter by `instrument_type`, `county`, `status`, and `assigned_officer`.

### 3.2 Digital Due Diligence (DD) Workspace

- **Multi-step form wizard** mapping to DD Template, with steps:
  1. Company Overview & Operations
  2. Financial DD (Income, Balance Sheet, Cash Flow inputs)
  3. HR, Legal & Risk Management
  4. Impact (ESG, Climate, Jobs) & Exit Strategy
- **Document Side-Panel:** Split-screen to view UploadThing docs while filling DD form.

### 3.3 Dynamic Scoring Engine

Two React components rendered conditionally based on `instrument_type`:

#### Component A: *Repayable Grant Scoring* (Max 110 pts)

- Repayment Capacity (35 pts) — includes Debt Service Coverage > 1.2x
- Market & Scalability Strength (25 pts)
- Impact & Inclusion Potential (30 pts)
- Investment Plan & Safeguards (10 pts)
- **Bonus (+10 pts)**

#### Component B: *Matching Grant Scoring* (Max 110 pts)

- Financial Readiness & Co-Investment (30 pts) — checks % own contribution
- Market & Scalability Potential (25 pts)
- Impact & Inclusion Potential (30 pts)
- Investment Plan & Leverage Potential (15 pts)
- **Bonus (+10 pts)**

### 3.4 Document Generation Workspace (GAIR & Memos)

- **Auto-population:** Fetches from `due_diligence_reports` and base application to pre-fill GAIR/Memo forms.
- **Rich Text Editors:** For "Brief Comments/Narrative", "Assessment of the team", "Key risks and issues".
- **Export Action:** Server Action compiles JSONB data and uses `pdf-lib` or `@react-pdf/renderer` to generate PDF for Investment Committee.

### 3.5 Contracting & E-Signature Portal

- **Applicant View:** New "Offers & Contracts" tab in dashboard.
- **Workflow:**
  1. Admin generates "Matching Grant Offer Letter."
  2. Resend triggers an email to the applicant.
  3. Applicant downloads, signs, and re-uploads PDF via UploadThing.
  4. On verification, final Grant Agreement(s) and Disbursement Agreement unlocked for signature.

### 3.6 Financial Tracking Dashboard

- For Repayable Grants:
  - Dynamic ledger shows 24-month amortization schedule, including 3-month grace, 6% interest.
  - Highlights missed payments (due by the 15th).
- For Working Capital:
  - "Accountability Portal" where enterprises upload expenditure receipts for verification.

---

## 4. Backend Server Actions & API Routes

- **`action_submitDDReport`**
  - Validates the 11-category JSON payload.
  - Updates `due_diligence_reports` table.
  - Transitions pipeline status to `PRE_IC_SCORING`.

- **`action_calculateA2FScore`**
  - Accepts scoring payload, computes total, saves to `a2f_scoring`.
  - Validates category weights (e.g., Repayment Capacity max 35).

- **`action_generateContract`**
  - Fetches template.
  - Injects dynamic variables (Enterprise Name, Total Amount, HiH Contribution, Grace Period).
  - Returns secure URL to generated document.

- **`action_logDisbursement`**
  - Inserts into `disbursements_and_repayments`.
  - Triggers email to enterprise confirming fund release, with attached working capital guidelines.



Ready to proceed? We can tackle this in phases:
Phase 1 — Extend the Drizzle schema with the 6 new tables + add a2f_officer role
Phase 2 — Build server actions (action_submitDDReport, action_calculateA2FScore, etc.)
Phase 3 — Build the A2F Officer dashboard and DD Workspace UI
Phase 4 — Scoring Engine components
Phase 5 — Contracting portal + Financial tracking dashboard
---