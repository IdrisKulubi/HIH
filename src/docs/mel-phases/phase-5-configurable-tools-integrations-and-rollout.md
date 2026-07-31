# MEL Phase 5: Configurable Tools, Integrations and Rollout

## 1. Objective

Complete the broader MEL platform with configurable instruments, integrations, historical-data handling, security and operational hardening, and production rollout.

At the end of Phase 5, the complete MEL feature is production-ready and operationally handed over.

## 2. Dependencies

- accepted Phases 1-4;
- reconciled ITT calculations;
- stable data-collection and review workflows;
- production infrastructure and ownership decisions.

## 3. In Scope

- configurable baseline, monitoring, midline, and endline instruments;
- reusable question and section definitions;
- versioned form publishing;
- conditional logic;
- mobile-data import/API integration;
- secure import mapping and validation;
- historical data migration;
- metadata/privacy hardening;
- backup and restore verification;
- performance/load testing;
- observability and operational alerts;
- accessibility and responsive hardening;
- user training and runbooks;
- staged rollout and post-launch support;
- final retirement of legacy MEL structures where safe.

## 4. Out of Scope

- unrelated redesigns of KYC, CNA, CDP, mentorship, or A2F;
- speculative AI reporting features without a separately approved scope;
- public exposure of enterprise-level sensitive data.

## 5. Configurable Instrument Model

Support:

- instrument type: baseline, quarterly monitoring, midline, endline, special study;
- version;
- status: draft, published, retired;
- effective periods;
- sections;
- questions;
- response type;
- required/applicable rules;
- conditional visibility;
- validation;
- indicator mapping;
- evidence requirement;
- help text;
- ordering.

Published instruments are immutable. Changes create a new version.

Core Phase 2 monitoring fields may remain typed for reporting integrity. The configurable layer must not weaken type safety or replace critical columns with opaque JSON.

## 6. Instrument Administration

MEL/admin users can:

- create a draft instrument;
- add/reorder sections and questions;
- preview conditional logic;
- map questions to indicators;
- test validation;
- publish a version;
- retire a version;
- view which submissions use each version.

Publishing requires validation that:

- every required question has a response type;
- conditional rules reference valid questions/options;
- mapped indicators use compatible units;
- evidence rules are complete;
- no circular visibility logic exists.

## 7. Mobile Data and Import Integration

Support an integration boundary for tools such as KoboToolbox, ODK, or an approved equivalent.

Capabilities:

- authenticated webhook/API or controlled file import;
- external form/submission identifier;
- enterprise-ID mapping;
- reporting-period mapping;
- field mapping by instrument version;
- attachment import metadata;
- validation and quarantine queue;
- idempotency and duplicate protection;
- retry and failure visibility;
- imported-source audit trail.

Imported records must pass the same business validation and review workflow as portal-entered records.

Do not silently approve imported data.

## 8. Historical Data Migration

Plan and execute migration for:

- existing `business_performance_metrics`;
- historical monitoring spreadsheets if provided;
- prior evidence indexes where files remain available;
- baseline values required by trend calculations.

Migration process:

1. inventory sources;
2. define mapping;
3. clean identifiers and periods;
4. validate totals;
5. dry run;
6. reconcile;
7. production import;
8. sign-off;
9. archive source and mapping logs.

Migrated records must be labelled with source, import batch, and confidence/review status.

## 9. Security and Privacy Hardening

- review role matrix and least privilege;
- server-side authorization audit;
- signed/expiring evidence access;
- sensitive demographic-field access;
- CSRF/session protections inherited from the platform;
- file-size/type controls;
- rate limits for imports and exports;
- audit-log retention;
- data-retention and deletion policy;
- secrets management;
- dependency and vulnerability review;
- restricted production database access.

Conduct a targeted threat review for:

- horizontal enterprise-data access;
- reviewer privilege escalation;
- evidence URL leakage;
- malicious uploads;
- duplicate webhooks/imports;
- spreadsheet-formula injection in exports;
- unauthorized geographic exports.

## 10. Backup and Recovery

Define and verify:

- database backup frequency and retention;
- evidence-provider retention/recovery capability;
- recovery-point objective;
- recovery-time objective;
- restore owner;
- restore test schedule;
- incident communication.

A backup is not considered verified until a restore test succeeds in a non-production environment.

## 11. Observability

Add actionable monitoring for:

- failed submissions;
- workflow-transition errors;
- upload failures;
- stuck review queues;
- missed reporting deadlines;
- calculation/reconciliation failures;
- import/webhook errors;
- export failures;
- slow dashboard queries;
- authorization-denied spikes.

Logs must include correlation identifiers without leaking sensitive answers or file contents.

## 12. Performance and Reliability

- load-test report saving and submission;
- test concurrent reviewers;
- test programme dashboard and exports at expected scale;
- use background work for large imports/exports/recalculations;
- implement idempotency;
- verify transaction boundaries;
- test network interruption and retry behaviour;
- validate mobile/low-bandwidth usability.

## 13. Accessibility and UX Completion

- keyboard-complete forms and review screens;
- clear error summary and field focus;
- accessible status and traffic-light labels that do not rely on color alone;
- usable evidence controls;
- responsive tables/cards;
- readable charts and alternatives;
- session-timeout/draft-recovery messaging;
- clear offline/error recovery.

## 14. Rollout Plan

### Stage 1: Internal test

- seed test data;
- MEL/admin walkthrough;
- security and reconciliation checks;
- resolve critical/high defects.

### Stage 2: Pilot

- selected counties/enterprises;
- one live reporting period or controlled pilot window;
- daily issue review;
- validate support and training materials.

### Stage 3: Programme rollout

- enable all authorized users;
- monitor submissions and review queues;
- maintain rollback/feature-flag readiness;
- publish support contacts and escalation path.

### Stage 4: Stabilization

- two-week enhanced monitoring window;
- defect triage;
- performance tuning;
- adoption and completion review;
- formal operational handover.

## 15. Training and Documentation

Provide:

- EDO collector guide;
- REDO reviewer guide;
- MEL approval/DQA guide;
- indicator and calculation dictionary;
- administrator configuration guide;
- evidence and privacy guide;
- import troubleshooting guide;
- backup/restore runbook;
- incident and support runbook;
- release and rollback checklist.

## 16. Legacy Cleanup

After reconciliation and production sign-off:

- retire unused legacy metrics actions/routes;
- remove duplicate dashboard logic;
- archive obsolete configuration;
- keep migrations and audit history;
- document any intentionally retained compatibility layer.

Do not drop legacy tables until migration reconciliation and rollback windows are complete.

## 17. Testing

- instrument versioning and conditional-logic tests;
- import mapping, duplicate, quarantine, and retry tests;
- end-to-end baseline/midline/endline workflow;
- authorization penetration checks;
- export formula-injection tests;
- backup restore exercise;
- load and concurrency tests;
- accessibility audit;
- pilot user-acceptance test;
- full regression suite.

## 18. Deliverables

- configurable instrument administration;
- mobile/import integration boundary;
- historical migration and reconciliation;
- security and privacy review;
- verified backup/restore;
- observability and alerts;
- performance/accessibility hardening;
- training materials and runbooks;
- staged production rollout;
- legacy cleanup plan.

## 19. Acceptance Criteria

Phase 5 and the overall MEL feature are accepted when:

- approved users can configure and publish new instrument versions safely;
- imported data is validated, deduplicated, audited, and reviewed;
- historical data is reconciled;
- backup restore is proven;
- critical security findings are resolved;
- expected load is supported;
- accessibility and mobile-critical paths pass;
- pilot and programme rollout complete successfully;
- operational owners accept the runbooks and support model;
- no critical/high defect remains open.

## 20. Final Completion Gate

The MEL system is complete only after:

- Phases 1-5 are individually accepted;
- the ITT reconciliation pack is signed off;
- production backup and recovery are verified;
- training and handover are complete;
- the stabilization period closes with agreed service levels.
