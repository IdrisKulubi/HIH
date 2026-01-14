
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

import { relations, sql } from "drizzle-orm";

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
  'technical_reviewer',
  'reviewer_1',
  'reviewer_2'
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
  'submitted',
  'under_review',
  'pending_senior_review',
  'scoring_phase',
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

export const businessRegistrationTypeEnum = pgEnum('business_registration_type', [
  'limited_company',
  'partnership',
  'cooperative',
  'self_help_group_cbo',
  'sole_proprietorship',
  'other'
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
  dob: date('dob', { mode: "date" }).notNull(), // Added for age eligibility check
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
  registrationType: businessRegistrationTypeEnum('registration_type'),
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

  // === FOUNDATION TRACK: COMMERCIAL VIABILITY (30 marks) ===
  revenueLastYear: decimal('revenue_last_year', { precision: 12, scale: 2 }).notNull(),
  customerCount: integer('customer_count'),
  hasExternalFunding: boolean('has_external_funding'),
  externalFundingDetails: text('external_funding_details'), // List funders/amounts


  // === FOUNDATION TRACK: BUSINESS MODEL (10 marks) ===
  businessModelInnovation: text('business_model_innovation'),
  businessModelDescription: text('business_model_description'), // User explanation of their business model
  digitizationLevel: boolean('digitization_level'), // Yes/No for Foundation D4
  digitizationReason: text('digitization_reason'), // If No, why?

  // === FOUNDATION TRACK: MARKET POTENTIAL (30 marks) ===
  relativePricing: text('relative_pricing'),
  productDifferentiation: text('product_differentiation'),
  threatOfSubstitutes: text('threat_of_substitutes'),
  competitorOverview: text('competitor_overview'), // Brief overview of competitors
  easeOfMarketEntry: text('ease_of_market_entry'),

  // === FOUNDATION TRACK: SOCIAL IMPACT (30 marks) ===
  environmentalImpact: text('environmental_impact'), // Clearly defined, Minimal, Not defined
  environmentalImpactDescription: text('environmental_impact_description'), // Provide examples
  fullTimeEmployeesTotal: integer('full_time_employees_total'),
  fullTimeEmployeesWomen: integer('full_time_employees_women'),
  fullTimeEmployeesYouth: integer('full_time_employees_youth'),
  fullTimeEmployeesPwd: integer('full_time_employees_pwd'),
  businessCompliance: text('business_compliance'), // Fully, Partially, None
  complianceDocumentsUrl: varchar('compliance_documents_url', { length: 500 }),

  // === ACCELERATION TRACK: REVENUE & GROWTH (20 marks) ===
  // revenueLastYear reused
  // yearsOperational reused
  growthHistory: text('growth_history'),
  averageAnnualRevenueGrowth: text('average_annual_revenue_growth'), // Added for scoring
  futureSalesGrowth: text('future_sales_growth'),
  futureSalesGrowthReason: text('future_sales_growth_reason'), // Explain the basis
  // hasExternalFunding reused
  // externalFundingDetails reused

  // === ACCELERATION TRACK: IMPACT POTENTIAL (20 marks) ===
  // fullTimeEmployees breakdowns reused for "Current Job Creation"
  jobCreationPotential: text('job_creation_potential'), // High, Moderate, Low
  projectedInclusion: text('projected_inclusion'), // Added for scoring (>50% women/youth/pwd)

  // === ACCELERATION TRACK: SCALABILITY (20 marks) ===
  scalabilityPlan: text('scalability_plan'), // Added for scoring
  marketScalePotential: text('market_scale_potential'), // Added for scoring
  marketDifferentiation: text('market_differentiation'), // Truly unique, Provably better, Undifferentiated
  marketDifferentiationDescription: text('market_differentiation_description'), // Describe competitive strengths
  competitiveAdvantage: text('competitive_advantage'), // High, Moderate, Low
  competitiveAdvantageSource: text('competitive_advantage_source'), // Describe sources
  technologyIntegration: text('technology_integration'), // High, Moderate, Low
  technologyIntegrationDescription: text('technology_integration_description'), // Describe tech/innovation use
  salesMarketingIntegration: text('sales_marketing_integration'), // Fully, Aligned, Not aligned
  salesMarketingApproach: text('sales_marketing_approach'), // Describe channels

  // === ACCELERATION TRACK: SOCIAL & ENVIRONMENTAL IMPACT (20 marks) ===
  socialImpactContribution: text('social_impact_contribution'), // High, Moderate, None
  socialImpactContributionDescription: text('social_impact_contribution_description'), // Describe impact
  supplierInvolvement: text('supplier_involvement'), // Direct, Network, None
  supplierSupportDescription: text('supplier_support_description'), // Describe support
  // environmentalImpact reused
  // environmentalImpactDescription reused

  // === ACCELERATION TRACK: BUSINESS MODEL (20 marks) ===
  businessModelUniqueness: text('business_model_uniqueness'), // High, Moderate, Low
  businessModelUniquenessDescription: text('business_model_uniqueness_description'), // Describe what makes it different
  customerValueProposition: text('customer_value_proposition'), // High, Moderate, Low
  competitiveAdvantageStrength: text('competitive_advantage_strength'), // High, Moderate, Low
  competitiveAdvantageBarriers: text('competitive_advantage_barriers'), // Explain barriers

  // === DOCUMENT UPLOADS ===
  salesEvidenceUrl: varchar('sales_evidence_url', { length: 500 }),
  photosUrl: varchar('photos_url', { length: 500 }),
  taxComplianceUrl: varchar('tax_compliance_url', { length: 500 }),
  fundingDetails: text('funding_details'), // Legacy separate field, maybe keep for backward compat

  // === DECLARATIONS ===
  hasSocialSafeguarding: boolean('has_social_safeguarding'),
  declarationName: text('declaration_name'),
  declarationDate: timestamp('declaration_date'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});



export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  businessId: integer('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  track: applicationTrackEnum('track'),
  status: applicationStatusEnum('status').default('submitted').notNull(),
  isObservationOnly: boolean('is_observation_only').default(false).notNull(), // Kenya applicants with revenue < 500k
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
  totalScore: decimal('total_score', { precision: 5, scale: 2 }).default("0"),

  // Auto-calculated score breakdown
  commercialViabilityScore: decimal('commercial_viability_score', { precision: 5, scale: 2 }),
  businessModelScore: decimal('business_model_score', { precision: 5, scale: 2 }),
  marketPotentialScore: decimal('market_potential_score', { precision: 5, scale: 2 }),
  socialImpactScore: decimal('social_impact_score', { precision: 5, scale: 2 }),
  revenueGrowthScore: decimal('revenue_growth_score', { precision: 5, scale: 2 }),
  scalabilityScore: decimal('scalability_score', { precision: 5, scale: 2 }),

  // Category totals (aggregated from breakdown for direct UI display)
  innovationTotal: decimal('innovation_total', { precision: 5, scale: 2 }),  // Innovation & Climate (max 35)
  viabilityTotal: decimal('viability_total', { precision: 5, scale: 2 }),    // Business Viability (max 31)
  alignmentTotal: decimal('alignment_total', { precision: 5, scale: 2 }),    // Strategic Alignment (max 20)
  orgCapacityTotal: decimal('org_capacity_total', { precision: 5, scale: 2 }), // Org Capacity (max 14)

  // Two-Tier Review Fields
  reviewer1Score: decimal('reviewer1_score', { precision: 5, scale: 2 }),
  reviewer1Notes: text('reviewer1_notes'),
  reviewer1Id: text('reviewer1_id').references(() => users.id), // ID of the first reviewer
  reviewer1At: timestamp('reviewer1_at'),

  reviewer2Score: decimal('reviewer2_score', { precision: 5, scale: 2 }),
  reviewer2Notes: text('reviewer2_notes'),
  reviewer2Id: text('reviewer2_id').references(() => users.id), // ID of the second reviewer
  reviewer2At: timestamp('reviewer2_at'),
  reviewer2OverrodeReviewer1: boolean('reviewer2_overrode_reviewer1').default(false), // Flag if R2 changed R1's verdict significantly

  evaluatedBy: text('evaluated_by'), // Legacy field, maybe keep or migrate
  evaluatedAt: timestamp('evaluated_at'),
  evaluationNotes: text('evaluation_notes'), // Legacy field

  // Locking mechanism to prevent race conditions during review
  isLocked: boolean('is_locked').default(false),
  lockedBy: text('locked_by').references(() => users.id), // User ID who locked it
  lockedAt: timestamp('locked_at'),
  lockReason: text('lock_reason'), // "Reviewing", "Auditing", etc.

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Scoring Configuration (Cohorts/Cycles)
export const scoringConfigurations = pgTable('scoring_configurations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(), // e.g., "Cycle 1 - 2024"
  isActive: boolean('is_active').default(false).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Scoring Criteria Table implementation
export const scoringCriteria = pgTable('scoring_criteria', {
  id: serial('id').primaryKey(),
  configId: integer('config_id').references(() => scoringConfigurations.id, { onDelete: 'cascade' }),
  category: text('category').notNull(), // "Commercial Viability", "Business Model", etc.
  criteriaName: text('criteria_name').notNull(), // "Annual Revenue", "Customer Count"
  track: applicationTrackEnum('track').notNull(), // "foundation" or "acceleration"
  weight: integer('weight').notNull(), // Max marks for this criteria
  scoringLogic: text('scoring_logic').notNull(), // JSON string describing logic e.g., { ">2M": 10, "1-2M": 5 } OR "manual"
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const applicationScores = pgTable('application_scores', {
  id: serial('id').primaryKey(),
  eligibilityResultId: integer('eligibility_result_id').notNull().references(() => eligibilityResults.id, { onDelete: 'cascade' }),
  criteriaId: integer('criteria_id').notNull().references(() => scoringCriteria.id, { onDelete: 'cascade' }),
  configId: integer('config_id').references(() => scoringConfigurations.id),
  score: decimal('score', { precision: 5, scale: 2 }).notNull(),
  reviewerComment: text('reviewer_comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const funding = pgTable('funding', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  hasExternalFunding: boolean('has_external_funding').notNull(),
  fundingSource: fundingSourceEnum('funding_source'),
  funderName: text('funder_name'),
  amountUsd: decimal('amount_usd', { precision: 12, scale: 2 }),
  fundingDate: date('funding_date'),
  fundingInstrument: fundingInstrumentEnum('funding_instrument'),
  repaymentTerms: text('repayment_terms'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  fullTimeMale: integer('full_time_male').default(0),
  fullTimeFemale: integer('full_time_female').default(0),
  partTimeMale: integer('part_time_male').default(0),
  partTimeFemale: integer('part_time_female').default(0),
  totalEmployees: integer('total_employees').generatedAlwaysAs(
    sql`"full_time_male" + "full_time_female" + "part_time_male" + "part_time_female"`
  ),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const targetCustomers = pgTable('target_customers', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  customerSegment: customerSegmentEnum('customer_segment').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Feedback System Tables

export const supportTickets = pgTable('support_tickets', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ticketNumber: varchar('ticket_number', { length: 20 }).notNull().unique(), // e.g., TKT-1001
  subject: varchar('subject', { length: 255 }).notNull(),
  message: text('message').notNull(),
  category: supportCategoryEnum('category').notNull(),
  priority: supportPriorityEnum('priority').notNull().default('medium'),
  status: supportStatusEnum('status').notNull().default('open'),
  assignedTo: text('assigned_to').references(() => users.id), // Admin user assigned
  resolution: text('resolution'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at')
});

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

export const ticketMessages = pgTable('ticket_messages', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  isInternal: boolean('is_internal').default(false).notNull(), // For admin-only notes
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const ticketAttachments = pgTable('ticket_attachments', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').notNull().references(() => ticketMessages.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const feedbackCampaigns = pgTable('feedback_campaigns', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }),
  emailBody: text('email_body'),
  feedbackFormUrl: varchar('feedback_form_url', { length: 500 }),
  linkDisplayText: varchar('link_display_text', { length: 255 }),
  description: text('description'),
  targetRole: userRoleEnum('target_role'),
  status: feedbackCampaignStatusEnum('status').default('draft').notNull(),
  batchSize: integer('batch_size').default(50),
  totalRecipients: integer('total_recipients').default(0),
  sentCount: integer('sent_count').default(0),
  failedCount: integer('failed_count').default(0),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  scheduledAt: timestamp('scheduled_at'),
  sentAt: timestamp('sent_at'),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const feedbackEmails = pgTable('feedback_emails', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').notNull().references(() => feedbackCampaigns.id, { onDelete: 'cascade' }),
  recipientId: text('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
  recipientName: varchar('recipient_name', { length: 255 }).notNull(),
  batchNumber: integer('batch_number').default(1).notNull(),
  status: feedbackEmailStatusEnum('status').default('pending').notNull(),
  sentAt: timestamp('sent_at'),
  failedAt: timestamp('failed_at'),
  retryCount: integer('retry_count').default(0),
  openedAt: timestamp('opened_at'), // Tracking (optional)
  clickedAt: timestamp('clicked_at'),
  errorMessage: text('error_message'), // If skipped or bounced
});


// Relations
export const userRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  userProfile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId]
  }),
  applicant: one(applicants, {
    fields: [users.id],
    references: [applicants.userId]
  }),
  assignedTickets: many(supportTickets, { relationName: 'assignedTo' }),
  sentMessages: many(ticketMessages, { relationName: 'sender' }),
  createdCampaigns: many(feedbackCampaigns, { relationName: 'creator' })
}));

export const userProfileRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id]
  })
}));


export const applicantRelations = relations(applicants, ({ one, many }) => ({
  user: one(users, {
    fields: [applicants.userId],
    references: [users.id]
  }),
  businesses: many(businesses) // One applicant can theoretically have many businesses, but usually 1
}));

export const businessRelations = relations(businesses, ({ one, many }) => ({
  applicant: one(applicants, {
    fields: [businesses.applicantId],
    references: [applicants.id]
  }),
  application: one(applications, { // Link business back to application if needed directly
    fields: [businesses.id],
    references: [applications.businessId]
  }),
  funding: many(funding),
  employees: one(employees, {
    fields: [businesses.id],
    references: [employees.businessId]
  }),
  targetCustomers: many(targetCustomers)
}));

export const applicationRelations = relations(applications, ({ one, many }) => ({
  user: one(users, {
    fields: [applications.userId],
    references: [users.id]
  }),
  business: one(businesses, {
    fields: [applications.businessId],
    references: [businesses.id]
  }),
  eligibilityResults: many(eligibilityResults)
}));

export const eligibilityResultsRelations = relations(eligibilityResults, ({ one, many }) => ({
  application: one(applications, {
    fields: [eligibilityResults.applicationId],
    references: [applications.id]
  }),
  scores: many(applicationScores),
  evaluator: one(users, { // Relation for evaluatedBy
    fields: [eligibilityResults.evaluatedBy],
    references: [users.id]
  })
}));

export const scoringCriteriaRelations = relations(scoringCriteria, ({ one, many }) => ({
  config: one(scoringConfigurations, {
    fields: [scoringCriteria.configId],
    references: [scoringConfigurations.id]
  }),
  scores: many(applicationScores)
}));

export const scoringConfigurationRelations = relations(scoringConfigurations, ({ many }) => ({
  criteria: many(scoringCriteria),
  scores: many(applicationScores)
}));

export const applicationScoresRelations = relations(applicationScores, ({ one }) => ({
  eligibilityResult: one(eligibilityResults, {
    fields: [applicationScores.eligibilityResultId],
    references: [eligibilityResults.id]
  }),
  criteria: one(scoringCriteria, {
    fields: [applicationScores.criteriaId],
    references: [scoringCriteria.id]
  })
}));

export const supportTicketRelations = relations(supportTickets, ({ one, many }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
    relationName: 'creator' // Although userRelations defines 'user' generally
  }),
  assignee: one(users, {
    fields: [supportTickets.assignedTo],
    references: [users.id],
    relationName: 'assignedTo'
  }),
  messages: many(ticketMessages),
  responses: many(supportResponses)
}));

export const supportResponseRelations = relations(supportResponses, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [supportResponses.ticketId],
    references: [supportTickets.id]
  }),
  responder: one(users, {
    fields: [supportResponses.responderId],
    references: [users.id]
  })
}));

export const ticketMessageRelations = relations(ticketMessages, ({ one, many }) => ({
  ticket: one(supportTickets, {
    fields: [ticketMessages.ticketId],
    references: [supportTickets.id]
  }),
  sender: one(users, {
    fields: [ticketMessages.senderId],
    references: [users.id],
    relationName: 'sender'
  }),
  attachments: many(ticketAttachments)
}));

export const ticketAttachmentRelations = relations(ticketAttachments, ({ one }) => ({
  message: one(ticketMessages, {
    fields: [ticketAttachments.messageId],
    references: [ticketMessages.id]
  })
}));

export const feedbackCampaignRelations = relations(feedbackCampaigns, ({ one, many }) => ({
  creator: one(users, {
    fields: [feedbackCampaigns.createdBy],
    references: [users.id],
    relationName: 'creator'
  }),
  emails: many(feedbackEmails)
}));

export const feedbackEmailRelations = relations(feedbackEmails, ({ one }) => ({
  campaign: one(feedbackCampaigns, {
    fields: [feedbackEmails.campaignId],
    references: [feedbackCampaigns.id]
  }),
  recipient: one(users, {
    fields: [feedbackEmails.recipientId],
    references: [users.id]
  })
}));

export const fundingRelations = relations(funding, ({ one }) => ({
  business: one(businesses, {
    fields: [funding.businessId],
    references: [businesses.id]
  })
}));

export const employeeRelations = relations(employees, ({ one }) => ({
  business: one(businesses, {
    fields: [employees.businessId],
    references: [businesses.id]
  })
}));

export const targetCustomersRelations = relations(targetCustomers, ({ one }) => ({
  business: one(businesses, {
    fields: [targetCustomers.businessId],
    references: [businesses.id]
  })
}));

// === DUE DILIGENCE MODULE ===

export const dueDiligenceRecords = pgTable('due_diligence_records', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').references(() => applications.id, { onDelete: 'cascade' }).notNull(),

  // Phase 1: Phone / Desk Due Diligence
  phase1Score: integer('phase1_score').default(0),
  phase1Status: text('phase1_status').default('pending'), // pending, in_progress, completed
  phase1Notes: text('phase1_notes'),

  // Phase 2: Physical Due Diligence
  phase2Score: integer('phase2_score').default(0),
  phase2Status: text('phase2_status').default('pending'), // pending, ready, in_progress, completed, skipped
  phase2Notes: text('phase2_notes'),

  reviewerId: text('reviewer_id'), // User ID of the staff member

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const dueDiligenceItems = pgTable('due_diligence_items', {
  id: serial('id').primaryKey(),
  recordId: integer('record_id').references(() => dueDiligenceRecords.id, { onDelete: 'cascade' }).notNull(),
  phase: text('phase').notNull(), // 'phase1' or 'phase2'
  category: text('category').notNull(), // e.g., 'Business Legitimacy'
  criterion: text('criterion').notNull(), // e.g., 'Registration Status'
  score: integer('score').default(0), // 0, 1, 3, 5
  comments: text('comments'),
});

// Relations
export const dueDiligenceRecordsRelations = relations(dueDiligenceRecords, ({ one, many }) => ({
  application: one(applications, {
    fields: [dueDiligenceRecords.applicationId],
    references: [applications.id],
  }),
  items: many(dueDiligenceItems),
  reviewer: one(users, {
    fields: [dueDiligenceRecords.reviewerId],
    references: [users.id],
  }),
}));

export const dueDiligenceItemsRelations = relations(dueDiligenceItems, ({ one }) => ({
  record: one(dueDiligenceRecords, {
    fields: [dueDiligenceItems.recordId],
    references: [dueDiligenceRecords.id],
  }),
}));

// Export types
export type DueDiligenceRecord = typeof dueDiligenceRecords.$inferSelect;
export type NewDueDiligenceRecord = typeof dueDiligenceRecords.$inferInsert;
export type DueDiligenceItem = typeof dueDiligenceItems.$inferSelect;
export type NewDueDiligenceItem = typeof dueDiligenceItems.$inferInsert;
