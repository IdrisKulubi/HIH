# Fieldwork Management Module Delivery Checklist

Use this alongside the implementation plan. Mark an item complete only after code, tests, review, and acceptance evidence exist. Keep the phase status table in the plan current as work progresses.

## Phase 1: Foundation, scheduling, approval, and notifications

Status: Done (migrations 0060–0062 applied; UAT deferred to final Test 3)

- [x] Record ESM recipient model, REDO routing and time zone decisions (see "Phase 1 decisions as implemented"). Location, retention, 200-word, client-contact and override decisions remain for product-owner confirmation.
- [x] Add Drizzle schema for plans, enterprise visits, staff assignments, notification delivery, and audit history.
- [x] Create, review, and verify the database migration with indexes and constraints (0060, 0062 applied).
- [x] Implement server-side authorization and explicit state transitions.
- [x] Build EDO enterprise search/filter/bulk-selection and plan-draft experience.
- [x] Capture per-enterprise agenda, schedule, duration, and field-staff assignment.
- [x] Build REDO approval/return queue with mandatory return reasons.
- [x] Add approved-itinerary email and delivery logging for EDO, REDO, and ESM recipients (inline template; ESM list is env-based, see decisions).
- [x] Add role-aware navigation and empty/loading/error states.
- [ ] Add unit, integration, authorization, migration, and browser smoke tests. (Rule-level unit tests exist: `pnpm test:fieldwork-phase1`. Database-backed integration tests, migration 0062 verification and browser smoke tests are still outstanding.)
- [ ] Complete code review and product-owner acceptance.

Completion evidence:

- [x] Migration verification recorded (applied by product owner).
- [ ] Test suite recorded.
- [ ] Acceptance scenario recorded.
- [ ] Phase marked `Done` in the implementation plan.

## Phase 2: Visit execution, dynamic reports, and report approval

Status: In review (build complete; UAT deferred to Test 3)

- [x] Add schema/migration for check-in/out, location metadata, verification, missed-visit reasons, report state, reviews, and feedback delivery (0061, 0063).
- [x] Implement mobile-responsive check-in/check-out with privacy notice, permission, accuracy, timestamp, and retry states.
- [x] Configure verification radius, accuracy threshold, no-coordinate handling, and manual exception workflow (env-configurable; REDO exception queue).
- [x] Build the pending-report dashboard and dynamic report task creation from verified visits only.
- [x] Implement missed-visit reason capture for scheduled but unvisited enterprises.
- [x] Build report form with read-only enterprise/agenda fields and server-enforced word-count/required-field validation.
- [x] Implement end-of-day reminders and notification delivery logging (17:00 Nairobi cron; retried by next run; no per-failure alerting yet).
- [x] Enforce the server-side no-new-booking gate for EDOs with pending reports or missed-visit reasons.
- [x] Implement auditable admin override for the booking gate (48h, reason required, revocable).
- [x] Build REDO report approve/return queue with mandatory return reason.
- [x] Send and log approved client feedback; provide a controlled retry for failures.
- [ ] Add unit, integration, authorization, geolocation-policy, email-failure, and browser smoke tests. (Rule-level tests exist: `pnpm test:fieldwork-phase2`. Database-backed and browser tests outstanding.)
- [ ] Complete code review and product-owner acceptance.

Completion evidence:

- [ ] Three-of-five verified-visit scenario passes.
- [ ] Location exception scenarios pass.
- [ ] Reminder and booking-gate reconciliation passes.
- [ ] Phase marked `Done` in the implementation plan.

## Phase 3: Operations, exports, hardening, pilot, and rollout

Status: In progress (build largely complete; pilot, reviews and sign-off outstanding)

- [x] Build admin search/filter views for plans, visits, verification outcomes, reports, delivery status, and audits (`/admin/fieldwork`).
- [x] Implement role-safe CSV/XLSX exports and export audit events (admin only; `fieldwork_export_events`).
- [x] Verify precise location is not included in standard exports without explicit authorization (opt-in, confirmed, recorded).
- [ ] Add pagination, index/query-plan review, rate limiting, idempotency protection, structured logging, and retry/alert behavior. (Done: pagination, indexes, per-user rate limits on mutating actions and exports, status-guarded idempotent updates, JSON logs, retry of failed feedback, oversight failure banner. Outstanding: query-plan review on production data; email/pager alerting.)
- [ ] Complete responsive, accessibility, timezone, low-bandwidth, security, privacy-retention, backup/restore, and performance checks.
- [x] Prepare administrator guide, field-staff guide, and UAT script (`fieldwork-guides-and-uat.md`).
- [ ] Run the representative non-production pilot and reconcile workflow data.
- [ ] Resolve pilot defects and record release/rollback guidance.
- [ ] Obtain product-owner sign-off and monitor the initial production release.

Completion evidence:

- [ ] Export reconciliation recorded.
- [ ] Security/privacy/accessibility/performance checks recorded.
- [ ] Pilot and UAT acceptance recorded.
- [ ] Phase marked `Done` in the implementation plan.

## Final module closeout

- [ ] All phase statuses are `Done`.
- [ ] No critical or high-severity defects remain.
- [ ] Production migration and rollback/forward-fix instructions are approved.
- [ ] Operational ownership, retention, and support escalation are documented.
- [ ] Final acceptance is recorded.
