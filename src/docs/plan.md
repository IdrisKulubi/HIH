# BIRE Platform Expansion Implementation Plan

This document is the working implementation roadmap for the next set of modules to be added to the BIRE platform. It builds on the current live system, which already supports:

- authentication and user profiles
- enterprise application intake
- eligibility and scoring
- two-tier review
- due diligence
- A2F pipeline, contracts, and disbursements

The new additions will extend the platform beyond selection into post-selection onboarding, compliance, mentorship, business development support, monitoring, and learning integration.

## 1. Goal

Implement the following new platform capabilities:

- KYC Profile module
- Capacity Needs Assessment (CNA) and BDS intervention tracking
- Mentorship management with strict 6-session workflow
- M&E performance tracking and AI reporting logs
- Kajabi LMS integration

## 2. Delivery Principles

- Build in the order of dependency, not just feature visibility.
- Reuse the existing App Router, Drizzle schema, server action, and admin dashboard patterns already used in the repo.
- Use KYC verification as the gateway that unlocks downstream Phase 2 modules.
- Keep enterprise-facing and admin-facing workflows separate but connected through shared status fields.
- Ship in small vertical slices: schema, server logic, UI, permissions, then validation.

## 3. Recommended Delivery Order

1. Foundation and architecture alignment
2. KYC data model and workflow
3. KYC enterprise and admin UI
4. Phase 2 schema additions
5. Access gating and status routing
6. CNA and BDS module
7. Mentorship module
8. M&E and AI reporting module
9. Kajabi integration
10. Reporting, QA, polish, and rollout validation

## 4. Phase-by-Phase Plan

## Phase 0: Foundation and Architecture Review

Purpose: align the current codebase with the new module boundaries before adding business logic.

Phase 0 output document:

- `src/docs/phase0-foundation.md`

Tasks:

- Audit the current schema in `db/schema.ts` and identify fields that can support KYC and Phase 2 without duplication.
- Confirm route strategy for new modules under `src/app`.
- Decide naming conventions for new tables, actions, components, and statuses.
- Define which roles can access each module:
  - enterprise/applicant
  - admin
  - reviewer
  - verification admin
  - mentor
  - R/EDO or equivalent support role
- Review current auth/session shape in `auth.ts` and `src/lib/actions/user.actions.ts` to determine whether new roles must be added.
- Establish a single enterprise lifecycle map from:
  - application submitted
  - selected
  - pending KYC
  - KYC verified
  - mentorship/CNA unlocked
  - A2F active
  - M&E tracked

Deliverables:

- agreed lifecycle/status model
- final table ownership and route map
- final permissions map

## Phase 1: KYC Module Data Model

Purpose: create the formal post-selection onboarding and compliance layer.

Phase 1 output document:

- `src/docs/phase1-kyc-schema.md`

Tasks:

- Extend the database schema with KYC-specific entities, likely including:
  - enterprise KYC profile record
  - KYC submission state
  - KYC document records
  - KYC field change log or delta tracking
  - change request records for locked fields
- Add status fields required to support the KYC flow, including:
  - selection/approval handoff state
  - KYC submission state
  - KYC verification status
  - profile lock status
- Define which current application/business fields are:
  - prefilled
  - editable during KYC
  - immutable after verification
- Add document typing for the new mandatory uploads:
  - KRA PIN / tax compliance
  - CR12
  - bank proof
  - signed consent/code of conduct
- Add audit fields for who submitted, reviewed, approved, rejected, or requested more info.

Deliverables:

- KYC schema additions in `db/schema.ts`
- migration files in `drizzle`
- typed relations and exported types

## Phase 2: KYC Enterprise Workflow

Purpose: allow selected enterprises to review prefilled information, complete missing fields, and submit compliance documents.

Tasks:

- Add enterprise-facing routes under a new KYC area, for example:
  - `src/app/kyc/page.tsx`
  - `src/app/kyc/profile/page.tsx`
  - `src/app/kyc/documents/page.tsx`
  - `src/app/kyc/review/page.tsx`
- Build a multi-step wizard that:
  - preloads existing applicant/business/application data
  - highlights missing fields
  - accepts document uploads
  - captures updated baseline metrics
  - shows submission completeness
- Integrate UploadThing or existing upload flow for the new KYC documents.
- Add save-draft and submit actions.
- Prevent resubmission if the KYC profile is already locked and verified.
- Add enterprise dashboard messaging that explains why KYC is required and what modules remain locked until approval.

Deliverables:

- KYC wizard UI
- enterprise server actions
- validation schema for each KYC step
- upload support for required compliance documents

## Phase 3: KYC Admin Verification Workspace

Purpose: give admins a controlled review space for compliance approval.

Tasks:

- Add admin verification routes, for example:
  - `src/app/admin/kyc/page.tsx`
  - `src/app/admin/kyc/[id]/page.tsx`
- Create queue views for:
  - pending KYC
  - needs info
  - verified
  - rejected
- Build admin comparison views that show:
  - original application values
  - KYC-updated values
  - document previews
  - flagged mismatches
- Add actions for:
  - approve and lock profile
  - reject submission
  - request more information
- On approval, unlock downstream modules for the enterprise.
- Log all admin decisions and timestamps.

Deliverables:

- admin KYC dashboard
- admin verification actions
- profile lock and activation behavior

## Phase 4: Access Control and State Routing

Purpose: make KYC the enforced gateway into all post-selection services.

Tasks:

- Update login and dashboard routing so selected users with pending KYC are sent to the KYC onboarding area.
- Block access to Phase 2 features until verification is complete.
- Add reusable guards/helpers for:
  - selected but not KYC-complete
  - KYC submitted but under review
  - KYC verified
- Update navigation to reveal modules only when unlocked.
- Ensure admin dashboards can still inspect data regardless of enterprise lock state.

Deliverables:

- routing guards
- visibility rules
- shared access helper utilities

## Phase 5: Phase 2 Core Schema Additions

Purpose: add the persistence layer for mentorship, CNA, M&E, and Kajabi.

Tasks:

- Add the enums proposed in `src/docs/phase2.md`.
- Add tables for:
  - mentors
  - mentorship matches
  - mentorship sessions
  - mentorship action items
  - CNA diagnostics
  - BDS interventions
  - business performance metrics
  - AI report queries
  - Kajabi user mapping
  - Kajabi progress webhooks
- Add indexes and relations needed for performance and clean querying.
- Review whether mentor users should reuse `users` + `user_profiles` or require a separate onboarding pattern.
- Add any missing foreign keys to connect these modules back to verified businesses and platform users.

Deliverables:

- final schema additions in `db/schema.ts`
- generated migrations
- relation exports and inferred types

## Phase 6: CNA and BDS Module

Purpose: diagnose enterprise gaps and track recommended business support interventions.

Tasks:

- Add enterprise or staff routes for CNA workflows, for example:
  - `src/app/cna/page.tsx`
  - `src/app/admin/cna/page.tsx`
  - `src/app/admin/cna/[businessId]/page.tsx`
- Build the CNA scoring form for the selected business dimensions.
- Implement server-side scoring logic to:
  - compute top risk area
  - rank weakest dimensions
  - compute resilience index
- Create intervention recommendation and tracking flows.
- Add status management for BDS interventions:
  - recommended
  - in progress
  - completed
  - dropped
- Show history of diagnostics per enterprise so progress can be compared over time.

Deliverables:

- CNA diagnostic form and actions
- calculated scoring utilities
- BDS intervention tracking UI and admin tools

## Phase 7: Mentorship Module

Purpose: manage mentor onboarding, mentor matching, and strict session progression.

Tasks:

- Add mentor profile management:
  - expertise area
  - active status
  - max mentees
- Add admin matching workflow between enterprise and mentor.
- Build mentorship schedule and session UI.
- Enforce the strict state machine:
  - six sessions only
  - sessions 1 and 6 physical
  - sessions 2 to 5 virtual
  - next session cannot unlock if previous requirements are incomplete
- Add evidence gatekeeping for physical sessions:
  - photographic evidence required
  - diagnostic notes required
- Add mentorship action items that must be updated before progression.
- Add audit history for completed, missed, and rescheduled sessions.

Deliverables:

- mentor onboarding/admin tools
- mentor-enterprise matching workflow
- session progression engine
- evidence upload and action tracking

## Phase 8: M&E and AI Reporting

Purpose: record enterprise outcomes after onboarding and support reporting workflows.

Tasks:

- Add M&E routes for enterprise and admin use.
- Build periodic reporting forms for:
  - revenue generated
  - jobs created
  - markets entered
- Implement calculation utilities for:
  - market expansion index
  - enterprise resilience score where required by business logic
- Add baseline and endline survey linkage fields or records.
- Build admin dashboards to view changes over time by enterprise and cohort.
- Add AI report query logging for admin-generated summaries.
- If an AI reporting feature is built later, ensure prompts, summaries, and timestamps are stored safely.

Deliverables:

- business performance metrics workflow
- reporting dashboards
- AI query log support

## Phase 9: Kajabi Integration

Purpose: connect BIRE enterprise records to LMS activity.

Tasks:

- Add local Kajabi identity mapping between platform user and external LMS user.
- Create webhook endpoint:
  - `src/app/api/webhooks/kajabi/route.ts`
- Validate and store incoming webhook payloads.
- Support webhook event types such as:
  - enrollment
  - lesson/module progress
  - course completion
- Reflect LMS completion/progress inside the BIRE portal.
- Add retry-safe processing and duplicate event protection.
- Add admin visibility into Kajabi sync health and last webhook activity.

Deliverables:

- webhook route
- payload validation and persistence
- UI for LMS progress visibility

## Phase 10: Cross-Cutting Improvements

Purpose: make the new modules production-ready and consistent with the rest of the platform.

Tasks:

- Add shared status badges, tables, forms, and upload widgets for the new modules.
- Extend analytics/export flows to include KYC and Phase 2 data.
- Add email notifications where useful:
  - KYC submitted
  - KYC approved/rejected
  - mentorship session reminders
  - action item reminders
  - BDS assignment updates
- Add audit logs wherever admin decisions change enterprise access.
- Update navigation, dashboards, and empty states.
- Ensure mobile responsiveness and consistency with existing admin UI.

Deliverables:

- shared components
- exports/analytics extensions
- notifications and UX polish

## Phase 11: Testing and Validation

Purpose: verify the new modules are safe, coherent, and ready to use.

Tasks:

- Test the end-to-end enterprise journey from approved application to KYC to unlocked Phase 2 modules.
- Test role restrictions for all new routes and actions.
- Test document upload failure states and incomplete KYC cases.
- Test mentorship progression rules and evidence gating.
- Test CNA calculations against known sample inputs.
- Test Kajabi webhook handling with repeat and malformed payloads.
- Test locking behavior for verified profiles and formal change requests.
- Run lint/build/db migration validation before rollout.

Deliverables:

- QA checklist
- sample test data
- pre-release validation notes

## 5. Suggested Implementation Milestones

Milestone 1:

- finalize lifecycle and schema design
- implement KYC schema and migrations

Milestone 2:

- ship enterprise KYC flow
- ship admin KYC verification flow
- enforce KYC access gating

Milestone 3:

- add Phase 2 schema
- ship CNA and BDS module

Milestone 4:

- ship mentorship module with state machine enforcement

Milestone 5:

- ship M&E and AI reporting support
- add Kajabi webhook integration

Milestone 6:

- analytics, exports, notifications, QA, and rollout hardening

## 6. File Areas Likely to Change

Core backend:

- `db/schema.ts`
- `db/migrate.ts`
- `drizzle/*`
- `auth.ts`
- `src/lib/actions/*`
- `src/lib/types/*`

Enterprise-facing app:

- `src/app/kyc/*`
- `src/app/cna/*`
- `src/app/mentorship/*`
- `src/app/me/*` or `src/app/metrics/*` depending on route naming

Admin-facing app:

- `src/app/admin/kyc/*`
- `src/app/admin/cna/*`
- `src/app/admin/mentorship/*`
- `src/app/admin/metrics/*`
- `src/app/admin/kajabi/*`

API routes:

- `src/app/api/webhooks/kajabi/route.ts`

UI components:

- `src/components/*` for forms, tables, dashboards, uploads, and status widgets

## 7. Recommended Build Sequence for Us

This is the sequence I recommend we follow in implementation:

1. finalize the enterprise lifecycle and statuses
2. implement KYC schema
3. build KYC enterprise wizard
4. build KYC admin verification workspace
5. add routing and module locking
6. add Phase 2 schema tables and enums
7. implement CNA logic and BDS tracking
8. implement mentorship matching and session engine
9. implement M&E metrics and AI query logging
10. implement Kajabi webhook ingestion and progress display
11. extend analytics, exports, and notifications
12. run full QA and rollout checks

## 8. Immediate Next Step

Start with KYC first.

Reason:

- it is the formal bridge from selection into all downstream support
- it introduces the profile verification and locking model
- the other new modules depend on having a verified enterprise profile
- it gives us the cleanest access-control foundation for everything else

## 9. Definition of Success

The new additions will be considered successfully implemented when:

- selected enterprises can complete KYC without re-entering everything from scratch
- admins can verify and lock enterprise records cleanly
- verified enterprises automatically unlock downstream support modules
- staff can diagnose enterprise gaps and assign BDS support
- mentorship follows the required 6-session progression rules
- business performance can be captured over time
- Kajabi learning activity appears inside the portal
- all major transitions are validated, auditable, and role-protected
