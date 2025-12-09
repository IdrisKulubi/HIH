import {
  pgTable,
  serial,
  varchar,
  timestamp,
  boolean,
  integer,
  text,
  date,
  pgEnum,
  decimal,
  primaryKey,
  index
} from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

import { relations } from "drizzle-orm";

// Enums
export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);
export const educationLevelEnum = pgEnum('education_level', [
  'primary_school_and_below',
  'high_school',
  'technical_college',
  'undergraduate',
  'postgraduate'
]);

export const countryEnum = pgEnum('country', [
  'ghana',
  'kenya',
  'nigeria',
  'rwanda',
  'tanzania'
]);

export const userRoleEnum = pgEnum('user_role', [
  'applicant',
  'admin',
  'technical_reviewer'
]);

export const fundingSourceEnum = pgEnum('funding_source', [
  'high_net_worth_individual',
  'financial_institutions',
  'government_agency',
  'local_or_international_ngo',
  'other'
]);

export const fundingInstrumentEnum = pgEnum('funding_instrument', [
  'debt',
  'equity',
  'quasi',
  'other'
]);

export const customerSegmentEnum = pgEnum('customer_segment', [
  'household_individuals',
  'micro_small_medium_enterprises',
  'institutions',
  'corporates',
  'government_and_ngos',
  'other'
]);

export const applicationStatusEnum = pgEnum('application_status', [
  'draft',
  'submitted',
  'under_review',
  'pending_senior_review',
  'shortlisted',
  'scoring_phase',
  'dragons_den',
  'finalist',
  'approved',
  'rejected'
]);

export const supportCategoryEnum = pgEnum('support_category', [
  'technical_issue',
  'application_help',
  'account_problem',
  'payment_issue',
  'feature_request',
  'bug_report',
  'general_inquiry',
  'other'
]);

export const supportPriorityEnum = pgEnum('support_priority', [
  'low',
  'medium',
  'high',
  'urgent'
]);

export const supportStatusEnum = pgEnum('support_status', [
  'open',
  'in_progress',
  'waiting_for_user',
  'resolved',
  'closed'
]);

export const feedbackCampaignStatusEnum = pgEnum('feedback_campaign_status', [
  'draft',
  'scheduled',
  'sending',
  'completed',
  'failed'
]);

export const feedbackEmailStatusEnum = pgEnum('feedback_email_status', [
  'pending',
  'sending',
  'sent',
  'failed',
  'bounced'
]);

export const kenyaCountyEnum = pgEnum('kenya_county', [
  'baringo', 'bomet', 'bungoma', 'busia', 'elgeyo_marakwet', 'embu', 'garissa', 'homa_bay', 'isiolo', 'kajiado',
  'kakamega', 'kericho', 'kiambu', 'kilifi', 'kirinyaga', 'kisii', 'kisumu', 'kitui', 'kwale', 'laikipia',
  'lamu', 'machakos', 'makueni', 'mandera', 'marsabit', 'meru', 'migori', 'mombasa', 'muranga', 'nairobi',
  'nakuru', 'nandi', 'narok', 'nyamira', 'nyandarua', 'nyeri', 'samburu', 'siaya', 'taita_taveta', 'tana_river',
  'tharaka_nithi', 'trans_nzoia', 'turkana', 'uasin_gishu', 'vihiga', 'wajir', 'west_pokot'
]);

export const businessSectorEnum = pgEnum('business_sector', [
  'agriculture_and_agribusiness',
  'manufacturing',
  'renewable_energy',
  'water_management',
  'waste_management',
  'forestry',
  'tourism',
  'transport',
  'construction',
  'ict',
  'trade',
  'healthcare',
  'education',
  'other'
]);

export const revenueBandEnum = pgEnum('revenue_band', [
  'below_500k',
  '500k_to_3m',
  '3m_to_10m',
  '10m_to_50m',
  'above_50m'
]);

export const applicationTrackEnum = pgEnum('application_track', [
  'foundation',
  'acceleration'
]);

export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'verified',
  'rejected',
  'needs_info'
]);

// Tables


// First define all tables
export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    email: text("email").notNull().unique(),
    password: text("password"), // For email/password authentication
    role: text("role").$type<"user" | "admin">().default("user"),
    emailVerified: timestamp("emailVerified"),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastActive: timestamp("last_active").defaultNow().notNull(),
    isOnline: boolean("is_online").default(false),
    profilePhoto: text("profile_photo"),
    phoneNumber: text("phone_number"),
  },
  (table) => ({
    emailIdx: index("user_email_idx").on(table.email),
    createdAtIdx: index("user_created_at_idx").on(table.createdAt),
    lastActiveIdx: index("user_last_active_idx").on(table.lastActive),
  })
);

// User Profiles table for extended user information
export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('applicant').notNull(),
  profileImage: text('profile_image'),
  phoneNumber: varchar('phone_number', { length: 20 }),
  country: varchar('country', { length: 100 }),
  organization: text('organization'),
  bio: text('bio'),
  isCompleted: boolean('is_completed').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index("user_profiles_user_id_idx").on(table.userId),
  emailIdx: index("user_profiles_email_idx").on(table.email),
  roleIdx: index("user_profiles_role_idx").on(table.role),
}));

// Auth.js tables
export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// Email verification codes table for custom email verification
export const emailVerificationCodes = pgTable(
  "email_verification_codes",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    code: text("code").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    isUsed: boolean("is_used").default(false),
    attempts: integer("attempts").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("email_verification_codes_email_idx").on(table.email),
    codeIdx: index("email_verification_codes_code_idx").on(table.code),
    expiresAtIdx: index("email_verification_codes_expires_at_idx").on(table.expiresAt),
  })
);


export const applicants = pgTable('applicants', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),

  // Applicant Details (from form)
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  idPassportNumber: varchar('id_passport_number', { length: 50 }).notNull(),
  gender: genderEnum('gender').notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  email: varchar('email', { length: 100 }).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const businesses = pgTable('businesses', {
  id: serial('id').primaryKey(),
  applicantId: integer('applicant_id').notNull().references(() => applicants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),

  // === ELIGIBILITY FIELDS ===
  isRegistered: boolean('is_registered').notNull(),
  registrationCertificateUrl: varchar('registration_certificate_url', { length: 500 }),
  sector: businessSectorEnum('sector').notNull(),
  sectorOther: text('sector_other'),
  description: text('description').notNull(),
  problemSolved: text('problem_solved').notNull(),

  country: countryEnum('country').notNull(),
  county: kenyaCountyEnum('county'),
  city: varchar('city', { length: 100 }).notNull(),

  yearsOperational: integer('years_operational').notNull(),
  hasFinancialRecords: boolean('has_financial_records').notNull(),
  financialRecordsUrl: varchar('financial_records_url', { length: 500 }),
  hasAuditedAccounts: boolean('has_audited_accounts').notNull(),
  auditedAccountsUrl: varchar('audited_accounts_url', { length: 500 }),

  // === FOUNDATION TRACK: COMMERCIAL VIABILITY (20 marks) ===
  revenueLastYear: decimal('revenue_last_year', { precision: 12, scale: 2 }).notNull(), // >2M=10, 1-2M=5, 500k-1M=2
  customerCount: integer('customer_count'), // >401=10, 200-400=5, 1-200=2
  hasExternalFunding: boolean('has_external_funding'), // Yes=10, No=5

  // === FOUNDATION TRACK: BUSINESS MODEL (10 marks) ===
  businessModelInnovation: text('business_model_innovation'), // New=10, Relatively New=5, Existing=2

  // === FOUNDATION TRACK: MARKET POTENTIAL (30 marks) ===
  relativePricing: text('relative_pricing'), // Lower=7, Equal=4, Higher=1
  productDifferentiation: text('product_differentiation'), // New=8, Relatively New=5, Existing=2
  threatOfSubstitutes: text('threat_of_substitutes'), // Low=7, Moderate=4, High=0
  easeOfMarketEntry: text('ease_of_market_entry'), // Low=8, Moderate=5, High=1

  // === FOUNDATION TRACK: SOCIAL IMPACT (40 marks) ===
  environmentalImpact: text('environmental_impact'), // Clearly Defined=15, Neutral=10, Not Defined=5
  specialGroupsEmployed: integer('special_groups_employed'), // Women, Youth, PWD: >10=15, 6-9=10, 5=5
  businessCompliance: text('business_compliance'), // Fully=10, Partially=3, Not Clear=1

  // === ACCELERATION TRACK: REVENUES (20 marks) ===
  // revenueLastYear reused: >5M=5, 3.5-5M=3, 3-3.5M=1
  // yearsOperational reused: >4=5, >3=3, 2=1
  futureSalesGrowth: text('future_sales_growth'), // High=5, Moderate=3, Low=1
  // hasExternalFunding reused: Yes=5, No=1

  // === ACCELERATION TRACK: IMPACT POTENTIAL (20 marks) ===
  currentSpecialGroupsEmployed: integer('current_special_groups_employed'), // >10=10, 6-9=6, 5=3
  jobCreationPotential: text('job_creation_potential'), // High=10, Moderate=6, Low=3

  // === ACCELERATION TRACK: SCALABILITY (20 marks) ===
  marketDifferentiation: text('market_differentiation'), // Truly Unique=5, Provably Better=3, Undifferentiated=1
  competitiveAdvantage: text('competitive_advantage'), // High=5, Moderate=3, Low=1
  offeringFocus: text('offering_focus'), // Outcome=5, Solution=3, Feature=1
  salesMarketingIntegration: text('sales_marketing_integration'), // Fully Integrated=5, Aligned=3, No Alignment=1

  // === ACCELERATION TRACK: SOCIAL IMPACT (20 marks) ===
  socialImpactHousehold: text('social_impact_household'), // High=6, Moderate=4, None=0
  supplierInvolvement: text('supplier_involvement'), // Direct=6, Network=3, None=1
  // environmentalImpact reused: High=6, Moderate=4, Low=0

  // === ACCELERATION TRACK: BUSINESS MODEL (20 marks) ===
  businessModelUniqueness: text('business_model_uniqueness'), // High=7, Moderate=3, Low=1
  customerValueProposition: text('customer_value_proposition'), // High=7, Moderate=3, Low=1
  competitiveAdvantageStrength: text('competitive_advantage_strength'), // High=6, Moderate=3, Low=1

  // === DOCUMENT UPLOADS ===
  salesEvidenceUrl: varchar('sales_evidence_url', { length: 500 }),
  photosUrl: varchar('photos_url', { length: 500 }),
  taxComplianceUrl: varchar('tax_compliance_url', { length: 500 }),
  fundingDetails: text('funding_details'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});



export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  businessId: integer('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  track: applicationTrackEnum('track'),
  status: applicationStatusEnum('status').default('draft').notNull(),
  referralSource: varchar('referral_source', { length: 100 }),
  referralSourceOther: varchar('referral_source_other', { length: 100 }),
  submittedAt: timestamp('submitted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const eligibilityResults = pgTable('eligibility_results', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }).unique(),
  scoringConfigId: integer('scoring_config_id'),  // Link to scoring configuration used
  isEligible: boolean('is_eligible').notNull(),
  ageEligible: boolean('age_eligible').notNull(),
  registrationEligible: boolean('registration_eligible').notNull(),
  revenueEligible: boolean('revenue_eligible').notNull(),
  businessPlanEligible: boolean('business_plan_eligible').notNull(),
  impactEligible: boolean('impact_eligible').notNull(),
  marketPotentialScore: integer('market_potential_score'),
  innovationScore: integer('innovation_score'),
  climateAdaptationScore: integer('climate_adaptation_score'),
  jobCreationScore: integer('job_creation_score'),
  viabilityScore: integer('viability_score'),
  managementCapacityScore: integer('management_capacity_score'),
  locationBonus: integer('location_bonus'),
  genderBonus: integer('gender_bonus'),

  // New dynamic scoring fields
  customScores: text('custom_scores'), // JSON field for flexible scoring

  totalScore: integer('total_score'),
  evaluationNotes: text('evaluation_notes'),
  evaluatedAt: timestamp('evaluated_at').defaultNow().notNull(),
  evaluatedBy: text('evaluated_by'),

  // Two-tier review system fields
  // Reviewer 1 (Initial Review)
  reviewer1Id: text('reviewer1_id'),
  reviewer1Score: integer('reviewer1_score'),
  reviewer1Notes: text('reviewer1_notes'),
  reviewer1At: timestamp('reviewer1_at'),

  // Reviewer 2 (Senior Review)
  reviewer2Id: text('reviewer2_id'),
  reviewer2Score: integer('reviewer2_score'),
  reviewer2Notes: text('reviewer2_notes'),
  reviewer2At: timestamp('reviewer2_at'),
  reviewer2OverrodeReviewer1: boolean('reviewer2_overrode_reviewer1').default(false),

  // Locking mechanism
  isLocked: boolean('is_locked').default(false),
  lockedBy: text('locked_by'),
  lockedAt: timestamp('locked_at'),
  lockReason: text('lock_reason'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// New tables for configurable scoring system
export const scoringConfigurations = pgTable('scoring_configurations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  version: varchar('version', { length: 50 }).notNull().default('1.0'),
  isActive: boolean('is_active').default(false),
  isDefault: boolean('is_default').default(false),
  totalMaxScore: integer('total_max_score').notNull().default(100),
  passThreshold: integer('pass_threshold').notNull().default(60),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const scoringCriteria = pgTable('scoring_criteria', {
  id: serial('id').primaryKey(),
  configId: integer('config_id').notNull().references(() => scoringConfigurations.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 100 }).notNull(), // e.g., "Innovation and Climate Adaptation Focus"
  name: text('name').notNull(), // e.g., "Demonstratable Climate Adaptation Benefits"
  description: text('description'),
  maxPoints: integer('max_points').notNull(),
  weightage: decimal('weightage', { precision: 5, scale: 2 }), // Percentage weight in category
  scoringLevels: text('scoring_levels'), // JSON: [{level: "Limited", points: 0, description: "..."}, ...]
  evaluationType: varchar('evaluation_type', { length: 50 }).default('manual'), // 'manual', 'auto', 'hybrid'
  sortOrder: integer('sort_order').default(0),
  isRequired: boolean('is_required').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const applicationScores = pgTable('application_scores', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  criteriaId: integer('criteria_id').notNull().references(() => scoringCriteria.id, { onDelete: 'cascade' }),
  configId: integer('config_id').notNull().references(() => scoringConfigurations.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  maxScore: integer('max_score').notNull(),
  level: varchar('level', { length: 100 }), // e.g., "Strong Capacity", "Moderate", etc.
  notes: text('notes'),
  evaluatedBy: text('evaluated_by'),
  evaluatedAt: timestamp('evaluated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Table to track re-evaluation history
export const evaluationHistory = pgTable('evaluation_history', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  previousConfigId: integer('previous_config_id'),
  newConfigId: integer('new_config_id').notNull().references(() => scoringConfigurations.id),
  previousTotalScore: integer('previous_total_score'),
  newTotalScore: integer('new_total_score'),
  previousIsEligible: boolean('previous_is_eligible'),
  newIsEligible: boolean('new_is_eligible'),
  changeReason: text('change_reason'),
  evaluatedBy: text('evaluated_by').notNull(),
  evaluatedAt: timestamp('evaluated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const applicationVerifications = pgTable('application_verifications', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  verifierId: text('verifier_id').notNull().references(() => users.id),
  status: verificationStatusEnum('status').default('pending').notNull(),
  comments: text('comments'),
  reviewedAt: timestamp('reviewed_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Support system tables
export const supportTickets = pgTable('support_tickets', {
  id: serial('id').primaryKey(),
  ticketNumber: varchar('ticket_number', { length: 20 }).notNull().unique(), // e.g., "TKT-2024-001"
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: supportCategoryEnum('category').notNull(),
  priority: supportPriorityEnum('priority').default('medium').notNull(),
  status: supportStatusEnum('status').default('open').notNull(),
  subject: text('subject').notNull(),
  description: text('description').notNull(),
  userEmail: varchar('user_email', { length: 255 }).notNull(),
  userName: text('user_name').notNull(),
  attachmentUrl: varchar('attachment_url', { length: 500 }), // Optional file attachment
  assignedTo: text('assigned_to').references(() => users.id), // Admin user assigned to ticket
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: text('resolved_by').references(() => users.id),
  resolutionNotes: text('resolution_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  ticketNumberIdx: index("support_tickets_ticket_number_idx").on(table.ticketNumber),
  userIdIdx: index("support_tickets_user_id_idx").on(table.userId),
  statusIdx: index("support_tickets_status_idx").on(table.status),
  categoryIdx: index("support_tickets_category_idx").on(table.category),
  priorityIdx: index("support_tickets_priority_idx").on(table.priority),
  createdAtIdx: index("support_tickets_created_at_idx").on(table.createdAt),
}));

export const supportResponses = pgTable('support_responses', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
  responderId: text('responder_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  responderName: text('responder_name').notNull(),
  responderRole: varchar('responder_role', { length: 50 }).notNull(), // 'user', 'admin', 'support'
  message: text('message').notNull(),
  attachmentUrl: varchar('attachment_url', { length: 500 }), // Optional file attachment
  isInternal: boolean('is_internal').default(false), // Internal notes not visible to user
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  ticketIdIdx: index("support_responses_ticket_id_idx").on(table.ticketId),
  responderIdIdx: index("support_responses_responder_id_idx").on(table.responderId),
  createdAtIdx: index("support_responses_created_at_idx").on(table.createdAt),
}));

// Relations
export const applicantRelations = relations(applicants, ({ one, many }) => ({
  user: one(users, {
    fields: [applicants.userId],
    references: [users.id]
  }),
  businesses: many(businesses)
}));

export const businessRelations = relations(businesses, ({ one, many }) => ({
  applicant: one(applicants, {
    fields: [businesses.applicantId],
    references: [applicants.id]
  }),
  applications: many(applications)
}));



export const applicationRelations = relations(applications, ({ one, many }) => ({
  business: one(businesses, {
    fields: [applications.businessId],
    references: [businesses.id]
  }),
  eligibilityResults: many(eligibilityResults)
}));

export const eligibilityResultsRelations = relations(eligibilityResults, ({ one }) => ({
  application: one(applications, {
    fields: [eligibilityResults.applicationId],
    references: [applications.id]
  }),
  evaluator: one(users, {
    fields: [eligibilityResults.evaluatedBy],
    references: [users.id]
  })
}));

export const userRelations = relations(users, ({ one, many }) => ({
  userProfile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId]
  }),
  applicant: one(applicants, {
    fields: [users.id],
    references: [applicants.userId]
  }),
  evaluations: many(eligibilityResults, { relationName: "evaluator" }),
  scoringConfigurations: many(scoringConfigurations),
  applicationScores: many(applicationScores),
  evaluationHistory: many(evaluationHistory)
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id]
  })
}));

// New relations for scoring system
export const scoringConfigurationsRelations = relations(scoringConfigurations, ({ one, many }) => ({
  creator: one(users, {
    fields: [scoringConfigurations.createdBy],
    references: [users.id]
  }),
  criteria: many(scoringCriteria),
  applicationScores: many(applicationScores),
  evaluationHistory: many(evaluationHistory)
}));

export const scoringCriteriaRelations = relations(scoringCriteria, ({ one, many }) => ({
  configuration: one(scoringConfigurations, {
    fields: [scoringCriteria.configId],
    references: [scoringConfigurations.id]
  }),
  applicationScores: many(applicationScores)
}));

export const applicationScoresRelations = relations(applicationScores, ({ one }) => ({
  application: one(applications, {
    fields: [applicationScores.applicationId],
    references: [applications.id]
  }),
  criteria: one(scoringCriteria, {
    fields: [applicationScores.criteriaId],
    references: [scoringCriteria.id]
  }),
  configuration: one(scoringConfigurations, {
    fields: [applicationScores.configId],
    references: [scoringConfigurations.id]
  }),
  evaluator: one(users, {
    fields: [applicationScores.evaluatedBy],
    references: [users.id]
  })
}));

export const evaluationHistoryRelations = relations(evaluationHistory, ({ one }) => ({
  application: one(applications, {
    fields: [evaluationHistory.applicationId],
    references: [applications.id]
  }),
  previousConfig: one(scoringConfigurations, {
    fields: [evaluationHistory.previousConfigId],
    references: [scoringConfigurations.id]
  }),
  newConfig: one(scoringConfigurations, {
    fields: [evaluationHistory.newConfigId],
    references: [scoringConfigurations.id]
  })
}));

export const applicationVerificationsRelations = relations(applicationVerifications, ({ one }) => ({
  application: one(applications, {
    fields: [applicationVerifications.applicationId],
    references: [applications.id]
  }),
  verifier: one(users, {
    fields: [applicationVerifications.verifierId],
    references: [users.id]
  })
}));

// Support system relations
export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id]
  }),
  assignedToUser: one(users, {
    fields: [supportTickets.assignedTo],
    references: [users.id]
  }),
  resolvedByUser: one(users, {
    fields: [supportTickets.resolvedBy],
    references: [users.id]
  }),
  responses: many(supportResponses)
}));

export const supportResponsesRelations = relations(supportResponses, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [supportResponses.ticketId],
    references: [supportTickets.id]
  }),
  responder: one(users, {
    fields: [supportResponses.responderId],
    references: [users.id]
  })
}));

// Feedback email campaign system
export const feedbackCampaigns = pgTable('feedback_campaigns', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: text('subject').notNull(),
  emailBody: text('email_body').notNull(), // HTML content
  feedbackFormUrl: text('feedback_form_url').notNull(),
  linkDisplayText: varchar('link_display_text', { length: 100 }).default('Share Your Feedback'),
  status: feedbackCampaignStatusEnum('status').default('draft').notNull(),
  batchSize: integer('batch_size').default(5).notNull(),
  totalRecipients: integer('total_recipients').default(0),
  sentCount: integer('sent_count').default(0),
  failedCount: integer('failed_count').default(0),
  createdBy: text('created_by').notNull().references(() => users.id),
  scheduledAt: timestamp('scheduled_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  statusIdx: index("feedback_campaigns_status_idx").on(table.status),
  createdByIdx: index("feedback_campaigns_created_by_idx").on(table.createdBy),
  createdAtIdx: index("feedback_campaigns_created_at_idx").on(table.createdAt),
}));

export const feedbackEmails = pgTable('feedback_emails', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').notNull().references(() => feedbackCampaigns.id, { onDelete: 'cascade' }),
  recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
  recipientName: varchar('recipient_name', { length: 255 }).notNull(),
  status: feedbackEmailStatusEnum('status').default('pending').notNull(),
  batchNumber: integer('batch_number').notNull(),
  sentAt: timestamp('sent_at'),
  failedAt: timestamp('failed_at'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  responded: boolean('responded').default(false),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  campaignIdIdx: index("feedback_emails_campaign_id_idx").on(table.campaignId),
  statusIdx: index("feedback_emails_status_idx").on(table.status),
  recipientEmailIdx: index("feedback_emails_recipient_email_idx").on(table.recipientEmail),
  batchNumberIdx: index("feedback_emails_batch_number_idx").on(table.batchNumber),
}));

// Feedback campaign relations
export const feedbackCampaignsRelations = relations(feedbackCampaigns, ({ one, many }) => ({
  creator: one(users, {
    fields: [feedbackCampaigns.createdBy],
    references: [users.id]
  }),
  emails: many(feedbackEmails)
}));

export const feedbackEmailsRelations = relations(feedbackEmails, ({ one }) => ({
  campaign: one(feedbackCampaigns, {
    fields: [feedbackEmails.campaignId],
    references: [feedbackCampaigns.id]
  })
}));
