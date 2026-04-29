# CNA and CDP Phase 2 Implementation Plan

## 1. What the client actually wants

The CNA is not one admin form where a single person scores twelve focus areas. It is a shared diagnostic workflow where different reviewer roles contribute to one business-level Capacity Needs Assessment.

The client sample files show a question-level diagnostic. Each question belongs to a section and is tagged to a reviewer category such as BDS, TA, IA, or MEAL. In the product, this should map to the working roles:

| Client/source label | Product role | Responsibility in CNA |
| --- | --- | --- |
| BDS | BDS / EDO | Business model, market, operations, customer, systems, distribution, and general business support questions |
| TA | Mentor / technical advisor | Technical capacity, operations, production, systems, risk, and implementation readiness questions |
| IA | Investment analyst | Access to finance, investment readiness, financial readiness, funding risk, and investor-facing questions |
| MEAL | Admin / MEL reviewer, or a future MEL role | Impact, outcomes, verification, and monitoring questions |

The product must support the current three main roles immediately: Mentor, BDS / EDO, and Investment Analyst. MEAL/MEL questions should be preserved in the question bank and exposed either to Admin initially or to a dedicated MEL role later.

## 2. Source-of-truth from the client files

Files reviewed:

- `C:\Users\Idris Kulubi\Downloads\El vaso glasswear Sample Outline (1).xlsx`
- `C:\Users\Idris Kulubi\Downloads\El_Vaso_Glassware_Sample_Outline.md`

Workbook tabs that matter:

- `BDS Needs Assessment`, `TA Needs Assessment`, `IA Needs Assessment`, `MEL Needs Assessment`: the same diagnostic structure repeated as role-oriented tabs.
- `Business Support OKRs`: CDP objectives, key results, weights, targets, achieved outcomes, final score, weighted score.
- `WorkplanWeekly Milestone Tracke`: weekly action tracker with focus area, objective, key result, action, deadline, status, progress, and evidence.
- `Workplan Template`: longer support workplan timeline.
- `Curriculum`: bootcamp/training content that can be mapped into recommended interventions.

The diagnostic sections in the sample are:

| Code in system | Client section name |
| --- | --- |
| A | Product Assessment |
| B | Business Model |
| C | Market + Customer Assessment |
| D | Finance Management Assessment |
| E | Business Technical Capacity |
| F | Systems, Processes & Digital Capacity |
| G | Distribution Channel Assessments |
| H | Growth & Scalability Assessment |
| I | Access to Finance - Investment Readiness |
| J | Risk Assessment |
| K | Climate & ESG Assessment |
| L | Impact |

Note: the Excel outline has duplicate/misaligned letters in a few places. The implementation should normalize the product codes to A-L consistently while preserving the original row labels in an import/audit field.

## 3. Current app gap

The current implementation is useful as a first draft, but it does not match the client expectation.

Current behavior:

- Admin/oversight selects a business under `/admin/cna`.
- Admin scores only twelve broad A-L focus areas.
- Numeric scores `0`, `5`, and `10` are visible in the form.
- One saved diagnostic stores one score per focus area in `cna_scores`.
- CDP imports focus-area scores from the latest CNA.

Required behavior:

- Each role logs in and sees their own CNA workspace.
- Each role selects a business/application and reviews only the questions assigned to that role.
- Reviewers never see numeric scores. They only choose `Poor`, `Fair`, or `Great`.
- The system calculates hidden numeric values:
  - `Poor = 0`
  - `Fair = half of that question's weight`
  - `Great = full question weight`
- Every diagnostic section totals to `100%`, regardless of how many questions are in that section.
- Admin sees the final consolidated CNA for every business, including role completion status, section totals, gap questions, reasons/comments, and the final CDP inputs.

## 4. Scoring model

### 4.1 Question weight per section

Each section must equal `100%`.

Default rule:

```text
questionWeight = 100 / numberOfQuestionsInSection
```

Example:

If Product Assessment has 12 questions:

```text
each question weight = 100 / 12 = 8.3333
Poor = 0
Fair = 4.1667
Great = 8.3333
```

If a future imported template includes explicit question weights, we can support that, but phase 2 should begin with equal section weighting because that matches the user's requirement: "all questions in each section should equal to 100%".

### 4.2 Reviewer input

Reviewer-facing values:

- `Poor`
- `Fair`
- `Great`

Stored values:

- `ratingLabel`: `poor | fair | great`
- `rawScore`: calculated by the server
- `questionWeight`: frozen at submission time
- `comment`: reason/evidence note

The UI must hide `0`, `5`, `10`, percentages, and section totals from role reviewers unless the user is Admin/Oversight.

### 4.3 Section score

For each business and section:

```text
sectionScore = sum(responseScore for all questions in section)
sectionScorePercent = sectionScore / 100 * 100
```

Because every section totals to 100, the stored/displayed section score is already a percentage.

Priority bands:

- `0-40`: High priority / fix first
- `41-70`: Medium priority / fix next
- `71-100`: Low priority / maintain or amplify

The Excel legend uses `1-4`, `5-7`, `8-10`. For the new 100-point section model, this becomes equivalent to `0-40`, `41-70`, `71-100`.

### 4.4 Final CNA result

Admin dashboard should calculate:

```text
overallCnaScore = average(sectionScore for completed sections)
topRiskAreas = lowest scoring sections
roleCompletion = completed assigned questions / total assigned questions per role
gapQuestions = all questions rated Poor or Fair
```

Admin can see all computed scores. Role reviewers only see their own completion and submitted answers.

## 5. Data model changes

The current `cna_diagnostics` and `cna_scores` tables are area-level. Phase 2 needs question-level review records.

Recommended tables:

### 5.1 `cna_question_bank`

Stores the imported client questions.

Fields:

- `id`
- `sectionCode` A-L
- `sectionName`
- `questionText`
- `assignedRole`: `mentor | bds_edo | investment_analyst | mel | admin`
- `sourceRoleLabel`: original Excel value such as `BDS`, `TA`, `IA`, `MEAL`
- `sourceSheet`
- `sourceRow`
- `sortOrder`
- `isActive`
- `createdAt`
- `updatedAt`

### 5.2 `cna_assessments`

One CNA assessment per business/application cycle.

Fields:

- `id`
- `businessId`
- `applicationId` nullable if CNA is business-level only
- `status`: `draft | in_progress | submitted | locked | archived`
- `createdById`
- `submittedAt`
- `lockedAt`
- `createdAt`
- `updatedAt`

### 5.3 `cna_role_reviews`

Tracks each role's contribution to an assessment.

Fields:

- `id`
- `assessmentId`
- `role`: `mentor | bds_edo | investment_analyst | mel`
- `reviewerId`
- `status`: `not_started | in_progress | submitted | returned`
- `startedAt`
- `submittedAt`
- `adminReturnNote`
- `createdAt`
- `updatedAt`

Unique constraint:

- `assessmentId + role`

### 5.4 `cna_question_responses`

Stores actual answers.

Fields:

- `id`
- `assessmentId`
- `roleReviewId`
- `questionId`
- `ratingLabel`: `poor | fair | great`
- `questionWeight`
- `scoreValue`
- `comment`
- `evidenceUrl` optional
- `answeredById`
- `answeredAt`
- `createdAt`
- `updatedAt`

Unique constraint:

- `assessmentId + questionId`

Important: calculate `scoreValue` on the server. Do not trust the browser to submit numeric scores.

### 5.5 `cna_section_results`

Optional cached table for performance and audit. Can also be computed live.

Fields:

- `assessmentId`
- `sectionCode`
- `sectionName`
- `totalQuestions`
- `answeredQuestions`
- `sectionScore`
- `priorityLevel`
- `computedAt`

### 5.6 CDP links

Update CDP to link to the new assessment:

- Add `linkedCnaAssessmentId` to `capacity_development_plans`.
- Keep `linkedCnaDiagnosticId` temporarily for backward compatibility.
- Generate CDP gaps from question-level `Poor` and `Fair` responses instead of only area-level A-L scores.

## 6. Role-specific interfaces

### 6.1 Shared login routing

After login:

- `mentor` goes to `/mentor/cna`
- `bds_edo` goes to `/bds/cna` or `/edo/cna`
- `investment_analyst` goes to `/investment/cna`
- `admin` and `oversight` go to `/admin/cna`

The current `userRoleEnum` does not include these phase 2 roles. Add the new roles or introduce a separate staff role/permission table.

### 6.2 Mentor interface

Flow:

1. Mentor logs in.
2. Mentor sees assigned/available businesses.
3. Mentor selects a business/application.
4. Mentor sees only `mentor`/`TA` questions.
5. Mentor selects `Poor`, `Fair`, or `Great` for each question.
6. Mentor adds comments where useful or required.
7. Mentor submits their review.

Mentor must not see:

- numeric score values
- other roles' incomplete answers
- admin-only final weighted results

### 6.3 BDS / EDO interface

Same workflow as Mentor, but filtered to `bds_edo` questions.

This role likely has the largest question set and should have section tabs, progress by section, and autosave/draft support.

### 6.4 Investment analyst interface

Same workflow, filtered to `investment_analyst`/`IA` questions.

The interface should prioritize:

- financial readiness
- investment readiness
- records and controls
- funding need and repayment/absorption capacity
- risk and investor-facing gaps

### 6.5 Admin interface

Admin sees the full result for each business:

- all businesses/applications
- CNA status per role
- each section score out of 100
- overall score
- top risk areas
- all Poor/Fair gap questions
- reviewer comments
- missing reviewer inputs
- action to return a role review for changes
- action to lock/finalize the CNA
- action to generate or update the CDP

Admin is the only role that should see the final computed scoring.

## 7. CDP generation from CNA

CDP should be built from the final CNA gaps.

### 7.1 Gap extraction

When Admin finalizes CNA:

```text
gapQuestions = all CNA responses where ratingLabel is poor or fair
```

For each gap, create a CDP recommendation candidate:

- section code
- section name
- question text
- rating label
- reviewer comment
- recommended intervention
- responsible role/staff
- target date
- priority

### 7.2 Priority rule

Question priority:

- `Poor`: high priority
- `Fair`: medium priority
- `Great`: no required intervention

Section priority:

- based on section score bands described above.

### 7.3 CDP focus summaries

Current `cdp_focus_summary` can remain but should be populated from calculated section results:

- `focusCode`
- `score0to10` can be replaced or supplemented with `scorePercent`
- `keyGaps` should summarize all Poor/Fair questions in that section
- `recommendedIntervention` should be seeded from the Curriculum and admin-editable

### 7.4 CDP activities

For each high or medium priority gap, Admin can convert the recommendation into one or more CDP activities:

- gap/challenge
- intervention
- support type
- delivery method
- responsible staff
- target date
- linked question IDs

### 7.5 OKRs and milestones

Use the workbook's `Business Support OKRs` and `WorkplanWeekly Milestone Tracke` as the product model:

- Objective
- Key result
- Weight
- Target outcome
- Achieved outcome
- Final score
- Weighted score
- Weekly milestone/action
- Deadline
- Status
- Progress
- Evidence

OKR validation:

```text
sum(keyResultWeights for objective) must equal 100%
weightedScore = finalScore * weight
```

For numeric outcomes:

```text
finalScore = achievedOutcome / targetOutcome
```

Cap final score at `100%` unless Admin explicitly allows overachievement.

## 8. Implementation steps

### Step 1: Confirm role names and permissions

Decide exact internal role slugs:

- `mentor`
- `bds_edo`
- `investment_analyst`
- `mel`
- `admin`
- `oversight`

Update auth/profile role handling so these roles can log in and be routed to the right workspace.

### Step 2: Import the CNA question bank

Create a seed/import script that reads the Excel or a curated JSON/TS file derived from it.

Import fields:

- normalized section code A-L
- section name
- question text
- source role label
- product role
- source sheet
- source row
- sort order

The imported question bank must be stable and editable through code first. Admin UI editing can come later.

### Step 3: Add database migration

Add tables:

- `cna_question_bank`
- `cna_assessments`
- `cna_role_reviews`
- `cna_question_responses`
- optionally `cna_section_results`

Add role enums or permission fields.

Keep old CNA tables during transition.

### Step 4: Build server-side scoring engine

Create a CNA scoring module that:

- groups questions by section
- calculates equal question weight per section
- maps labels to hidden scores
- calculates section totals out of 100
- calculates overall score
- identifies high/medium/low priority sections
- extracts Poor/Fair gap questions
- reports role completion status

Add tests for:

- sections always total 100
- Poor/Fair/Great score mapping
- mixed-role questions in one section
- missing answers
- duplicate responses
- final admin result

### Step 5: Build role CNA pages

Create reusable role review components:

- business/application selector
- section tabs
- question card/table
- rating control with `Poor`, `Fair`, `Great`
- comment/evidence fields
- save draft
- submit role review
- completion progress

Routes:

- `/mentor/cna`
- `/mentor/cna/[businessId]`
- `/bds/cna`
- `/bds/cna/[businessId]`
- `/investment/cna`
- `/investment/cna/[businessId]`

### Step 6: Rebuild Admin CNA dashboard

Update `/admin/cna` and `/admin/cna/[businessId]` to show:

- assessment status
- role review status
- missing questions by role
- section scores out of 100
- hidden raw response details visible only to Admin
- gap list grouped by section and role
- finalize/lock CNA action
- generate CDP action

### Step 7: Connect CNA to CDP

Update CDP actions so the CDP imports from the finalized question-level CNA.

Generated CDP should include:

- section score summaries
- key gaps from Poor/Fair question responses
- recommended interventions
- responsible staff role
- target dates
- draft activities

### Step 8: Upgrade CDP OKRs and workplan

Align current CDP workspace with the workbook:

- objective and key result editor
- KR weights total validation
- achieved vs target outcome scoring
- weighted score calculation
- weekly milestone tracker
- status and progress evidence fields
- export-ready summary

### Step 9: Backward compatibility and migration

Existing `cna_diagnostics`/`cna_scores` records should remain readable.

Migration approach:

1. Keep old history display.
2. Add new question-level assessment flow for all new CNA work.
3. Allow CDP import from old CNA only if no new finalized assessment exists.
4. Once stable, mark old A-L area-level form as deprecated.

### Step 10: Acceptance testing

Acceptance checks:

- Mentor can log in, select a business, and answer only mentor questions.
- BDS / EDO can answer only BDS / EDO questions.
- Investment analyst can answer only investment analyst questions.
- Reviewers never see numeric scores.
- Admin can see all businesses and the final consolidated CNA.
- Every section calculates to a maximum of 100%.
- Poor = 0, Fair = half weight, Great = full weight.
- Admin can generate a CDP from Poor/Fair gaps.
- CDP OKR weights validate to 100% per objective.
- Weekly milestones can track progress and evidence.

## 9. Suggested build order

1. Add role slugs and routing.
2. Add question bank seed from the Excel structure.
3. Add new CNA tables and scoring engine.
4. Build the shared role review UI.
5. Build Mentor, BDS / EDO, and Investment Analyst pages using the shared UI.
6. Rebuild Admin CNA result page.
7. Connect finalized CNA to CDP generation.
8. Upgrade CDP OKR and milestone calculations.
9. Add tests and remove/deprecate the old broad A-L scoring form.

## 10. Open decisions

1. Should `TA` from the workbook map fully to `mentor`, or should there be a separate `technical_advisor` role?
2. Should `MEAL` questions be handled by Admin for now or exposed as a separate MEL role?
3. Should businesses be available to all reviewers of a role, or assigned to specific staff users?
4. Should comments be mandatory for Poor and Fair responses, or optional for all responses? The current app requires reasons for 0 and 5; keeping that rule is recommended.
5. Should Admin be able to override role responses after finalization, or only return a review to the original reviewer?

## 11. Definition of done

Phase 2 CNA/CDP is complete when:

- The client question bank from the Excel outline is represented in the system.
- Mentor, BDS / EDO, and Investment Analyst each have their own role-filtered CNA interface.
- Reviewers score with only Poor/Fair/Great.
- Numeric scoring is server-calculated and hidden from role reviewers.
- Each section totals to 100%.
- Admin sees the final consolidated CNA result for every business.
- CDP generation uses actual question-level CNA gaps.
- OKRs and weekly milestones follow the workbook structure.
- Old area-level CNA is no longer the primary workflow.
