# Fieldwork Management Module Implementation Plan

## Purpose

This is the engineering delivery plan for the Fieldwork Management Module. It turns the approved fieldwork brief into a safe, maintainable workflow for planning visits, verifying visits in the field, collecting client reports, reviewing those reports, and exporting the resulting records.

The module will extend the existing enterprise master data, `bds_edo` (EDO), `redo`, administrator, email, upload, and export foundations. It will not create a duplicate enterprise directory or a parallel identity system.

## Delivery status

| Phase | Scope | Status | Entry condition |
| --- | --- | --- | --- |
| Phase 1 | Foundation, scheduling, approval, and itinerary notifications | Done | Migrations 0060–0062 applied; UAT deferred to final Test 3 |
| Phase 2 | Visit execution, verification, report completion, and report approval | In review | Build complete; migrations 0061 and 0063 to be applied; UAT deferred to Test 3 |
| Phase 3 | Operational dashboard, exports, hardening, pilot, and rollout | In progress | Build largely complete; pilot, reviews and sign-off outstanding |

Only `Not started`, `In progress`, `In review`, `Blocked`, and `Done` may be used. Update this table and the companion checklist whenever a phase changes state.

## Scope and workflow

The target workflow is:

`EDO creates visit plan -> REDO approves or returns it -> approved itinerary is emailed -> EDO checks in and out at each enterprise -> EDO completes only reports for verified visits and records missed-visit reasons -> REDO approves or returns reports -> approved client feedback is emailed -> admins can search, view, and export the records`

### In scope

- Search, filter, select, and bulk-select existing enterprises.
- Set a client-specific agenda, visit date/time, estimated duration, and assigned field staff.
- REDO approval with a mandatory reason when returning a plan or report.
- Email notifications to the responsible EDO, REDO, and ESM recipient(s).
- Check-in/check-out with device location where consent and browser permission are available.
- Reports only for completed, verified visits; missed-visit reasons for scheduled but unvisited enterprises.
- The required report fields and minimum word counts.
- End-of-day pending-report reminders and the rule that blocks new bookings while an EDO has outstanding reports.
- REDO report review, client feedback email after approval, admin visibility, and controlled exports.

### Out of scope for this module

- A new enterprise/client registration flow.
- Native mobile apps, continuous background tracking, or employee surveillance.
- Route optimization, mileage reimbursement, or calendar-provider synchronization.
- Changing unrelated KYC, CNA, CDP, mentorship, A2F, or MEL workflows.

## Design and engineering principles

- **Server-authorized workflows:** each server action and route checks the user role and record ownership. A hidden UI action is never the only access control.
- **State transitions are explicit:** plans and visit records use constrained statuses and append-only audit events; no screen may bypass a transition.
- **One source of truth:** visits reference the existing `businesses` records and existing staff users.
- **Privacy by design:** capture a point-in-time check-in/check-out location only with an explicit notice and permission; store accuracy, timestamp, and purpose, not continuous location history. Define retention and access controls before production.
- **Resilient field use:** draft/retry behavior, clear offline/permission failure messages, and idempotent submit actions prevent accidental duplicates in low-connectivity settings.
- **Operationally observable:** notification attempts, reminder jobs, approval events, and export events are auditable and failures are actionable.
- **Performance-minded:** use indexed status, date, assignee, business, and reviewer queries; paginate data grids; generate exports asynchronously or with bounded data sets.

## Phase 1: Foundation, scheduling, approval, and notifications

### Outcome

An EDO can create a fieldwork plan for one or many existing enterprises, assign field staff, submit it for REDO review, and receive an approved itinerary. The system records the full approval history and emails the required recipients.

### Build

1. Confirm the small set of business decisions listed below and document the decisions in this plan.
2. Add the Fieldwork domain model through Drizzle schema changes and a generated, reviewed migration. At minimum create:
   - a visit-plan record (owner, schedule, status, submission/approval timestamps, reviewer, return reason);
   - a per-enterprise visit record (business, agenda, assigned staff, scheduled timing, status);
   - staff assignments, allowing an EDO and any approved additional staff to be attached;
   - notification delivery records; and
   - append-only audit events.
3. Add database constraints and indexes. Enforce valid timing, unique enterprise membership in a plan, valid status transitions, and efficient queues by status/date/owner/reviewer/business.
4. Implement EDO workspace screens for enterprise search, filters, bulk selection, per-enterprise agenda, scheduling, staffing, draft save, validation, and submit-for-approval.
5. Implement REDO queue and review screen with approve and return-for-correction actions. Return requires a reason; approved schedules are immutable except through an audited cancellation or reschedule flow.
6. Add itinerary email templates and a notification service that sends to the plan EDO, reviewer/REDO, and configured ESM recipients. Record sent, failed, and skipped outcomes without blocking a successful plan approval solely because email delivery is temporarily unavailable.
7. Add navigation links and role-aware empty, loading, error, and no-results states.

### Acceptance criteria

- EDOs can search/filter the existing enterprise records and create a multi-enterprise plan without duplicating clients.
- Each selected enterprise has an agenda, and each plan has valid schedule and staff assignment details.
- REDOs can see only the appropriate review queue, approve it, or return it with a recorded reason.
- Approval creates a durable audit trail and sends one correct itinerary notification per intended recipient category.
- Unauthorized users cannot read or mutate schedules through the UI or direct server action calls.
- Migration, validation, authorization, and approval-flow tests pass; existing portal flows regress cleanly.

## Phase 2: Visit execution, dynamic reports, and report approval

### Outcome

The system captures defensible visit completion, prompts EDOs only for reports that are actually due, records missed-visit reasons, blocks new bookings while work is outstanding, and delivers approved client feedback.

### Build

1. Add the visit-execution model: check-in/out events, captured location metadata, verification result, missed-visit reason, report status, report review events, and client-feedback delivery events.
2. Build the mobile-responsive EDO visit screen. Check-in and check-out must capture timestamp, device location when available, accuracy, and the permission/failure state. The user must see the privacy notice before sharing location.
3. Implement verification rules as configuration, not UI-only logic. The initial policy should define the permitted distance from the enterprise coordinate, acceptable accuracy, manual-exception process, and behavior when an enterprise has no trusted coordinate.
4. Build the dynamic report queue and report form. A report becomes available only after the associated visit reaches `completed/verified`; each scheduled enterprise without a completed visit requires a missed-visit reason.
5. Enforce report content on the server: enterprise name and agenda are read-only from the visit; activities conducted has at least 150 words; findings/gaps and all other required fields follow the agreed required-field rules; recommendations has at least 150 words; the brief's 200-word minimum is applied to the report narrative/overall report only if confirmed in Phase 1, because it overlaps the field-specific minima.
6. Add end-of-day reminder processing for reports due and a pending-reports dashboard that states the exact count and links to each item.
7. Enforce the booking gate server-side: an EDO with pending or returned field reports cannot create or submit another plan. Define the legitimate exception/override route for admins and audit it.
8. Add REDO report review: approve or return with a reason. Approval locks the report, records the event, and emails client feedback using the enterprise’s approved contact email; delivery failures remain visible for controlled retry.

### Acceptance criteria

- A plan for five enterprises with three verified visits produces three report tasks and two missed-visit reason tasks, never five report forms.
- Location permission denial, poor accuracy, missing enterprise coordinates, and offline/retry cases have safe, understandable paths and are auditable.
- The form rejects invalid word counts and missing required fields on the server, not only in the browser.
- The pending report count, end-of-day reminders, and booking gate reconcile with the underlying visit records.
- REDO approval/return workflows work end-to-end; approved feedback is sent to the intended enterprise contact and logged.
- Authorization, workflow, validation, geolocation-policy, email-failure, and regression tests pass.

## Phase 3: Operations, exports, hardening, pilot, and rollout

### Outcome

Administrators can operate and audit the module confidently, staff can export permitted information, the system is secure and performant at expected scale, and the module is accepted after a controlled pilot.

### Build

1. Deliver admin views for all plans, visits, location-verification outcomes, missed sessions, pending/returned/approved reports, notification delivery, and audit history, with role-safe search and filters.
2. Add controlled CSV/XLSX exports for schedules and reports. Export only the approved field set, respect role scope, avoid exposing precise coordinates by default, record the export event, and use download-safe spreadsheet values.
3. Add operations safeguards: pagination, database query plans/index review, rate limits for mutable actions, idempotency keys where retries occur, structured error logging, retry policy for scheduled reminders/email, and alerts for repeated delivery/job failures.
4. Complete accessibility, responsive, low-bandwidth, timezone, security, privacy-retention, backup/restore, and performance reviews.
5. Create administrator and field-staff guides plus a short UAT script. Seed a non-production pilot with representative EDOs, REDOs, enterprise locations, permission-denied cases, and incomplete visits.
6. Run pilot, reconcile schedules, visits, reports, approvals, emails, and exports; address defects; obtain product-owner sign-off; then release with monitoring and rollback guidance.

### Acceptance criteria

- Admins can find and export authorized schedules/reports, while EDOs, REDOs, and unrelated staff cannot access data beyond their scope.
- Export totals and statuses reconcile with the data displayed in the portal.
- Critical workflows are usable on mobile and keyboard-accessible; failure and recovery behavior has been tested on constrained connectivity.
- Load, security, retention, backup/restore, and accessibility gates pass at agreed scale.
- Pilot users complete the end-to-end workflow; no critical/high defects remain; the product owner accepts release evidence.

## Decisions required before Phase 1 starts

| Decision | Why it matters | Proposed default |
| --- | --- | --- |
| ESM identity and recipients | `ESM` is not a current application role. | Use a configurable notification-recipient group managed by admins; do not add a role until its permissions are defined. |
| REDO routing | Determines which REDO receives a plan/report. | Route to the EDO's assigned REDO; use an auditable admin fallback queue when no assignment exists. |
| Enterprise location source | Determines verification reliability. | Use verified enterprise/KYC coordinates only; show a controlled exception when unavailable. |
| Location rule | Determines whether check-in can be auto-verified. | Configure radius and accuracy thresholds; record manual REDO/admin exceptions rather than silently accepting failures. |
| Location consent and retention | Required for privacy compliance. | Capture only check-in/out point-in-time data with notice/consent; retain precise coordinates for the agreed operational period and restrict them to authorized staff. |
| Client feedback recipient | Determines where an approved report goes. | Send to the verified primary enterprise contact; hold/retry when none exists instead of using an unverified address. |
| “200 words per client” interpretation | The brief also gives 150/200/150-word field minima. | Enforce the named field minima now; confirm whether a separate 200-word total narrative is required. |
| Time zone and business day | Determines scheduling and end-of-day reminders. | Africa/Nairobi unless programme operations specify otherwise. |
| Booking-gate exception | Prevents an operational deadlock. | Admin-only, reason-required override with audit trail. |

## Definition of done

The Fieldwork Management Module is complete only when all three phase acceptance gates pass, all migrations are tested, security and privacy controls are verified, documentation and the companion checklist are current, pilot evidence is accepted, and no critical or high-severity defects remain.


## Phase 1 decisions as implemented

Recorded so the build and the plan agree. Items marked **needs product-owner confirmation** use the proposed default until confirmed.

| Decision | Implemented behaviour | Status |
| --- | --- | --- |
| ESM recipients | Comma-separated `FIELDWORK_ESM_RECIPIENTS` environment variable. When empty, a `skipped` delivery is logged. No ESM role added. | Interim; an admin-managed recipient group is still to build. **Needs product-owner confirmation** |
| REDO routing | The EDO chooses the reviewing REDO when submitting (`assigned_redo_id`). Only that REDO, or an admin, can review. Unassigned plans go to the admin fallback queue. Authors cannot review their own plans. | Implemented. **Needs product-owner confirmation** (no standing EDO-to-REDO mapping exists in the data) |
| Time zone | Africa/Nairobi (UTC+3). Inputs are read and shown in Nairobi time. | Implemented |
| Plan window | Derived server-side from the earliest visit start to the latest visit end. Visits cannot start in the past. | Implemented |
| Approved plans | Immutable. Draft and returned plans are editable. Approved, submitted, draft and returned plans can be cancelled with a mandatory reason (audited); changing an approved schedule means cancelling and creating a new plan. | Implemented |
| Location source, retention, 200-word rule, client contact, booking-gate override | Phase 2 concerns; see the Phase 2 section. | **Needs product-owner confirmation** before Phase 2 sign-off |

## Phase 2 decisions as implemented

| Decision | Implemented behaviour | Status |
| --- | --- | --- |
| Visit status model | `scheduled` -> `checked_in` -> `completed`, or `scheduled` -> `missed`. Check-in is allowed only on the scheduled Nairobi day. | Implemented |
| Location rule | Defaults: 300 m radius and 100 m accuracy, set by `FIELDWORK_VERIFY_RADIUS_METERS` and `FIELDWORK_MAX_ACCURACY_METERS`. A visit is `verified` only if both check-in and check-out pass. | Implemented. **Needs product-owner confirmation** of the thresholds |
| Enterprise location source | Only KYC-verified `gpsCoordinates` are trusted. Without them, check-ins need a REDO exception. | Implemented |
| Denied, unavailable or timed-out location | The visit can still be recorded, but it is `needs_review`. The assigned REDO or an admin must accept it, with a reason, before a report opens. | Implemented |
| Consent and retention | A privacy notice must be acknowledged before the device is asked. Only point-in-time check-in and check-out readings are stored. The retention period is not set in code. | **Needs product-owner confirmation** |
| Report tasks | A report row is created only for completed and verified (or exception-approved) visits. Missed-visit reasons are due once the visit's Nairobi day has ended. | Implemented |
| Word counts | Activities 150, findings 200, recommendations 150, enforced on the server. Other fields are required (10+ characters). No separate 200-word total is applied. | **Needs product-owner confirmation** of the 200-word interpretation |
| Booking gate | Blocks create and submit while reports are draft or returned, or missed-visit reasons are due. One shared query feeds the dashboard, reminder and gate. | Implemented |
| Gate override | Admin only, reason required, expires in 48 hours, revocable. The override table is the audit record. | Implemented. **Needs product-owner confirmation** of the 48h window |
| Client feedback recipient | The enterprise applicant's email, only if verified. Otherwise the message is held as `skipped` and shown for retry. | Implemented. **Needs product-owner confirmation** |
| Reminders | `/api/cron/fieldwork-reminders` at 14:00 UTC (17:00 Nairobi), one email per officer per day, with exact counts. Needs `CRON_SECRET`. | Implemented |

## Phase 3 build notes

- **Admin views:** `/admin/fieldwork` (admin full access, oversight read-only) with five server-paginated datasets and filters. The same query layer (`admin-queries.ts`) feeds the screen and the exports, so totals reconcile.
- **Exports:** `/api/fieldwork/export`, admin only, CSV or XLSX, capped at 10,000 rows, 10 per minute per admin, formula-neutralised, precise coordinates opt-in, each export logged.
- **Operations:** per-user rate limits on all mutating fieldwork actions, status-guarded updates, structured JSON logs, and an oversight banner for failed or repeatedly failing deliveries.
- **Still outstanding for Phase 3:** the pilot and reconciliation, accessibility, low-bandwidth, load, security, backup and restore reviews, a coordinate retention period, email or pager alerting for repeated failures, and product-owner sign-off.
