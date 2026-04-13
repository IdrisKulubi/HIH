
# Phase 2 System Requirements & Schema Additions (BIRE Portal)

## 1. Overview

This document defines the technical requirements and database schema additions for Phase 2 of the BIRE Integrated Enterprise Support Management System. It builds upon the existing Application, Due Diligence, and A2F modules to introduce:

- Post-selection capacity building
- Strict mentorship tracking
- Programmatic monitoring

## 2. Gap Analysis of Existing Schema

**What is currently implemented well:**

- **User Management & Roles**: `users`, `userProfiles`
- **Application Intake & Two-Tier Scoring**: `applications`, `eligibilityResults`, `applicationScores`
- **Due Diligence Tracking**: `dueDiligenceRecords`
- **A2F Pipeline & Contracting**: `a2fPipeline`, `grantAgreements`, `disbursementsAndRepayments`

**What needs to be added (Phase 2):**

- **Capacity Needs Assessment (CNA)**: Tables to store algorithmic diagnostic scores and track Business Development Services (BDS) interventions.
- **Mentorship State Machine**: Tables to enforce the strict 6-session logic, track physical vs. virtual sessions, and gatekeep using evidence/photos.
- **M&E and AI Analytics**: Tables to log baseline/endline metrics, resilience scores, and AI-generated query logs.
- **Kajabi LMS Integration**: Tables to map BIRE users to Kajabi IDs and store incoming webhook progress data.

## 3. Functional Requirements

### 3.1 Capacity Needs Assessment (CNA) & Gap Analysis

- **Diagnostic Engine**: R/EDOs must be able to input scores across various business dimensions (e.g., Financial Health, Market Reach).
- **Algorithmic Gap Ranking**: The system must automatically identify and rank the top 3 weaknesses of the enterprise.
- **Intervention Tracking**: Ability to assign and track specific BDS interventions (e.g., "Financial Literacy Training") based on the gap analysis.

### 3.2 Mentorship Lifecycle Management (Strict State Machine)

- **Mentor Profiles**: System to onboard external mentors and tag them with industry expertise.
- **Strict 6-Session Enforcement**:  
  - Session 1 & 6 must be Physical.
  - Sessions 2-5 must be Virtual.
- **Evidence Gatekeeping**: R/EDOs or Mentors cannot mark a physical session "Complete" without uploading photographic evidence and diagnostic notes.
- **Action Tracking**: Enterprises must update whether they implemented agreed-upon actions before the next session unlocks.

### 3.3 M&E and AI Analytics Engine

- **Metric Tracking**: Automated calculation of the "Enterprise Resilience Score" and "Market Expansion Index" based on periodic data inputs.
- **Survey Integration**: Ability to link businesses to Baseline and Endline surveys.

### 3.4 Kajabi Integration

- **User Mapping**: Map local BIRE `userId` to Kajabi's `external_user_id`.
- **Webhook Listener**: Capture course enrollment, progress, and completion events sent from Kajabi to reflect LMS progress within the BIRE portal.

## 4. Drizzle ORM Schema Additions

Add these enums and tables to your existing `schema.ts` file.

### Enums to Add

```typescript
export const sessionTypeEnum = pgEnum('session_type', ['physical', 'virtual']);
export const sessionStatusEnum = pgEnum('session_status', ['scheduled', 'completed', 'missed', 'rescheduled']);
export const bdsStatusEnum = pgEnum('bds_status', ['recommended', 'in_progress', 'completed', 'dropped']);
export const actionItemStatusEnum = pgEnum('action_item_status', ['pending', 'partial', 'completed']);
```

### Module 1: Mentorship State Machine

```typescript
export const mentors = pgTable('mentors', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expertiseArea: businessSectorEnum('expertise_area').notNull(),
  maxMentees: integer('max_mentees').default(3),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const mentorshipMatches = pgTable('mentorship_matches', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  mentorId: integer('mentor_id').notNull().references(() => mentors.id, { onDelete: 'cascade' }),
  status: text('status').default('active'), // active, completed, terminated
  startDate: timestamp('start_date').defaultNow().notNull(),
  endDate: timestamp('end_date'),
});

export const mentorshipSessions = pgTable('mentorship_sessions', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').notNull().references(() => mentorshipMatches.id, { onDelete: 'cascade' }),
  sessionNumber: integer('session_number').notNull(), // Strictly 1 through 6
  sessionType: sessionTypeEnum('session_type').notNull(), // Enforce: 1 & 6 = physical, 2-5 = virtual
  status: sessionStatusEnum('status').default('scheduled').notNull(),
  scheduledDate: timestamp('scheduled_date').notNull(),
  completedDate: timestamp('completed_date'),
  // Evidence Gatekeeping
  diagnosticNotes: text('diagnostic_notes'),
  photographicEvidenceUrl: varchar('photographic_evidence_url', { length: 500 }), // Required for physical
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const mentorshipActionItems = pgTable('mentorship_action_items', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull().references(() => mentorshipSessions.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  status: actionItemStatusEnum('status').default('pending').notNull(),
  enterpriseFeedback: text('enterprise_feedback'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Module 2: Capacity Needs Assessment (CNA) & BDS

```typescript
export const cnaDiagnostics = pgTable('cna_diagnostics', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  conductedById: text('conducted_by_id').references(() => users.id),
  // Dimension Scores (1-5 scale)
  financialManagementScore: integer('financial_management_score').notNull(),
  marketReachScore: integer('market_reach_score').notNull(),
  operationsScore: integer('operations_score').notNull(),
  complianceScore: integer('compliance_score').notNull(),
  // Algorithmic outputs
  topRiskArea: text('top_risk_area'), // Auto-calculated based on lowest score
  resilienceIndex: decimal('resilience_index', { precision: 5, scale: 2 }), // Auto-calculated
  conductedAt: timestamp('conducted_at').defaultNow().notNull(),
});

export const bdsInterventions = pgTable('bds_interventions', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  diagnosticId: integer('diagnostic_id').references(() => cnaDiagnostics.id),
  interventionName: text('intervention_name').notNull(),
  status: bdsStatusEnum('status').default('recommended').notNull(),
  providerName: text('provider_name'),
  completionDate: timestamp('completion_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Module 3: M&E and AI Reporting

```typescript
export const businessPerformanceMetrics = pgTable('business_performance_metrics', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  reportingPeriod: text('reporting_period').notNull(), // e.g., "Q1-2026"
  // Raw Data
  revenueGenerated: decimal('revenue_generated', { precision: 14, scale: 2 }),
  newJobsCreated: integer('new_jobs_created').default(0),
  newMarketsEntered: integer('new_markets_entered').default(0),
  // Auto-calculated Indices
  marketExpansionIndex: decimal('market_expansion_index', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Logs queries made by admins to the AI reporting engine
export const aiReportQueries = pgTable('ai_report_queries', {
  id: serial('id').primaryKey(),
  adminId: text('admin_id').notNull().references(() => users.id),
  queryText: text('query_text').notNull(),
  generatedSummary: text('generated_summary').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Module 4: Kajabi LMS Integration

```typescript
export const kajabiUserMapping = pgTable('kajabi_user_mapping', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kajabiExternalId: varchar('kajabi_external_id', { length: 255 }).notNull().unique(),
  hasActiveAccess: boolean('has_active_access').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Captures webhooks sent from Kajabi when an enterprise finishes a module
export const kajabiProgressWebhooks = pgTable('kajabi_progress_webhooks', {
  id: serial('id').primaryKey(),
  kajabiExternalId: varchar('kajabi_external_id', { length: 255 }).notNull(),
  courseId: varchar('course_id', { length: 255 }).notNull(),
  eventTitle: varchar('event_title', { length: 255 }).notNull(), // e.g., "Module 1 Completed"
  payload: jsonb('payload'), // Raw webhook data
  processedAt: timestamp('processed_at').defaultNow().notNull(),
});
```

## 5. Next Implementation Steps

- **Merge Schema**: Copy the above definitions into your `schema.ts` file and run `drizzle-kit push:pg` (or generate a migration) to update your Neon database.
- **API Routes (Mentorship)**: Build the server actions that block a user from creating Session 2 if Session 1 (physical) does not have a valid `photographicEvidenceUrl`.
- **Algorithmic Logic (CNA)**: Implement the math for the Capacity Needs Assessment server action to auto-populate the `resilienceIndex` and `topRiskArea` before writing to the database.
- **Kajabi Webhook Endpoint**: Set up a Next.js API route (`/api/webhooks/kajabi`) to receive JSON payloads from Kajabi and insert them into the `kajabiProgressWebhooks` table.
