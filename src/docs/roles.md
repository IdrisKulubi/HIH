# Access To Finance Roles And Responsibilities

## Purpose

This document records the agreed role model for the Innovation Fund Management Module / Matching Grant workflow.

The client wants a simple operating model:

`Enterprise applies -> Access to Finance Officer reviews and manages the case -> Access to Finance Committee reviews/approves the score and progression -> Access to Finance Officer prepares agreement, procurement, disbursement, and monitoring -> Admin can see and manage everything.`

## Roles

| Role | System Role Key | Status | Main Responsibility |
| --- | --- | --- | --- |
| Enterprise / Applicant | `applicant` | EXISTS | Completes the Matching Grant application and later uploads the signed agreement. |
| Admin | `admin` | EXISTS | Has full visibility and administrative control across the whole module. |
| Access to Finance Officer | `a2f_officer` | EXISTS | Operational owner of the Access to Finance workflow from eligibility review through procurement, disbursement, and monitoring. |
| Access to Finance Committee | `a2f_committee` | TODO | Dedicated committee dashboard role for reviewing all A2F cases, scores, scoring breakdowns, score overrides, and approval to proceed to agreement. |

## Enterprise / Applicant

The enterprise should only see the applicant-facing Access to Finance area.

They should be able to:

- Start and complete the online Matching Grant application.
- Select Foundation or Accelerator track.
- Enter enterprise, entrepreneur, business, financial, impact, budget, co-investment, milestone, and declaration details.
- Upload required supporting documents.
- Submit the application.
- Receive an email confirming that the application has been submitted.
- Return later to upload the signed agreement after the agreement has been issued.

They should not be able to:

- See internal scoring.
- See other enterprises.
- Edit scores.
- Access GAIR preparation.
- Access IC decision controls.
- Access procurement or disbursement staff controls.

## Admin

Admin should retain full access.

Admin should be able to:

- View all applications, scores, GAIRs, IC decisions, agreements, procurement records, disbursements, and monitoring records.
- Manage users and roles.
- Assign or update Access to Finance roles.
- Support troubleshooting and correction.
- Access both staff and oversight views.

Admin should not be used as the normal workflow owner unless needed for support.

## Access To Finance Officer

The Access to Finance Officer is the main staff user for the module.

They should be able to:

- View submitted enterprise applications.
- Check revenue eligibility.
- Review and manage Matching Grant scoring.
- Prepare or auto-populate the GAIR.
- Prepare IC-ready case information.
- Track procurement.
- Track implementation milestones.
- Log and monitor disbursements.
- Monitor supporting documents and implementation evidence.
- Send or manage the grant agreement after committee approval.
- Track signed agreement upload from the enterprise.

Important rule:

- The Access to Finance Officer should not issue or send the agreement before the Access to Finance Committee gives approval to proceed.

## Access To Finance Committee

This is the new role requested by the client.

Only one person is expected to have this role.

They should have a dedicated dashboard showing:

- All enterprises in the Access to Finance pipeline.
- Application status.
- Foundation or Accelerator track.
- Revenue eligibility result.
- Total score.
- Qualification status.
- Full scoring breakdown by section and parameter.
- Reviewer notes and evidence notes.
- GAIR summary or link to GAIR.

They should be able to:

- Inspect how each score was produced.
- Override or alter scoring results if required.
- Record committee notes.
- Approve an application to proceed to agreement.
- Approve with conditions.
- Defer.
- Decline.

Important rule:

- Agreement generation/sending must only become available after this committee role approves or approves with conditions.

## Current Code Alignment

| Area | Current Status | Notes |
| --- | --- | --- |
| `applicant` role | EXISTS | Current user role enum already includes applicant. |
| `admin` role | EXISTS | Current user role enum already includes admin. |
| `a2f_officer` role | EXISTS | Current user role enum already includes A2F officer. Existing A2F actions already allow this role. |
| `a2f_committee` role | TODO | Needs to be added to the user role enum, role utilities, auth/session typing if needed, and UI routing. |
| Applicant Matching Grant form | IN PROGRESS | Staff-facing Matching Grant application workspace exists. Needs applicant-only routing/form experience. |
| Application submission email | TODO | Enterprise should receive confirmation email after submitting the Matching Grant application. |
| A2F Officer workflow | IN PROGRESS | Officer can manage application/scoring/GAIR/procurement/disbursement in existing A2F module. Needs final role tightening. |
| Committee approval gate | PARTIAL | IC decision fields exist. Needs dedicated committee dashboard and stricter agreement gate. |
| Enterprise signed agreement upload | TODO | Enterprise should return and upload signed agreement after agreement is issued. |

## Required Implementation Changes

| Step | Status | Required Work |
| --- | --- | --- |
| Add committee role | TODO | Add `a2f_committee` to `userRoleEnum`, role constants, role-home routing, admin user role options, and any auth/session role typing. |
| Dedicated committee dashboard | TODO | Create dashboard where committee user sees all A2F enterprises, scores, scoring breakdown, GAIR links, and approval controls. |
| Score override by committee | TODO | Allow committee user to adjust scores or record an override with notes. Keep audit trail of who changed what and why. |
| Agreement approval gate | TODO | Block agreement generation/sending until committee decision is `approved` or `approved_with_conditions`. |
| Officer permissions cleanup | TODO | Make `a2f_officer` the main operational role for eligibility, scoring review, GAIR, procurement, disbursement, and monitoring. |
| Applicant-only A2F routing | TODO | When an enterprise logs in and is in the Access to Finance group/pipeline, send them to the applicant Matching Grant application form or their signed-agreement upload page. |
| Applicant portal restrictions | TODO | Applicant should only see their own application and agreement upload/status, not internal scores, GAIR, IC decisions, procurement, or disbursement controls. |
| Submission email | TODO | Send email to enterprise when Matching Grant application is submitted successfully. |
| Signed agreement upload | TODO | Add enterprise-facing upload area for signed agreement and notify A2F officer after upload. |
| Admin visibility | TODO | Confirm admin can access all dashboards and override/support workflows. |

## Final Target Workflow

1. Enterprise logs in.
2. System checks whether the enterprise is in the Access to Finance flow.
3. Enterprise is taken to the Matching Grant application form.
4. Enterprise completes and submits the application.
5. Enterprise receives submission confirmation email.
6. Access to Finance Officer reviews eligibility and scoring.
7. Access to Finance Officer prepares GAIR.
8. Access to Finance Committee reviews dashboard, scores, and GAIR.
9. Committee approves, approves with conditions, defers, or declines.
10. If approved, Access to Finance Officer generates/sends agreement.
11. Enterprise uploads signed agreement.
12. Access to Finance Officer tracks procurement, milestones, disbursement, and monitoring.
13. Admin can view and manage the full process at all stages.
