# MEL Phase 2: Quarterly Enterprise Monitoring

## 1. Objective

Deliver the field-data collection workflow for quarterly enterprise monitoring.

At the end of Phase 2, an authorized EDO or REDO can create, save, validate, and submit a monitoring report for an enterprise and reporting period.

## 2. Dependencies

Phase 2 depends on:

- active reporting periods from Phase 1;
- stable indicator definitions;
- confirmed role rules;
- existing KYC and enterprise profile data;
- existing UploadThing infrastructure.

## 3. In Scope

- enterprise selection and assignment checks;
- one report per enterprise and reporting period;
- draft autosave/manual save;
- fixed-period and catch-up submission handling;
- KYC/profile auto-population;
- all enterprise monitoring sections;
- conditional mandatory fields;
- profit/loss calculation;
- quarterly and cumulative jobs;
- job-holder and job-creator disaggregation;
- evidence uploads;
- one-time deliverable skip logic;
- form validation and submission;
- collector report history;
- mobile-responsive and low-bandwidth-safe behaviour.

## 4. Out of Scope

- REDO/MEL decision queues;
- final report approval;
- programme-wide DQA dashboard;
- ITT actual calculations;
- analytics charts and GIS;
- generic survey-builder capability.

Submitted reports remain pending until Phase 3 provides the full review workflow.

## 5. Submission Data Model

### 5.1 Monitoring submission

Store:

- enterprise/business ID;
- reporting-period ID;
- collector ID and role;
- assigned REDO where applicable;
- source mode: current period or catch-up;
- catch-up-for period ID when applicable;
- visit date;
- status;
- submission version;
- submitted and updated timestamps;
- return/resubmission counters;
- profile snapshot used at collection time.

Use a uniqueness rule that prevents two active submissions for the same enterprise, period, and instrument.

### 5.2 Submission sections

Use typed columns/tables for core reportable fields rather than a single opaque JSON document.

Core domains:

- enterprise capacity;
- financial performance;
- direct jobs;
- indirect jobs;
- markets and innovation;
- financial linkages;
- green growth and sustainability;
- partnerships and policy engagement;
- feedback, accountability, and support needs.

Limited JSON may be used for versioned instrument metadata, but dashboard-critical values must remain queryable.

### 5.3 Evidence

Evidence records include:

- submission;
- indicator/question;
- file key and URL;
- file name, type, and size;
- uploader;
- upload timestamp;
- replacement relationship;
- active/removed status.

The database must retain enough metadata to audit replacement without exposing inaccessible or expired links.

### 5.4 Achieved deliverables

Add a durable achievement record for one-time deliverables:

- enterprise;
- deliverable/indicator;
- first achieved submission;
- approval status;
- evidence link;
- approved period;
- reopened state and reason.

Only an approved record can trigger skip logic in future periods.

## 6. Form Sections

### Section 0: Data collector

- collector is taken from the authenticated user;
- role is read-only;
- REDO assignment is shown;
- visit date is required;
- reporting period is selected from allowed periods.

### Section A: Enterprise and demographic information

Auto-populate:

- enterprise ID;
- enterprise name;
- sector;
- programme track;
- county;
- enterprise-owner gender;
- enterprise-owner age/youth category;
- disability/refugee status where confirmed and available;
- contact designation.

Snapshot the displayed values so historical reports remain stable if a profile later changes.

### Section B: Enterprise capacity

- business plan reviewed/improved;
- already achieved status from approved history;
- improved business-plan evidence.

### Section C: Profitability

- total revenue for the period;
- total costs for the period;
- system-calculated profit/loss;
- optional mandatory explanation for material negative or unusual changes, based on configured DQA rules.

Currency is KES and stored as numeric values.

### Section D: Jobs

Capture direct and indirect jobs separately:

- quarterly total;
- male;
- female;
- youth;
- PLWD;
- refugee, if confirmed;
- supporting evidence.

Show cumulative totals as calculated, read-only values. Do not let collectors type cumulative totals independently.

### Section E: Market access and innovation

- market-research survey;
- evidence;
- market-intelligence access;
- new market segments;
- technology/innovation adoption and details;
- new products/services and details.

### Section F: Financial linkages

- linked to a financial-service provider;
- type of finance;
- value accessed in KES;
- financial plan;
- active insurance policy;
- investor-readiness training when not system-derived;
- required supporting evidence.

### Section G: Green growth and sustainability

- product life-cycle assessment;
- eco-certification/compliance;
- ESG sustainability report;
- social safeguarding guideline;
- circular-economy-attributed cost savings/revenue growth;
- waste collected/recycled by configured stream and unit;
- required evidence.

Waste streams initially include:

- organic;
- plastic;
- paper;
- glass;
- e-waste;
- other.

### Section H: Partnerships and policy engagement

- strategic partnerships;
- partner details;
- project-facilitated advocacy/stakeholder forum participation;
- project-facilitated public-private partnership;
- evidence.

### Section I: Feedback and support needs

- main challenges;
- negative direct/indirect programme impacts;
- additional support needed;
- EDO/REDO overall comment.

## 7. Validation Rules

- all applicable fields are required;
- revenue, cost, finance, job, and waste values cannot be negative;
- profit/loss is server-calculated;
- male plus female equals total;
- youth/PLWD/refugee are each less than or equal to total;
- evidence is required when a result requires proof;
- details are required when “Yes” or “Other” is selected;
- a one-time achieved item cannot be resubmitted unless reopened;
- catch-up submissions retain their original reporting-period link;
- duplicate submission attempts are idempotently rejected;
- the server repeats all client-side validation.

## 8. Draft and Submission Behaviour

- drafts can be saved section by section;
- draft state survives navigation and a lost connection;
- submission runs a complete server-side validation;
- after submission, the collector cannot edit until the report is returned;
- submission records the actual timestamp;
- a late/catch-up badge is always visible;
- resubmission creates audit history without discarding earlier values.

## 9. Routes and Components

Suggested route areas:

- `/mel/monitoring`
- `/mel/monitoring/[businessId]`
- `/mel/monitoring/[businessId]/[periodId]`

Suggested implementation areas:

- `src/lib/actions/mel-monitoring.ts`
- `src/lib/mel/validation.ts`
- `src/lib/mel/calculations.ts`
- `src/components/mel/monitoring/*`

Reuse shared upload, form, currency, date, and role utilities.

## 10. Testing

### Calculation tests

- positive profit;
- loss;
- zero revenue/cost;
- quarterly-to-monthly conversion;
- quarterly and cumulative jobs.

### Validation tests

- disaggregation boundaries;
- conditional mandatory fields;
- evidence requirements;
- duplicate report protection;
- one-time skip logic;
- catch-up period handling.

### Authorization tests

- assigned EDO/REDO access;
- cross-enterprise access denial;
- applicant/admin/MEL behaviour;
- direct server-action invocation by an unauthorized user.

### Browser smoke tests

- create and resume draft;
- upload and replace evidence;
- complete all sections;
- submit a normal report;
- submit a catch-up report;
- confirm future form hides an approved one-time item using a test fixture.

## 11. Deliverables

- Phase 2 schema migration;
- quarterly monitoring server actions;
- complete responsive form;
- evidence upload integration;
- draft/history screens;
- validation and calculation test suite;
- collector guidance.

## 12. Acceptance Criteria

Phase 2 is accepted when:

- an authorized collector can submit a complete report;
- all agreed questionnaire and ITT-required enterprise fields are captured;
- KYC values auto-populate and are snapshotted;
- job and profit calculations are correct;
- mandatory and conditional validation works on client and server;
- catch-up reports do not falsify timestamps;
- duplicate or unauthorized submissions are blocked;
- evidence and skip-logic records are structurally ready for approval in Phase 3.

## 13. Phase Gate

Do not start Phase 3 until representative Foundation and Accelerator reports have been submitted successfully with:

- profit and loss examples;
- direct and indirect job examples;
- overlapping youth/PLWD subsets;
- one-time deliverables;
- evidence;
- a catch-up submission.
