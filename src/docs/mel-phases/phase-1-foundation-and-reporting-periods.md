# MEL Phase 1: Foundation and Reporting Periods

## Implementation Status

**Status:** In review

Implemented on 31 July 2026:

- modular MEL schema for programme settings, reporting periods, indicator definitions, baselines, targets, and audit events;
- forward database migration `0033_mel_phase1_foundation.sql`;
- structured, idempotent seed covering all reviewed ITT result areas;
- server-side MEL viewer and manager authorization;
- validated and audited reporting-period, settings, indicator, baseline, and target actions;
- MEL administration overview and indicator-detail workspaces;
- focused Phase 1 validation and authorization tests.

The migration and seed are generated but must be applied to the intended database environment by an authorized operator. Phase 1 remains **In review** until the reporting calendar and unresolved ITT definitions are accepted.

## 1. Objective

Create the technical foundation for the MEL domain without yet building the full quarterly questionnaire.

At the end of Phase 1, authorized staff can configure programme reporting periods and maintain an auditable indicator catalogue. The database and permission model are ready for enterprise monitoring in Phase 2.

## 2. In Scope

- final data dictionary and indicator-source mapping;
- fixed programme-quarter model;
- reporting-period administration;
- MEL indicator catalogue;
- ITT baseline, target, annual target, unit, aggregation, and disaggregation metadata;
- role and permission rules;
- audit-event foundation;
- enterprise-owner demographic gap assessment;
- schema migration from the current minimal metrics model;
- navigation placeholders for later MEL workspaces;
- test fixtures for representative enterprises and indicators.

## 3. Out of Scope

- completing quarterly monitoring forms;
- uploading monitoring evidence;
- REDO/MEL approval queues;
- dashboard charts or GIS maps;
- configurable baseline/midline/endline forms;
- external mobile-data integrations.

## 4. Required Decisions

MEL must confirm or approve configured defaults for:

- first programme period and programme year;
- traffic-light thresholds;
- financially resilient enterprise definition;
- product life-cycle assessment baseline and target;
- refugee disaggregation requirement;
- count-versus-percentage definitions for strategic partnerships and market segments;
- advocacy-forum annual total;
- policy-environment data source.

Record decisions in a versioned configuration seed or migration, not only in meeting notes.

## 5. Proposed Data Model

### 5.1 Reporting periods

Add a reporting-period table with:

- ID;
- stable code such as `2026-JUN-AUG`;
- programme year;
- sequence number;
- start date;
- end date;
- collection open date;
- collection close date;
- status: `planned`, `open`, `closed`, `archived`;
- whether catch-up submissions are allowed;
- created/updated metadata.

Constraints:

- period codes are unique;
- date ranges cannot overlap within the same programme;
- an archived period cannot be reopened without an audited administrative action.

### 5.2 Indicator catalogue

Add indicator-definition records with:

- stable indicator code;
- result level: impact, long-term outcome, output, operational;
- result statement;
- indicator name;
- definition;
- unit: count, KES, percentage, kilograms, status, score;
- source type: system, quarterly enterprise form, programme MEL entry, integration, derived;
- frequency;
- aggregation: sum, median, count, distinct count, ratio, latest value;
- numerator/denominator definition where applicable;
- baseline and baseline period;
- overall target;
- disaggregation dimensions;
- evidence requirement;
- one-time or recurring behaviour;
- active/version fields.

### 5.3 Target distribution

Store targets separately from definitions:

- indicator ID;
- programme year;
- optional reporting period;
- overall/foundation/accelerator segment;
- optional county/sector segment;
- numeric target;
- target notes;
- effective dates;
- approved-by metadata.

### 5.4 Audit events

Create or extend an audit-event mechanism with:

- actor;
- role;
- entity type and ID;
- action;
- before/after metadata where safe;
- reason;
- timestamp;
- request/correlation identifier.

Do not store uploaded file contents or unnecessary sensitive personal data in audit payloads.

### 5.5 Enterprise inclusion profile

Review the current applicant/business profile for:

- gender;
- date of birth/youth calculation;
- disability status;
- refugee status.

Do not silently infer disability or refugee status. Add explicit, access-controlled fields only where the business requirement is confirmed.

## 6. Existing Schema Compatibility

The current `business_performance_metrics` table contains only a small set of fields. Phase 1 must decide whether to:

- preserve it temporarily as a legacy read model and migrate later; or
- replace it with the new submission/indicator-value model through a controlled migration.

Preferred approach:

- introduce the new MEL tables;
- keep the old table readable during Phases 1 and 2;
- migrate or retire it only after reconciliation in Phase 4.

## 7. Server-Side Work

Implement server actions/services for:

- listing reporting periods;
- creating/updating periods;
- opening/closing a period;
- listing and versioning indicators;
- saving targets;
- reading the active ITT configuration;
- permission checks;
- writing audit events.

All mutations require Zod validation and server-side role checks.

## 8. User Interface

Add an MEL administration area with:

- reporting-period list;
- create/edit period form;
- active/closed state;
- indicator catalogue list;
- indicator detail and target-distribution view;
- incomplete-definition warnings;
- read-only ITT source reference.

Avoid building the final dashboard in this phase.

## 9. Seed and Migration Work

- Create the Phase 1 database migration.
- Seed the reviewed indicators from all five ITT sheets.
- Preserve the ITT hierarchy: impact, LT1-LT4, Output 1-Output 4.
- Store baseline segment values separately rather than embedding `O/F/A` in text.
- Store numeric values as numeric types.
- Preserve source notes and unresolved definitions.
- Add uniqueness and lookup indexes.
- Test migration against a production-like data snapshot.

## 10. Testing

### Unit tests

- reporting-period code generation;
- overlap prevention;
- programme-quarter sequence;
- traffic-light configuration validation;
- indicator unit and aggregation validation.

### Authorization tests

- MEL/admin can manage periods and indicators;
- EDO/REDO can read active periods and indicators;
- unauthorized roles cannot mutate configuration.

### Migration tests

- existing schema migrates without losing enterprise data;
- ITT seed values reconcile with the source workbook;
- rollback/forward-fix instructions are valid.

### UI smoke tests

- create a future period;
- open and close a period;
- view the complete indicator catalogue;
- reject invalid or overlapping dates.

## 11. Deliverables

- schema and SQL migration;
- reporting-period management;
- indicator catalogue and ITT seed;
- permission helpers;
- audit-event foundation;
- test fixtures and automated tests;
- updated developer and administrator documentation.

## 12. Acceptance Criteria

Phase 1 is accepted when:

- all programme quarters can be represented without overlapping dates;
- the complete ITT is stored as structured, queryable configuration;
- all unresolved indicator definitions are visibly flagged;
- role checks are enforced server-side;
- configuration changes create audit events;
- the current portal continues to build and existing workflows regress successfully;
- Phase 2 can reference stable period and indicator IDs.

## 13. Phase Gate

Do not start Phase 2 until:

- the product owner accepts the reporting calendar;
- MEL accepts the seeded ITT structure;
- the required-decision list is resolved or assigned an explicit temporary status;
- the Phase 1 migration and authorization tests pass.
