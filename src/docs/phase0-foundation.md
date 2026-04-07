# Phase 0 Foundation Review

This document captures the Phase 0 outputs for the BIRE platform expansion. It translates the current codebase into a practical foundation for implementing KYC and the Phase 2 modules.

It is based on the current application structure, schema, route layout, and workflow logic already present in the repository.

## 1. Current System Snapshot

The platform is currently a post-application operations system built on:

- Next.js App Router
- React 19
- Drizzle ORM with PostgreSQL
- NextAuth authentication
- server actions for business logic
- UploadThing for file uploads

The current implemented business scope already includes:

- public application intake
- account creation and profile management
- eligibility checking and scoring
- dual-review workflow
- due diligence
- A2F investment pipeline
- support, exports, analytics, and admin tooling

## 2. Current Route Map

The current top-level route groups in `src/app` are:

- `(auth)` for login, signup, password flows
- `apply` for application intake
- `profile` for the applicant account area
- `admin` for platform administration
- `reviewer` for reviewer workflows
- `evaluator` for evaluation/scoring flows
- `oversight` for oversight decisions
- `a2f` for investment pipeline operations
- `api` for backend endpoints

### Current Route Intent

`/apply`

- enterprise application submission
- track-specific forms

`/profile`

- applicant dashboard
- application snapshot
- progress timeline
- support and contracts

`/admin`

- application management
- analytics
- dual review
- due diligence oversight
- export
- support
- users

`/reviewer`

- application review
- due diligence review

`/oversight`

- approval and escalation workflows

`/a2f`

- qualified enterprise investment pipeline
- due diligence reports
- scoring
- contracts
- disbursements

## 3. Current Database Domains

The schema already models these major business domains:

- users and user profiles
- applicants and businesses
- applications
- eligibility results
- scoring configuration and scoring criteria
- support tickets and messaging
- due diligence records and items
- A2F pipeline, DD reports, scoring, appraisals, grant agreements, and disbursements

### Important Current Enums

Current role enum:

- `applicant`
- `admin`
- `technical_reviewer`
- `reviewer_1`
- `reviewer_2`
- `oversight`
- `a2f_officer`

Current application status enum:

- `submitted`
- `under_review`
- `pending_senior_review`
- `scoring_phase`
- `finalist`
- `approved`
- `rejected`

Current verification status enum exists, but is not yet wired into an actual KYC workflow:

- `pending`
- `verified`
- `rejected`
- `needs_info`

Current A2F pipeline statuses:

- `a2f_pipeline`
- `due_diligence_initial`
- `pre_ic_scoring`
- `ic_appraisal_review`
- `offer_issued`
- `contracting`
- `disbursement_active`
- `post_ta_monitoring`

## 4. Current Workflow Reality

### Applicant Journey Today

The implemented lifecycle today is approximately:

1. user signs up or logs in
2. user creates a profile
3. user submits an enterprise application
4. system runs eligibility/scoring
5. reviewers perform blind dual review
6. application is approved or rejected
7. due diligence can be initiated for qualified enterprises
8. approved DD enterprises can be pushed into A2F

### Review Workflow Today

The review engine currently behaves like this:

- reviewer 1 submits first review
- application status moves to `pending_senior_review`
- reviewer 2 submits second review
- final score becomes the average of reviewer 1 and reviewer 2
- `qualifiesForDueDiligence` is set when the average score meets threshold

### Due Diligence Workflow Today

The DD workflow currently supports:

- claim/release model
- primary reviewer and validator reviewer
- approval window and auto-reassignment support
- oversight-triggered DD recommendation
- admin override support

### A2F Workflow Today

The A2F module already assumes that an enterprise has passed prior stages and can be admitted into the investment pipeline after qualification.

## 5. Current Gaps Before KYC and Phase 2

The following gaps are the main blockers to implementing the new add-ons:

- there is no KYC data model yet
- there is no enterprise lifecycle stage between `approved` and post-selection service access
- there is no route-level gating for KYC completion
- there is no concept of profile locking after verification
- there are no mentorship tables or routes
- there are no CNA/BDS tables or routes
- there are no M&E metrics tables or routes
- there is no Kajabi integration endpoint or data model
- there are no mentor-facing roles yet
- there is no explicit verification admin role yet

## 6. Recommended Enterprise Lifecycle

To support KYC and Phase 2 cleanly, we should separate selection from onboarding and activation.

### Recommended High-Level Lifecycle

1. application submitted
2. review in progress
3. selected
4. pending KYC
5. KYC submitted
6. KYC needs info or rejected
7. KYC verified
8. phase 2 modules unlocked
9. mentorship/CNA/M&E active
10. A2F active where applicable

### Recommended Rule

`approved` in the current system should no longer mean "fully unlocked enterprise".

Instead:

- `approved` should mean the enterprise has been selected into the program
- KYC should determine whether the enterprise can proceed into post-selection modules

## 7. Recommended Status Strategy

To avoid forcing too much meaning into the existing `application_status`, we should keep statuses scoped by domain.

### Recommended Status Ownership

`application_status`

- should continue describing application review and selection outcome
- should stop trying to represent KYC or post-selection operations

`kyc_status`

- should be introduced as a separate workflow status
- recommended values:
  - `not_started`
  - `in_progress`
  - `submitted`
  - `needs_info`
  - `verified`
  - `rejected`

`profile_lock_status`

- should be introduced to control editability of verified enterprise data
- recommended values:
  - `unlocked`
  - `locked`
  - `change_requested`
  - `change_approved`

`phase2_activation_status`

- can be either a dedicated field or derived from KYC verification
- recommended values if explicit:
  - `locked`
  - `active`
  - `suspended`

### Recommended Interpretation

- `application.status = approved` means selected
- `kyc.status = verified` means enterprise is operationally activated
- downstream modules should rely on KYC verification, not only application approval

## 8. Recommended Role Model

### Current Roles We Can Reuse

- `applicant`
- `admin`
- `technical_reviewer`
- `reviewer_1`
- `reviewer_2`
- `oversight`
- `a2f_officer`

### New Roles Recommended

- `verification_admin`
- `mentor`
- `program_officer`

### Role Recommendations

`verification_admin`

- handles KYC review, document validation, and profile activation
- may be separate from general admin if operational separation matters

`mentor`

- participates in mentorship sessions and evidence submission
- should not inherit broad admin privileges

`program_officer`

- useful umbrella role for CNA, BDS, mentorship coordination, and M&E support
- can represent R/EDO responsibilities described in the docs

### Minimal Safe Option

If we want to avoid enum expansion immediately, we can begin with:

- `admin` acting as verification admin
- `admin` or `oversight` acting as program support staff
- mentor records linked to `users`, while role expansion happens later

But the cleaner long-term design is to add the explicit roles above.

## 9. Recommended Module Boundaries

To keep the expansion maintainable, each new module should have its own schema area, server actions, and route group.

### KYC Module

Owns:

- onboarding after selection
- document completion
- baseline refresh
- admin verification
- profile locking

Suggested route areas:

- `src/app/kyc/*`
- `src/app/admin/kyc/*`
- `src/lib/actions/kyc.ts`

### CNA and BDS Module

Owns:

- diagnostics
- resilience scoring
- risk ranking
- intervention tracking

Suggested route areas:

- `src/app/cna/*`
- `src/app/admin/cna/*`
- `src/lib/actions/cna.ts`

### Mentorship Module

Owns:

- mentor onboarding
- matching
- session scheduling
- evidence enforcement
- action item progression

Suggested route areas:

- `src/app/mentorship/*`
- `src/app/admin/mentorship/*`
- `src/lib/actions/mentorship.ts`

### M&E Module

Owns:

- baseline/endline or periodic performance updates
- metrics calculations
- enterprise outcome tracking
- reporting feeds

Suggested route areas:

- `src/app/metrics/*`
- `src/app/admin/metrics/*`
- `src/lib/actions/metrics.ts`

### Kajabi Integration

Owns:

- LMS identity mapping
- webhook ingestion
- progress reflection in enterprise/admin views

Suggested route areas:

- `src/app/api/webhooks/kajabi/route.ts`
- `src/app/admin/kajabi/*`
- `src/lib/actions/kajabi.ts`

## 10. Recommended Access Rules

### Enterprise Access Rules

Applicants should be able to:

- complete KYC only if selected
- view but not enter downstream modules before KYC verification
- access mentorship, CNA, M&E, and Kajabi-linked learning progress only after verification

### Staff Access Rules

Admins or verification admins should be able to:

- review KYC submissions
- request additional information
- approve and lock enterprise records

Program staff should be able to:

- conduct CNA
- assign BDS interventions
- coordinate mentorship
- review metrics

Mentors should be able to:

- view assigned mentees
- update session outcomes
- upload physical-session evidence where permitted

### Guard Strategy

We should add shared helpers for:

- `requireSelectedEnterprise()`
- `requireKycVerifiedEnterprise()`
- `requireVerificationAdmin()`
- `requireProgramOfficer()`
- `requireMentor()`

## 11. Recommended Route Expansion

### Enterprise Routes to Add

- `/kyc`
- `/kyc/profile`
- `/kyc/documents`
- `/kyc/review`
- `/mentorship`
- `/cna`
- `/metrics`
- `/learning`

### Admin Routes to Add

- `/admin/kyc`
- `/admin/kyc/[id]`
- `/admin/mentorship`
- `/admin/mentorship/[id]`
- `/admin/cna`
- `/admin/cna/[businessId]`
- `/admin/metrics`
- `/admin/kajabi`

## 12. Key Decisions for Phase 1

These are the decisions Phase 1 should now follow.

### Decision 1

KYC will be implemented as a separate domain and not folded into `application_status`.

### Decision 2

KYC verification will be the unlock condition for all downstream post-selection modules.

### Decision 3

The system will preserve the current review, DD, and A2F models, and layer the new modules between selection and post-selection service delivery.

### Decision 4

The new modules will follow the same architecture pattern already used in the repo:

- schema in `db/schema.ts`
- server actions in `src/lib/actions`
- route-specific UI under `src/app`
- shared components under `src/components`

### Decision 5

We should keep statuses domain-specific and avoid overloading a single enum with unrelated process states.

## 13. Phase 0 Completion Output

Phase 0 is complete when the team agrees to the following foundation:

- selected does not equal fully activated
- KYC becomes the gateway into Phase 2
- KYC gets its own schema and routes
- downstream modules are built as separate domains
- access control is derived from role plus KYC state
- enterprise profile locking begins after verification

## 14. Recommended Next Build Step

Proceed to Phase 1 with the KYC schema design.

The first code implementation should focus on:

- KYC status fields
- KYC profile and document tables
- admin verification audit fields
- enterprise profile lock model
