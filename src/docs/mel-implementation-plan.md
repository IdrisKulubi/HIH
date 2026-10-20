# BIRE MEL System Implementation Plan

## 1. Purpose

This plan defines the complete, phased implementation of the BIRE Monitoring, Evaluation and Learning (MEL) system.

It converts the agreed MEL responses, the Enterprise Progress Monitoring Tool, the BIRE ITT workbook, and the existing portal architecture into five controlled delivery phases. Each phase must be implemented, tested, reviewed, and accepted before the next phase begins.

The plan deliberately avoids a single large release. Every phase produces a usable system increment, has a clear boundary, and ends with a completion gate.

## 2. Source Requirements

The implementation is based on:

- `BIRE MEAL SYSTEM (1).docx`
- `BIRE Enterprise Monitoring Tool.docx`
- `MEL system_Responses.docx`
- `BIRE ITT.xlsx`
- the current application schema and routes

The source files remain the business references. This plan is the engineering execution reference.

## 3. Delivery Status

| Phase | Workstream | Status | Start condition |
|---|---|---|---|
| 1 | Foundation and reporting periods | Accepted | Roadmap accepted |
| 2 | Quarterly enterprise monitoring | Accepted | Phase 1 accepted |
| 3 | Review, DQA, evidence and learning | Accepted | Phase 2 accepted |
| 4 | ITT, dashboards, GIS and reporting | Accepted | Phase 3 accepted |
| 5 | Configurable tools, integrations and rollout | In review | Phase 4 accepted |

Update this table at the beginning and completion of every phase. A phase may use only these statuses:

- `Not started`
- `In progress`
- `Blocked`
- `In review`
- `Accepted`

## 4. Agreed Business Rules

### 4.1 Reporting periods

- Monitoring is quarterly, with one reporting period every three months.
- Programme quarters follow the fixed sequence:
  - June to August
  - September to November
  - December to February
  - March to May
- A submission timestamp is always the real system timestamp.
- The system must not falsify timestamps by backdating a submission.
- A missed period may be completed later as a catch-up submission. It must remain linked to the missed reporting period and be visibly marked as late/catch-up.

### 4.2 Approval sequence

The default workflow is:

`Draft -> Submitted -> REDO review -> MEL review -> Approved and locked`

At either review stage, the report can be returned to the data collector with a mandatory reason.

To prevent self-approval:

- an EDO submission goes to the assigned REDO and then MEL;
- when a REDO is the original data collector, the REDO review stage is skipped and the report goes directly to MEL;
- an administrator may reassign a review, but the reassignment must be audited.

### 4.3 Mandatory fields

- All visible and applicable fields are mandatory.
- A conditional follow-up field is mandatory only when its triggering answer makes it applicable.
- Auto-populated fields are required but read-only.
- Return and override actions require a reason.
- “Not applicable” must be a controlled response where the indicator genuinely allows it; it must not be represented by an empty field.

### 4.4 Jobs

- Only jobs created after the programme baseline are counted.
- Each report captures new jobs created in the quarter.
- The system also calculates cumulative new jobs since baseline.
- Direct and indirect jobs are stored separately.
- Job-holder disaggregation captures:
  - male;
  - female;
  - youth;
  - persons living with disabilities (PLWD);
  - refugees, if confirmed as a required reporting category.
- Male plus female must equal the applicable total under the current binary reporting rule.
- Youth, PLWD, and refugee counts are overlapping subsets and must each be less than or equal to the total.
- Individual employee records are not required. Aggregated counts are sufficient.
- Job-creator disaggregation comes from the enterprise owner/applicant profile and is reported separately from job-holder disaggregation.

### 4.5 Previously achieved deliverables

- “Already done/submitted” means that the result was achieved and approved evidence already exists.
- Once a one-time deliverable is approved, future quarterly forms do not ask the same question again.
- The form shows a read-only “achieved previously” record with the approval period and evidence.
- MEL or an administrator can reopen the item with an audited reason.
- Recurring indicators must never disappear merely because they were reported in an earlier quarter.

### 4.6 Enterprise identifier

- Existing enterprise/business IDs remain authoritative.
- No new identifier migration is required.
- A formatted display code may be added later, but it must resolve to the immutable existing business ID.

### 4.7 Calculations

- Quarterly profit/loss:
  - `total revenue - total costs`
- Monthly-equivalent enterprise profit:
  - `quarterly profit / 3`
- Cohort trend:
  - median of enterprise monthly-equivalent profit values for the selected cohort and period
- Count and currency indicators:
  - sum approved values
- Percentage indicators:
  - calculate from an approved numerator and denominator; do not sum percentages
- Percentage achievement:
  - `actual / target * 100`
- Profitability-growth achievement:
  - first calculate growth against the baseline, then compare that growth percentage with the ITT growth target
- Default traffic-light thresholds:
  - Red: less than 50% achievement
  - Amber: 50% to less than 80%
  - Green: 80% or more
- Traffic-light thresholds must be stored as configuration, not hard-coded into UI components.

The exact definition of “financially resilient enterprise” and any indicator-specific exceptions must be confirmed in Phase 1 before those indicators are activated.

## 5. Current System Capabilities We Will Reuse

The portal already contains:

- enterprise and applicant profiles;
- KYC baseline revenue and employee count;
- GPS coordinates;
- application track, county, sector, and enterprise identifiers;
- EDO/REDO/MEL/admin roles;
- CNA and CDP records;
- mentorship and Access-to-Finance workflows;
- document upload infrastructure;
- an enterprise progress dashboard;
- Excel export support;
- a small `business_performance_metrics` table.

The MEL module will extend these capabilities. It must not duplicate enterprise, KYC, CNA, CDP, mentorship, or A2F records.

## 6. Data Source Strategy

### 6.1 System-derived indicators

These should be calculated from existing platform records wherever possible:

- enterprises mobilized;
- Capacity Needs Assessments completed;
- Capacity Development Plans implemented;
- programme track, sector, county, and enterprise-owner demographics;
- training completion when a reliable platform or Kajabi record exists.

### 6.2 Quarterly enterprise monitoring

The quarterly instrument supplies:

- revenue, costs, and profit/loss;
- direct and indirect jobs;
- improved business plans;
- new products;
- technology and innovation adoption;
- financial plans and financial linkages;
- value of finance accessed;
- market research and new market segments;
- partnerships;
- ESG reports;
- life-cycle assessments;
- eco-certification;
- social safeguards;
- enterprise challenges and support needs;
- evidence attached to the above results.

The ITT also requires fields not present in the first monitoring questionnaire. The Phase 2 specification must add:

- active insurance policy;
- investor-readiness training status when it cannot be derived automatically;
- access to market-intelligence information;
- circular-economy-attributed cost savings or revenue growth;
- volume of waste collected/recycled by waste stream.

### 6.3 Programme-level MEL entry

The following indicators are not enterprise quarterly questions. They require a separate MEL programme-results screen:

- policy briefs developed;
- advocacy forums convened;
- policy research and stakeholder-engagement forums;
- public-private partnerships facilitated;
- policies or frameworks adopted and implemented;
- sector institutions reporting an efficient policy environment.

### 6.4 Derived indicators

The system derives:

- quarterly and cumulative jobs;
- profitability and profitability growth;
- indicator actuals;
- percentage achievement;
- traffic-light status;
- evidence completeness;
- submission timeliness;
- cohort trends and disaggregation.

## 7. Five-Phase Delivery Roadmap

### Phase 1: MEL foundation and reporting-period control

Establish the domain model, reporting calendar, indicator catalogue, permissions, audit foundations, and migration path.

Detailed plan: [Phase 1](./mel-phases/phase-1-foundation-and-reporting-periods.md)

### Phase 2: Quarterly enterprise monitoring

Build the EDO/REDO data-collection workspace, KYC auto-population, financial and jobs sections, conditional questions, skip logic, evidence upload, drafts, and catch-up reports.

Detailed plan: [Phase 2](./mel-phases/phase-2-quarterly-enterprise-monitoring.md)

### Phase 3: Review, DQA, evidence and learning

Implement REDO and MEL review queues, return/correction cycles, data-quality checks, locked approvals, the evidence repository, and learning/adaptation actions.

Detailed plan: [Phase 3](./mel-phases/phase-3-review-dqa-evidence-and-learning.md)

### Phase 4: ITT engine, dashboards, GIS and reporting

Turn approved operational data into ITT actuals, targets, achievement, traffic lights, trends, maps, exports, and donor-ready reporting views.

Detailed plan: [Phase 4](./mel-phases/phase-4-itt-dashboards-gis-and-reporting.md)

### Phase 5: Configurable tools, integrations and production readiness

Add configurable baseline/midline/endline instruments, mobile-data integration, security and backup controls, performance hardening, historical migration, operational documentation, and final rollout.

Detailed plan: [Phase 5](./mel-phases/phase-5-configurable-tools-integrations-and-rollout.md)

## 8. Delivery Controls

### 8.1 Phase boundary rule

Work from a later phase must not be pulled into the active phase unless:

- it is a direct technical dependency;
- the exception is documented;
- it does not weaken the active phase acceptance gate.

### 8.2 Database change rule

Every schema change must include:

- a Drizzle schema update;
- a generated SQL migration;
- indexes and uniqueness constraints;
- migration notes;
- rollback or forward-fix guidance;
- a production-data compatibility check.

Direct `db:push` must not be the production rollout method.

### 8.3 Security rule

Every server action and route must enforce authorization server-side. Hiding a button is not authorization.

### 8.4 Audit rule

The following events must be auditable:

- draft creation;
- submission;
- late/catch-up reporting;
- return to collector;
- resubmission;
- approval;
- unlock/reopen;
- target or indicator configuration change;
- evidence replacement/removal;
- reviewer reassignment;
- export of restricted data.

### 8.5 Test rule

Each phase requires:

- unit tests for calculations and validation;
- server-action or integration tests for workflows;
- authorization tests;
- migration verification;
- browser-level smoke tests of the critical path;
- regression checks for existing KYC, CNA, CDP, mentorship, A2F, and enterprise-progress features.

### 8.6 Definition of done

A phase is complete only when:

- all acceptance criteria in its phase document pass;
- migrations are tested;
- authorization is verified;
- no critical or high-severity defects remain;
- user-facing empty, loading, error, and returned states are handled;
- exports and calculations reconcile with test fixtures where applicable;
- documentation is updated;
- the product owner accepts the phase.

## 9. Cross-Phase Work Register

The following concerns must be tracked throughout all five phases:

- accessibility and keyboard navigation;
- mobile/responsive use by field staff;
- low-bandwidth behaviour and draft recovery;
- consistent dates, currency, percentages, and time zones;
- evidence retention and access control;
- data minimization and sensitive demographic data;
- performance for programme-wide dashboards;
- observability and actionable error logging;
- idempotent submission and webhook handling;
- backward compatibility with current enterprise records.

## 10. Known ITT Items Requiring Phase 1 Confirmation

Before activating final calculations, MEL must confirm:

- the exact programme start year and first production reporting period;
- the definition and numerator/denominator for “financially resilient enterprise”;
- the baseline and target for completed product life-cycle assessments;
- whether refugee status is a required enterprise-owner and job-holder category;
- whether strategic partnerships and new market segments are counts or percentages of enterprises;
- the corrected annual total for advocacy forums where the target and year distribution differ;
- the source and frequency of the “efficient policy environment” measure;
- final traffic-light thresholds if the defaults above are not accepted.

These decisions are configuration tasks in Phase 1. They do not require redesigning later phases.

## 11. Overall Completion Criteria

The MEL feature is complete when:

- fixed programme quarters can be administered safely;
- all eligible enterprises can be monitored quarterly;
- EDO/REDO and MEL approval works with returns and audit history;
- one-time and recurring indicators behave correctly;
- approved evidence is retained and searchable;
- ITT targets and actuals reconcile with source data;
- dashboards support the agreed disaggregation;
- GIS views use verified enterprise coordinates;
- baseline, monitoring, midline, and endline tools are configurable;
- exports and integrations are reliable;
- security, backups, recovery, performance, and operational handover are complete.

Implementation begins with Phase 1 only after this roadmap is accepted.
