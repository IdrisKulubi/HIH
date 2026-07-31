# MEL Phase 3: Review, DQA, Evidence and Learning

## 1. Objective

Deliver the complete REDO and MEL review lifecycle, data-quality assurance, approved evidence repository, and learning/adaptation workflow.

At the end of Phase 3, submitted enterprise reports can be reviewed, corrected, approved, locked, and used as trusted reporting data.

## 2. Dependencies

- Phase 1 reporting periods and indicator catalogue;
- Phase 2 submissions, evidence, validations, and audit foundation;
- agreed EDO/REDO/MEL assignment rules.

## 3. In Scope

- REDO review queue;
- MEL review queue;
- returned-for-correction cycles;
- self-approval prevention;
- DQA rules and exception flags;
- evidence preview and verification;
- final approval and locking;
- reopen/override controls;
- evidence repository;
- learning and adaptation tracker;
- overdue and returned notifications;
- review audit history.

## 4. Out of Scope

- final ITT dashboards;
- GIS visualizations;
- configurable survey builder;
- external mobile-data integration.

## 5. Workflow

### EDO-originated report

`Submitted -> REDO review -> MEL review -> Approved`

Possible branches:

- REDO returns to EDO;
- MEL returns to collector through the review chain;
- collector corrects and resubmits;
- administrator reassigns a reviewer with a reason.

### REDO-originated report

`Submitted -> MEL review -> Approved`

The originating REDO cannot approve their own submission.

### Approved report

- becomes read-only;
- contributes to trusted actuals;
- activates approved one-time achievements;
- can be reopened only by MEL/admin with a reason;
- reopening removes it from trusted actuals until re-approved.

## 6. Status Model

Recommended statuses:

- `draft`;
- `submitted`;
- `redo_review`;
- `returned_by_redo`;
- `mel_review`;
- `returned_by_mel`;
- `approved`;
- `reopened`;
- `voided`.

Do not use UI labels as the only workflow enforcement. Server actions must validate legal transitions.

## 7. Review Interface

Each review queue must support:

- reporting-period filter;
- county, track, sector, collector, and status filters;
- overdue and late/catch-up badges;
- DQA issue count;
- evidence completeness;
- submitted/resubmitted timestamps;
- assignment and reassignment;
- bulk export of queue metadata only, not bulk approval.

The report review screen must show:

- profile snapshot;
- current values;
- previous approved period;
- baseline comparison;
- calculated profit and cumulative jobs;
- evidence by question/indicator;
- DQA flags;
- full return/approval history.

## 8. Return and Correction

- return reason is mandatory;
- reviewers select affected sections/questions;
- collectors see a consolidated correction list;
- unaffected answers remain intact;
- edits after return are audited;
- resubmission increments the version;
- prior submitted versions remain available to authorized reviewers;
- email/in-app notifications are idempotent.

## 9. DQA Rules

### Completeness

- required answers present;
- conditional details present;
- required evidence present;
- profile snapshot complete.

### Consistency

- profit equals revenue minus cost;
- job disaggregation rules pass;
- cumulative jobs equal approved quarterly totals;
- finance values and selected finance types agree;
- one-time achievements are not duplicated.

### Plausibility

Configurable flags for:

- large revenue/profit changes from baseline or prior period;
- unusually high job changes;
- finance or waste values outside expected ranges;
- repeated identical values across periods;
- visit date outside the reporting period;
- evidence reused across unrelated results.

A plausibility flag is not automatically an error. The reviewer can accept it with a mandatory explanation.

### Timeliness

- on-time;
- late;
- catch-up;
- overdue/missing.

## 10. Evidence Repository

Provide an authorized repository searchable by:

- enterprise;
- reporting period;
- indicator/deliverable;
- evidence type;
- uploader;
- approval status.

Controls:

- signed/access-controlled URLs;
- file metadata and retention state;
- replacement history;
- no anonymous public listing;
- malware/content-type protections supported by the upload provider;
- removal requires authorization and an audit reason;
- an evidence record used by an approved report cannot be silently deleted.

## 11. Learning and Adaptation Tracker

Add learning/action records with:

- source report or DQA issue;
- lesson or finding;
- agreed action;
- responsible person;
- due date;
- status: open, in progress, completed, cancelled;
- follow-up notes;
- evidence;
- created/closed metadata.

Views:

- enterprise-level actions;
- programme-wide action queue;
- overdue actions;
- actions by owner and status.

## 12. Notifications

Notify relevant users when:

- a report is submitted;
- a report is assigned/reassigned;
- a report is returned;
- a report is resubmitted;
- a report is approved;
- a reporting deadline is approaching;
- a report becomes overdue;
- a learning action becomes overdue.

Notification failure must not roll back a successful workflow transition. Failed delivery must be logged for retry.

## 13. Testing

### State-machine tests

- every allowed transition;
- every forbidden transition;
- REDO self-approval prevention;
- reopening and re-approval;
- idempotent repeated actions.

### DQA tests

- completeness;
- consistency;
- configurable plausibility thresholds;
- accepted exception with reason;
- late/catch-up classification.

### Authorization tests

- collector, assigned REDO, MEL, admin, applicant;
- evidence access;
- reviewer reassignment;
- reopen/void controls.

### Browser smoke tests

- EDO submit -> REDO return -> correction -> REDO approve -> MEL approve;
- REDO-originated report -> MEL approve;
- DQA exception acceptance;
- evidence repository search;
- create and close a learning action.

## 14. Deliverables

- Phase 3 schema migration;
- review state machine;
- REDO and MEL queues;
- DQA engine;
- evidence repository;
- learning/action tracker;
- notifications and audit history;
- tests and reviewer guidance.

## 15. Acceptance Criteria

Phase 3 is accepted when:

- both approval paths work without self-approval;
- returned reports preserve history and support correction;
- approved reports are locked;
- reopened reports stop contributing trusted data;
- DQA issues are visible, explainable, and auditable;
- evidence is protected and traceable;
- learning actions can be assigned and followed through;
- unauthorized workflow and evidence access attempts fail server-side.

## 16. Phase Gate

Do not start Phase 4 until a controlled set of reports has passed through the complete workflow and MEL signs off that approved records are trustworthy enough to become ITT actuals.
