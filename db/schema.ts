
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
  index,
  uniqueIndex,
  jsonb
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
  'reviewer_2',
  'oversight',
  'a2f_officer'
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

export const kycStatusEnum = pgEnum('kyc_status', [
  'not_started',
  'in_progress',
  'submitted',
  'needs_info',
  'verified',
  'rejected'
]);

export const profileLockStatusEnum = pgEnum('profile_lock_status', [
  'unlocked',
  'locked',
  'change_requested',
  'change_approved'
]);

export const kycDocumentTypeEnum = pgEnum('kyc_document_type', [
  'tax_compliance_certificate',
  'cr12',
  'bank_account_proof',
  'programme_consent_form',
  'director_id_document',
  'additional_supporting_document',
  'letter_of_agreement',
  'national_id_document'
]);

export const kycChangeRequestStatusEnum = pgEnum('kyc_change_request_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled'
]);

/** Phase 2 — mentorship, CNA/BDS, M&E, Kajabi */
export const sessionTypeEnum = pgEnum('session_type', ['physical', 'virtual']);
export const sessionStatusEnum = pgEnum('session_status', [
  'scheduled',
  'completed',
  'missed',
  'rescheduled'
]);
export const bdsStatusEnum = pgEnum('bds_status', [
  'recommended',
  'in_progress',
  'completed',
  'dropped'
]);
export const actionItemStatusEnum = pgEnum('action_item_status', [
  'pending',
  'partial',
  'completed'
]);
export const mentorshipMatchStatusEnum = pgEnum('mentorship_match_status', [
  'active',
  'completed',
  'terminated'
]);

/** BIRE Capacity Development Plan (CDP) */
export const cdpPlanStatusEnum = pgEnum('cdp_plan_status', ['draft', 'active', 'archived']);
export const cdpFocusCodeEnum = pgEnum('cdp_focus_code', [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
]);
export const cdpProgressQuarterEnum = pgEnum('cdp_progress_quarter', ['Q1', 'Q2', 'Q3', 'Q4']);
export const cdpReviewCycleStatusEnum = pgEnum('cdp_review_cycle_status', [
  'not_started',
  'in_progress',
  'done',
  'blocked',
]);

/** CDP support session follow-up items (gates next session when present). */
export const cdpSessionActionItemStatusEnum = pgEnum('cdp_session_action_item_status', [
  'open',
  'done',
  'waived',
  'blocked',
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
  verificationStatus: verificationStatusEnum('verification_status').default('pending').notNull(),

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
  marketDifferentiation: text('market_differentiation'), // Truly unique, Probably better, Undifferentiated
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
  kycStatus: kycStatusEnum('kyc_status').default('not_started').notNull(),
  kycRequired: boolean('kyc_required').default(false).notNull(),
  selectedAt: timestamp('selected_at'),
  kycSubmittedAt: timestamp('kyc_submitted_at'),
  kycVerifiedAt: timestamp('kyc_verified_at'),
  kycVerifiedBy: text('kyc_verified_by').references(() => users.id),
  isObservationOnly: boolean('is_observation_only').default(false).notNull(), // Kenya applicants with revenue < 500k
  markedForRevisit: boolean('marked_for_revisit').default(false).notNull(), // Observation apps flagged for future review
  revisitMarkedAt: timestamp('revisit_marked_at'),
  revisitMarkedBy: text('revisit_marked_by').references(() => users.id),
  referralSource: varchar('referral_source', { length: 100 }),
  referralSourceOther: varchar('referral_source_other', { length: 100 }),
  submittedAt: timestamp('submitted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const kycProfiles = pgTable('kyc_profiles', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }).unique(),
  businessId: integer('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }).unique(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: kycStatusEnum('status').default('not_started').notNull(),
  profileLockStatus: profileLockStatusEnum('profile_lock_status').default('unlocked').notNull(),
  gpsCoordinates: varchar('gps_coordinates', { length: 255 }),
  registrationTypeConfirmed: businessRegistrationTypeEnum('registration_type_confirmed'),
  kraPin: varchar('kra_pin', { length: 100 }),
  bankName: varchar('bank_name', { length: 255 }),
  bankAccountName: varchar('bank_account_name', { length: 255 }),
  baselineMonthLabel: varchar('baseline_month_label', { length: 100 }),
  baselineRevenue: decimal('baseline_revenue', { precision: 14, scale: 2 }),
  baselineEmployeeCount: integer('baseline_employee_count'),
  secondaryContactName: varchar('secondary_contact_name', { length: 255 }),
  secondaryContactPhone: varchar('secondary_contact_phone', { length: 50 }),
  secondaryContactEmail: varchar('secondary_contact_email', { length: 255 }),
  reviewNotes: text('review_notes'),
  rejectionReason: text('rejection_reason'),
  needsInfoReason: text('needs_info_reason'),
  originalSnapshot: jsonb('original_snapshot'),
  submittedSnapshot: jsonb('submitted_snapshot'),
  submittedAt: timestamp('submitted_at'),
  reviewedAt: timestamp('reviewed_at'),
  verifiedAt: timestamp('verified_at'),
  verifiedById: text('verified_by_id').references(() => users.id, { onDelete: 'set null' }),
  lockedAt: timestamp('locked_at'),
  lockedById: text('locked_by_id').references(() => users.id, { onDelete: 'set null' }),
  lastSavedAt: timestamp('last_saved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  applicationIdx: index('kyc_profiles_application_id_idx').on(table.applicationId),
  businessIdx: index('kyc_profiles_business_id_idx').on(table.businessId),
  userIdx: index('kyc_profiles_user_id_idx').on(table.userId),
  statusIdx: index('kyc_profiles_status_idx').on(table.status),
  lockStatusIdx: index('kyc_profiles_lock_status_idx').on(table.profileLockStatus),
}));

export const kycDocuments = pgTable('kyc_documents', {
  id: serial('id').primaryKey(),
  kycProfileId: integer('kyc_profile_id').notNull().references(() => kycProfiles.id, { onDelete: 'cascade' }),
  documentType: kycDocumentTypeEnum('document_type').notNull(),
  fileUrl: varchar('file_url', { length: 500 }).notNull(),
  fileName: varchar('file_name', { length: 255 }),
  documentNumber: varchar('document_number', { length: 255 }),
  notes: text('notes'),
  isVerified: boolean('is_verified').default(false).notNull(),
  verifiedById: text('verified_by_id').references(() => users.id, { onDelete: 'set null' }),
  verifiedAt: timestamp('verified_at'),
  rejectionReason: text('rejection_reason'),
  uploadedById: text('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  profileIdx: index('kyc_documents_profile_id_idx').on(table.kycProfileId),
  documentTypeIdx: index('kyc_documents_type_idx').on(table.documentType),
}));

export const kycFieldChanges = pgTable('kyc_field_changes', {
  id: serial('id').primaryKey(),
  kycProfileId: integer('kyc_profile_id').notNull().references(() => kycProfiles.id, { onDelete: 'cascade' }),
  fieldName: varchar('field_name', { length: 120 }).notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  isCoreField: boolean('is_core_field').default(false).notNull(),
  changedById: text('changed_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  profileIdx: index('kyc_field_changes_profile_id_idx').on(table.kycProfileId),
  fieldIdx: index('kyc_field_changes_field_idx').on(table.fieldName),
}));

export const kycChangeRequests = pgTable('kyc_change_requests', {
  id: serial('id').primaryKey(),
  kycProfileId: integer('kyc_profile_id').notNull().references(() => kycProfiles.id, { onDelete: 'cascade' }),
  requestedById: text('requested_by_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  fieldName: varchar('field_name', { length: 120 }).notNull(),
  currentValue: jsonb('current_value'),
  requestedValue: jsonb('requested_value'),
  reason: text('reason').notNull(),
  status: kycChangeRequestStatusEnum('status').default('pending').notNull(),
  reviewedById: text('reviewed_by_id').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  profileIdx: index('kyc_change_requests_profile_id_idx').on(table.kycProfileId),
  statusIdx: index('kyc_change_requests_status_idx').on(table.status),
  requestedByIdx: index('kyc_change_requests_requested_by_idx').on(table.requestedById),
}));

// --- Phase 2: mentorship, CNA/BDS, M&E, Kajabi ---

export const mentors = pgTable(
  'mentors',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    expertiseArea: businessSectorEnum('expertise_area').notNull(),
    maxMentees: integer('max_mentees').default(3),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('mentors_user_id_idx').on(table.userId),
  })
);

export const mentorshipMatches = pgTable(
  'mentorship_matches',
  {
    id: serial('id').primaryKey(),
    businessId: integer('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    mentorId: integer('mentor_id')
      .notNull()
      .references(() => mentors.id, { onDelete: 'cascade' }),
    status: mentorshipMatchStatusEnum('status').default('active').notNull(),
    startDate: timestamp('start_date').defaultNow().notNull(),
    endDate: timestamp('end_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    businessIdx: index('mentorship_matches_business_id_idx').on(table.businessId),
    mentorIdx: index('mentorship_matches_mentor_id_idx').on(table.mentorId),
  })
);

export const mentorshipSessions = pgTable(
  'mentorship_sessions',
  {
    id: serial('id').primaryKey(),
    matchId: integer('match_id')
      .notNull()
      .references(() => mentorshipMatches.id, { onDelete: 'cascade' }),
    sessionNumber: integer('session_number').notNull(),
    sessionType: sessionTypeEnum('session_type').notNull(),
    status: sessionStatusEnum('status').default('scheduled').notNull(),
    scheduledDate: timestamp('scheduled_date').notNull(),
    completedDate: timestamp('completed_date'),
    diagnosticNotes: text('diagnostic_notes'),
    photographicEvidenceUrl: varchar('photographic_evidence_url', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    matchIdx: index('mentorship_sessions_match_id_idx').on(table.matchId),
    matchSessionUq: uniqueIndex('mentorship_sessions_match_session_uq').on(
      table.matchId,
      table.sessionNumber
    ),
  })
);

export const mentorshipActionItems = pgTable(
  'mentorship_action_items',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id')
      .notNull()
      .references(() => mentorshipSessions.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    status: actionItemStatusEnum('status').default('pending').notNull(),
    enterpriseFeedback: text('enterprise_feedback'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: index('mentorship_action_items_session_id_idx').on(table.sessionId),
  })
);

export const cnaDiagnostics = pgTable(
  'cna_diagnostics',
  {
    id: serial('id').primaryKey(),
    businessId: integer('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    conductedById: text('conducted_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    financialManagementScore: integer('financial_management_score').notNull(),
    marketReachScore: integer('market_reach_score').notNull(),
    operationsScore: integer('operations_score').notNull(),
    complianceScore: integer('compliance_score').notNull(),
    topRiskArea: text('top_risk_area'),
    resilienceIndex: decimal('resilience_index', { precision: 5, scale: 2 }),
    conductedAt: timestamp('conducted_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    businessIdx: index('cna_diagnostics_business_id_idx').on(table.businessId),
  })
);

export const capacityDevelopmentPlans = pgTable(
  'capacity_development_plans',
  {
    id: serial('id').primaryKey(),
    businessId: integer('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    status: cdpPlanStatusEnum('status').default('draft').notNull(),
    diagnosticDate: date('diagnostic_date').notNull(),
    cdpReviewDate: date('cdp_review_date'),
    leadStaffId: text('lead_staff_id').references(() => users.id, { onDelete: 'set null' }),
    notes: text('notes'),
    linkedCnaDiagnosticId: integer('linked_cna_diagnostic_id').references(
      () => cnaDiagnostics.id,
      { onDelete: 'set null' }
    ),
    createdById: text('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    /** When set, diagnostic A–L scores should not be edited without clearing this timestamp. */
    diagnosticLockedAt: timestamp('diagnostic_locked_at'),
    /** Audit: last time plan met activation rules and was set to active (optional; also infer from status). */
    cdpApprovedAt: timestamp('cdp_approved_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    businessIdx: index('capacity_development_plans_business_id_idx').on(table.businessId),
    statusIdx: index('capacity_development_plans_status_idx').on(table.status),
  })
);

export const cdpFocusSummary = pgTable(
  'cdp_focus_summary',
  {
    id: serial('id').primaryKey(),
    planId: integer('plan_id')
      .notNull()
      .references(() => capacityDevelopmentPlans.id, { onDelete: 'cascade' }),
    focusCode: cdpFocusCodeEnum('focus_code').notNull(),
    score0to10: integer('score0to10').notNull().default(0),
    keyGaps: text('key_gaps'),
    recommendedIntervention: text('recommended_intervention'),
    responsibleStaff: text('responsible_staff'),
    targetDate: date('target_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    planIdx: index('cdp_focus_summary_plan_id_idx').on(table.planId),
    planFocusUq: uniqueIndex('cdp_focus_summary_plan_focus_uq').on(table.planId, table.focusCode),
  })
);

export const cdpActivities = pgTable(
  'cdp_activities',
  {
    id: serial('id').primaryKey(),
    planId: integer('plan_id')
      .notNull()
      .references(() => capacityDevelopmentPlans.id, { onDelete: 'cascade' }),
    focusCode: cdpFocusCodeEnum('focus_code').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    gapChallenge: text('gap_challenge'),
    intervention: text('intervention').notNull().default(''),
    supportType: text('support_type'),
    deliveryMethod: text('delivery_method'),
    responsibleStaff: text('responsible_staff'),
    targetDate: date('target_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    planIdx: index('cdp_activities_plan_id_idx').on(table.planId),
    planFocusIdx: index('cdp_activities_plan_focus_idx').on(table.planId, table.focusCode),
  })
);

export const cdpBusinessSupportSessions = pgTable(
  'cdp_business_support_sessions',
  {
    id: serial('id').primaryKey(),
    planId: integer('plan_id')
      .notNull()
      .references(() => capacityDevelopmentPlans.id, { onDelete: 'cascade' }),
    sessionNumber: integer('session_number').notNull(),
    sessionDate: timestamp('session_date').notNull(),
    focusCodes: text('focus_codes').array().notNull().default(sql`ARRAY[]::text[]`),
    agenda: text('agenda'),
    supportType: text('support_type'),
    durationHours: decimal('duration_hours', { precision: 6, scale: 2 }),
    keyActionsAgreed: text('key_actions_agreed'),
    challengesRaised: text('challenges_raised'),
    nextSteps: text('next_steps'),
    followUpDate: date('follow_up_date'),
    conductedById: text('conducted_by_id').references(() => users.id, { onDelete: 'set null' }),
    /** Optional link to 13-week bootcamp curriculum week (1–13). */
    bootcampWeek: integer('bootcamp_week'),
    evidenceUrls: text('evidence_urls')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    planIdx: index('cdp_business_support_sessions_plan_id_idx').on(table.planId),
    planSessionUq: uniqueIndex('cdp_bss_plan_session_uq').on(table.planId, table.sessionNumber),
  })
);

export const cdpObjectives = pgTable(
  'cdp_objectives',
  {
    id: serial('id').primaryKey(),
    planId: integer('plan_id')
      .notNull()
      .references(() => capacityDevelopmentPlans.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    planIdx: index('cdp_objectives_plan_id_idx').on(table.planId),
  })
);

export const cdpKeyResults = pgTable(
  'cdp_key_results',
  {
    id: serial('id').primaryKey(),
    objectiveId: integer('objective_id')
      .notNull()
      .references(() => cdpObjectives.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    targetOutcome: text('target_outcome'),
    achievedOutcome: text('achieved_outcome'),
    weightPercent: decimal('weight_percent', { precision: 6, scale: 2 }).notNull().default('0'),
    dueDate: date('due_date'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    objectiveIdx: index('cdp_key_results_objective_id_idx').on(table.objectiveId),
  })
);

export const cdpWeeklyMilestones = pgTable(
  'cdp_weekly_milestones',
  {
    id: serial('id').primaryKey(),
    planId: integer('plan_id')
      .notNull()
      .references(() => capacityDevelopmentPlans.id, { onDelete: 'cascade' }),
    weekIndex: integer('week_index'),
    weekLabel: varchar('week_label', { length: 120 }),
    actionText: text('action_text').notNull(),
    dueDate: date('due_date'),
    progressPercent: integer('progress_percent').default(0).notNull(),
    keyResultId: integer('key_result_id').references(() => cdpKeyResults.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    planIdx: index('cdp_weekly_milestones_plan_id_idx').on(table.planId),
    krIdx: index('cdp_weekly_milestones_key_result_id_idx').on(table.keyResultId),
  })
);

export const cdpSessionActionItems = pgTable(
  'cdp_session_action_items',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id')
      .notNull()
      .references(() => cdpBusinessSupportSessions.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    status: cdpSessionActionItemStatusEnum('status').default('open').notNull(),
    statusNotes: text('status_notes'),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: index('cdp_session_action_items_session_id_idx').on(table.sessionId),
  })
);

export const cdpEndlineResponses = pgTable(
  'cdp_endline_responses',
  {
    id: serial('id').primaryKey(),
    planId: integer('plan_id')
      .notNull()
      .references(() => capacityDevelopmentPlans.id, { onDelete: 'cascade' })
      .unique(),
    responses: jsonb('responses').notNull().default(sql`'{}'::jsonb`),
    impactDeltas: jsonb('impact_deltas'),
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
    submittedById: text('submitted_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    planIdx: index('cdp_endline_responses_plan_id_idx').on(table.planId),
  })
);

export const cdpActivityProgressReviews = pgTable(
  'cdp_activity_progress_reviews',
  {
    id: serial('id').primaryKey(),
    activityId: integer('activity_id')
      .notNull()
      .references(() => cdpActivities.id, { onDelete: 'cascade' }),
    reviewPeriod: cdpProgressQuarterEnum('review_period').notNull(),
    status: cdpReviewCycleStatusEnum('status').default('not_started').notNull(),
    outcomeAchieved: boolean('outcome_achieved'),
    staffNotes: text('staff_notes'),
    reviewedAt: timestamp('reviewed_at'),
    reviewedById: text('reviewed_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    activityIdx: index('cdp_activity_progress_activity_id_idx').on(table.activityId),
    activityQuarterUq: uniqueIndex('cdp_activity_progress_activity_quarter_uq').on(
      table.activityId,
      table.reviewPeriod
    ),
  })
);

export const bdsInterventions = pgTable(
  'bds_interventions',
  {
    id: serial('id').primaryKey(),
    businessId: integer('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    diagnosticId: integer('diagnostic_id').references(() => cnaDiagnostics.id, {
      onDelete: 'set null',
    }),
    /** Optional link when a legacy BDS row mirrors a CDP detailed activity. */
    cdpActivityId: integer('cdp_activity_id').references(() => cdpActivities.id, {
      onDelete: 'set null',
    }),
    interventionName: text('intervention_name').notNull(),
    status: bdsStatusEnum('status').default('recommended').notNull(),
    providerName: text('provider_name'),
    completionDate: timestamp('completion_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    businessIdx: index('bds_interventions_business_id_idx').on(table.businessId),
    diagnosticIdx: index('bds_interventions_diagnostic_id_idx').on(table.diagnosticId),
    cdpActivityIdx: index('bds_interventions_cdp_activity_id_idx').on(table.cdpActivityId),
  })
);

export const businessPerformanceMetrics = pgTable(
  'business_performance_metrics',
  {
    id: serial('id').primaryKey(),
    businessId: integer('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    reportingPeriod: text('reporting_period').notNull(),
    revenueGenerated: decimal('revenue_generated', { precision: 14, scale: 2 }),
    newJobsCreated: integer('new_jobs_created').default(0),
    newMarketsEntered: integer('new_markets_entered').default(0),
    marketExpansionIndex: decimal('market_expansion_index', { precision: 5, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    businessIdx: index('business_performance_metrics_business_id_idx').on(table.businessId),
  })
);

export const aiReportQueries = pgTable(
  'ai_report_queries',
  {
    id: serial('id').primaryKey(),
    adminId: text('admin_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    queryText: text('query_text').notNull(),
    generatedSummary: text('generated_summary').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    adminIdx: index('ai_report_queries_admin_id_idx').on(table.adminId),
  })
);

export const kajabiUserMapping = pgTable(
  'kajabi_user_mapping',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    kajabiExternalId: varchar('kajabi_external_id', { length: 255 }).notNull().unique(),
    hasActiveAccess: boolean('has_active_access').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('kajabi_user_mapping_user_id_idx').on(table.userId),
  })
);

export const kajabiProgressWebhooks = pgTable(
  'kajabi_progress_webhooks',
  {
    id: serial('id').primaryKey(),
    kajabiExternalId: varchar('kajabi_external_id', { length: 255 }).notNull(),
    courseId: varchar('course_id', { length: 255 }).notNull(),
    eventTitle: varchar('event_title', { length: 255 }).notNull(),
    payload: jsonb('payload'),
    processedAt: timestamp('processed_at').defaultNow().notNull(),
  },
  (table) => ({
    externalIdx: index('kajabi_progress_webhooks_external_id_idx').on(table.kajabiExternalId),
  })
);

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
  systemScore: decimal('system_score', { precision: 5, scale: 2 }), // Preserved initial automated score

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

  // Pre-assignment fields (assigned before review starts)
  assignedReviewer1Id: text('assigned_reviewer1_id').references(() => users.id),
  assignedReviewer1At: timestamp('assigned_reviewer1_at'),
  assignedReviewer2Id: text('assigned_reviewer2_id').references(() => users.id),
  assignedReviewer2At: timestamp('assigned_reviewer2_at'),

  // Admin Oversight
  adminOversightComment: text('admin_oversight_comment'),

  // === DUE DILIGENCE QUALIFICATION ===
  qualifiesForDueDiligence: boolean('qualifies_for_due_diligence').default(false), // ≥60% aggregate score
  ddRecommendedByOversight: boolean('dd_recommended_by_oversight').default(false), // Flagged by oversight admin
  scoreDisparity: integer('score_disparity'), // Absolute difference between R1 and R2 scores (>10 triggers warning)

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Reviewer Assignment Queue - tracks round-robin assignment state
export const reviewerAssignmentQueue = pgTable('reviewer_assignment_queue', {
  id: serial('id').primaryKey(),
  reviewerId: text('reviewer_id').notNull().references(() => users.id),
  reviewerRole: userRoleEnum('reviewer_role').notNull(), // reviewer_1 or reviewer_2
  assignmentCount: integer('assignment_count').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastAssignedAt: timestamp('last_assigned_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
  recipientId: text('recipient_id').references(() => users.id, { onDelete: 'set null' }),
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
  createdCampaigns: many(feedbackCampaigns, { relationName: 'creator' }),
  ownedKycProfiles: many(kycProfiles),
  verifiedKycProfiles: many(kycProfiles, { relationName: 'kycVerifier' }),
  lockedKycProfiles: many(kycProfiles, { relationName: 'kycLocker' }),
  uploadedKycDocuments: many(kycDocuments, { relationName: 'kycDocumentUploader' }),
  verifiedKycDocuments: many(kycDocuments, { relationName: 'kycDocumentVerifier' }),
  kycFieldChanges: many(kycFieldChanges),
  requestedKycChanges: many(kycChangeRequests, { relationName: 'kycChangeRequester' }),
  reviewedKycChanges: many(kycChangeRequests, { relationName: 'kycChangeReviewer' }),
  mentorProfile: one(mentors, {
    fields: [users.id],
    references: [mentors.userId],
  }),
  conductedCnaDiagnostics: many(cnaDiagnostics),
  cdpPlansCreated: many(capacityDevelopmentPlans, { relationName: 'cdpPlanCreatedBy' }),
  cdpPlansLead: many(capacityDevelopmentPlans, { relationName: 'cdpPlanLeadStaff' }),
  cdpSupportSessionsConducted: many(cdpBusinessSupportSessions, {
    relationName: 'cdpBssConductedBy',
  }),
  cdpProgressReviewsAuthored: many(cdpActivityProgressReviews, {
    relationName: 'cdpProgressReviewedBy',
  }),
  kajabiMapping: one(kajabiUserMapping, {
    fields: [users.id],
    references: [kajabiUserMapping.userId],
  }),
  aiReportQueries: many(aiReportQueries),
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
  targetCustomers: many(targetCustomers),
  kycProfile: one(kycProfiles, {
    fields: [businesses.id],
    references: [kycProfiles.businessId]
  }),
  mentorshipMatches: many(mentorshipMatches),
  cnaDiagnostics: many(cnaDiagnostics),
  capacityDevelopmentPlans: many(capacityDevelopmentPlans),
  bdsInterventions: many(bdsInterventions),
  businessPerformanceMetrics: many(businessPerformanceMetrics),
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
  eligibilityResults: many(eligibilityResults),
  kycProfile: one(kycProfiles, {
    fields: [applications.id],
    references: [kycProfiles.applicationId]
  }),
  kycVerifier: one(users, {
    fields: [applications.kycVerifiedBy],
    references: [users.id]
  })
}));

export const kycProfileRelations = relations(kycProfiles, ({ one, many }) => ({
  application: one(applications, {
    fields: [kycProfiles.applicationId],
    references: [applications.id]
  }),
  business: one(businesses, {
    fields: [kycProfiles.businessId],
    references: [businesses.id]
  }),
  user: one(users, {
    fields: [kycProfiles.userId],
    references: [users.id]
  }),
  verifiedBy: one(users, {
    fields: [kycProfiles.verifiedById],
    references: [users.id],
    relationName: 'kycVerifier'
  }),
  lockedBy: one(users, {
    fields: [kycProfiles.lockedById],
    references: [users.id],
    relationName: 'kycLocker'
  }),
  documents: many(kycDocuments),
  fieldChanges: many(kycFieldChanges),
  changeRequests: many(kycChangeRequests)
}));

export const kycDocumentRelations = relations(kycDocuments, ({ one }) => ({
  kycProfile: one(kycProfiles, {
    fields: [kycDocuments.kycProfileId],
    references: [kycProfiles.id]
  }),
  uploadedBy: one(users, {
    fields: [kycDocuments.uploadedById],
    references: [users.id],
    relationName: 'kycDocumentUploader'
  }),
  verifiedBy: one(users, {
    fields: [kycDocuments.verifiedById],
    references: [users.id],
    relationName: 'kycDocumentVerifier'
  })
}));

export const kycFieldChangeRelations = relations(kycFieldChanges, ({ one }) => ({
  kycProfile: one(kycProfiles, {
    fields: [kycFieldChanges.kycProfileId],
    references: [kycProfiles.id]
  }),
  changedBy: one(users, {
    fields: [kycFieldChanges.changedById],
    references: [users.id]
  })
}));

export const kycChangeRequestRelations = relations(kycChangeRequests, ({ one }) => ({
  kycProfile: one(kycProfiles, {
    fields: [kycChangeRequests.kycProfileId],
    references: [kycProfiles.id]
  }),
  requestedBy: one(users, {
    fields: [kycChangeRequests.requestedById],
    references: [users.id],
    relationName: 'kycChangeRequester'
  }),
  reviewedBy: one(users, {
    fields: [kycChangeRequests.reviewedById],
    references: [users.id],
    relationName: 'kycChangeReviewer'
  })
}));

export const mentorsRelations = relations(mentors, ({ one, many }) => ({
  user: one(users, {
    fields: [mentors.userId],
    references: [users.id],
  }),
  matches: many(mentorshipMatches),
}));

export const mentorshipMatchesRelations = relations(mentorshipMatches, ({ one, many }) => ({
  business: one(businesses, {
    fields: [mentorshipMatches.businessId],
    references: [businesses.id],
  }),
  mentor: one(mentors, {
    fields: [mentorshipMatches.mentorId],
    references: [mentors.id],
  }),
  sessions: many(mentorshipSessions),
}));

export const mentorshipSessionsRelations = relations(mentorshipSessions, ({ one, many }) => ({
  match: one(mentorshipMatches, {
    fields: [mentorshipSessions.matchId],
    references: [mentorshipMatches.id],
  }),
  actionItems: many(mentorshipActionItems),
}));

export const mentorshipActionItemsRelations = relations(mentorshipActionItems, ({ one }) => ({
  session: one(mentorshipSessions, {
    fields: [mentorshipActionItems.sessionId],
    references: [mentorshipSessions.id],
  }),
}));

export const cnaDiagnosticsRelations = relations(cnaDiagnostics, ({ one, many }) => ({
  business: one(businesses, {
    fields: [cnaDiagnostics.businessId],
    references: [businesses.id],
  }),
  conductedBy: one(users, {
    fields: [cnaDiagnostics.conductedById],
    references: [users.id],
  }),
  bdsInterventions: many(bdsInterventions),
  linkedCapacityDevelopmentPlans: many(capacityDevelopmentPlans, {
    relationName: 'cnaLinkedCdpPlans',
  }),
}));

export const capacityDevelopmentPlansRelations = relations(
  capacityDevelopmentPlans,
  ({ one, many }) => ({
    business: one(businesses, {
      fields: [capacityDevelopmentPlans.businessId],
      references: [businesses.id],
    }),
    leadStaff: one(users, {
      fields: [capacityDevelopmentPlans.leadStaffId],
      references: [users.id],
      relationName: 'cdpPlanLeadStaff',
    }),
    createdBy: one(users, {
      fields: [capacityDevelopmentPlans.createdById],
      references: [users.id],
      relationName: 'cdpPlanCreatedBy',
    }),
    linkedCnaDiagnostic: one(cnaDiagnostics, {
      fields: [capacityDevelopmentPlans.linkedCnaDiagnosticId],
      references: [cnaDiagnostics.id],
      relationName: 'cnaLinkedCdpPlans',
    }),
    focusSummaries: many(cdpFocusSummary),
    activities: many(cdpActivities),
    supportSessions: many(cdpBusinessSupportSessions),
    objectives: many(cdpObjectives),
    weeklyMilestones: many(cdpWeeklyMilestones),
    endlineResponse: one(cdpEndlineResponses, {
      fields: [capacityDevelopmentPlans.id],
      references: [cdpEndlineResponses.planId],
    }),
  })
);

export const cdpFocusSummaryRelations = relations(cdpFocusSummary, ({ one }) => ({
  plan: one(capacityDevelopmentPlans, {
    fields: [cdpFocusSummary.planId],
    references: [capacityDevelopmentPlans.id],
  }),
}));

export const cdpActivitiesRelations = relations(cdpActivities, ({ one, many }) => ({
  plan: one(capacityDevelopmentPlans, {
    fields: [cdpActivities.planId],
    references: [capacityDevelopmentPlans.id],
  }),
  progressReviews: many(cdpActivityProgressReviews),
  linkedBdsInterventions: many(bdsInterventions),
}));

export const cdpBusinessSupportSessionsRelations = relations(
  cdpBusinessSupportSessions,
  ({ one, many }) => ({
    plan: one(capacityDevelopmentPlans, {
      fields: [cdpBusinessSupportSessions.planId],
      references: [capacityDevelopmentPlans.id],
    }),
    conductedBy: one(users, {
      fields: [cdpBusinessSupportSessions.conductedById],
      references: [users.id],
      relationName: 'cdpBssConductedBy',
    }),
    actionItems: many(cdpSessionActionItems),
  })
);

export const cdpObjectivesRelations = relations(cdpObjectives, ({ one, many }) => ({
  plan: one(capacityDevelopmentPlans, {
    fields: [cdpObjectives.planId],
    references: [capacityDevelopmentPlans.id],
  }),
  keyResults: many(cdpKeyResults),
}));

export const cdpKeyResultsRelations = relations(cdpKeyResults, ({ one, many }) => ({
  objective: one(cdpObjectives, {
    fields: [cdpKeyResults.objectiveId],
    references: [cdpObjectives.id],
  }),
  weeklyMilestones: many(cdpWeeklyMilestones),
}));

export const cdpWeeklyMilestonesRelations = relations(cdpWeeklyMilestones, ({ one }) => ({
  plan: one(capacityDevelopmentPlans, {
    fields: [cdpWeeklyMilestones.planId],
    references: [capacityDevelopmentPlans.id],
  }),
  keyResult: one(cdpKeyResults, {
    fields: [cdpWeeklyMilestones.keyResultId],
    references: [cdpKeyResults.id],
  }),
}));

export const cdpSessionActionItemsRelations = relations(cdpSessionActionItems, ({ one }) => ({
  session: one(cdpBusinessSupportSessions, {
    fields: [cdpSessionActionItems.sessionId],
    references: [cdpBusinessSupportSessions.id],
  }),
}));

export const cdpEndlineResponsesRelations = relations(cdpEndlineResponses, ({ one }) => ({
  plan: one(capacityDevelopmentPlans, {
    fields: [cdpEndlineResponses.planId],
    references: [capacityDevelopmentPlans.id],
  }),
  submittedBy: one(users, {
    fields: [cdpEndlineResponses.submittedById],
    references: [users.id],
    relationName: 'cdpEndlineSubmittedBy',
  }),
}));

export const cdpActivityProgressReviewsRelations = relations(
  cdpActivityProgressReviews,
  ({ one }) => ({
    activity: one(cdpActivities, {
      fields: [cdpActivityProgressReviews.activityId],
      references: [cdpActivities.id],
    }),
    reviewedBy: one(users, {
      fields: [cdpActivityProgressReviews.reviewedById],
      references: [users.id],
      relationName: 'cdpProgressReviewedBy',
    }),
  })
);

export const bdsInterventionsRelations = relations(bdsInterventions, ({ one }) => ({
  business: one(businesses, {
    fields: [bdsInterventions.businessId],
    references: [businesses.id],
  }),
  diagnostic: one(cnaDiagnostics, {
    fields: [bdsInterventions.diagnosticId],
    references: [cnaDiagnostics.id],
  }),
  cdpActivity: one(cdpActivities, {
    fields: [bdsInterventions.cdpActivityId],
    references: [cdpActivities.id],
  }),
}));

export const businessPerformanceMetricsRelations = relations(
  businessPerformanceMetrics,
  ({ one }) => ({
    business: one(businesses, {
      fields: [businessPerformanceMetrics.businessId],
      references: [businesses.id],
    }),
  })
);

export const aiReportQueriesRelations = relations(aiReportQueries, ({ one }) => ({
  admin: one(users, {
    fields: [aiReportQueries.adminId],
    references: [users.id],
  }),
}));

export const kajabiUserMappingRelations = relations(kajabiUserMapping, ({ one }) => ({
  user: one(users, {
    fields: [kajabiUserMapping.userId],
    references: [users.id],
  }),
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

  // Final Decision
  finalVerdict: text('final_verdict'), // pass, fail
  finalReason: text('final_reason'),

  // === TWO-REVIEWER WORKFLOW ===
  // Primary Reviewer (conducts the assessment)
  primaryReviewerId: text('primary_reviewer_id'),
  primaryReviewedAt: timestamp('primary_reviewed_at'),

  // Validator Reviewer (approves/queries the assessment)
  validatorReviewerId: text('validator_reviewer_id'),
  validatorAction: text('validator_action'), // 'approved', 'queried', null
  validatorComments: text('validator_comments'),
  validatorActionAt: timestamp('validator_action_at'),

  // Approval Workflow
  ddStatus: text('dd_status').default('pending'), // 'pending', 'in_progress', 'awaiting_approval', 'approved', 'queried', 'auto_reassigned'
  approvalDeadline: timestamp('approval_deadline'), // 12 hours from primary submission

  // === OVERSIGHT ADMINISTRATION ===
  isOversightInitiated: boolean('is_oversight_initiated').default(false),
  oversightJustification: text('oversight_justification'),
  oversightAdminId: text('oversight_admin_id'),
  oversightFlaggedAt: timestamp('oversight_flagged_at'),

  // Score disparity tracking
  scoreDisparity: integer('score_disparity'), // Absolute difference between R1 and R2 scores

  // Admin Score Override
  adminOverrideScore: integer('admin_override_score'), // Admin-adjusted final score
  originalScore: integer('original_score'), // Store original score before override
  adminOverrideReason: text('admin_override_reason'), // Justification for override
  adminOverrideById: text('admin_override_by_id'), // Which admin made the override
  adminOverrideAt: timestamp('admin_override_at'), // When override was made

  reviewerId: text('reviewer_id'), // Legacy - User ID of the staff member

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

// ============================================================
// === A2F & INVESTMENT MANAGEMENT MODULE =====================
// ============================================================

// --- Enums ---

export const a2fInstrumentTypeEnum = pgEnum('a2f_instrument_type', [
  'matching_grant',
  'repayable_grant',
]);

export const a2fPipelineStatusEnum = pgEnum('a2f_pipeline_status', [
  'a2f_pipeline',
  'due_diligence_initial',
  'pre_ic_scoring',
  'ic_appraisal_review',
  'offer_issued',
  'contracting',
  'disbursement_active',
  'post_ta_monitoring',
]);

export const a2fDdStageEnum = pgEnum('a2f_dd_stage', [
  'initial',
  'pre_ic',
  'post_ta',
]);

export const a2fDocumentTypeEnum = pgEnum('a2f_document_type', [
  'gair',
  'investment_memo',
]);

export const a2fAgreementTypeEnum = pgEnum('a2f_agreement_type', [
  'matching',
  'repayable',
  'working_capital',
]);

export const a2fTransactionTypeEnum = pgEnum('a2f_transaction_type', [
  'disbursement',
  'repayment',
]);

export const a2fTransactionStatusEnum = pgEnum('a2f_transaction_status', [
  'pending',
  'verified',
  'rejected',
]);

// --- Tables ---

/**
 * Tracks each qualifying enterprise through the A2F investment pipeline.
 * Created once an application passes Committee Selection (DD qualified).
 */
export const a2fPipeline = pgTable('a2f_pipeline', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  instrumentType: a2fInstrumentTypeEnum('instrument_type').notNull(),
  requestedAmount: decimal('requested_amount', { precision: 14, scale: 2 }).notNull(),
  status: a2fPipelineStatusEnum('status').default('a2f_pipeline').notNull(),
  a2fOfficerId: text('a2f_officer_id').references(() => users.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  applicationIdIdx: index('a2f_pipeline_application_id_idx').on(table.applicationId),
  statusIdx: index('a2f_pipeline_status_idx').on(table.status),
  officerIdx: index('a2f_pipeline_officer_id_idx').on(table.a2fOfficerId),
}));

/**
 * Stores the full 11-category Due Diligence data per pipeline entry.
 * Each stage (INITIAL, PRE_IC, POST_TA) gets its own record.
 *
 * JSONB field shapes (for reference):
 *  - companyOverview: { history, businessModel, missionVision }
 *  - financialDd: { revenue, debt, banking, projections }
 *  - hrAndRisk: { orgStructure, insurance, crisisManagement }
 *  - impactEsg: { climateAngle, socioEconomicImpacts }
 */
export const a2fDueDiligenceReports = pgTable('a2f_due_diligence_reports', {
  id: serial('id').primaryKey(),
  a2fId: integer('a2f_id')
    .notNull()
    .references(() => a2fPipeline.id, { onDelete: 'cascade' }),
  stage: a2fDdStageEnum('stage').notNull(),
  submittedById: text('submitted_by_id').references(() => users.id, { onDelete: 'set null' }),

  // 11-category DD data stored as structured JSONB
  companyOverview: jsonb('company_overview'),
  financialDd: jsonb('financial_dd'),
  hrAndRisk: jsonb('hr_and_risk'),
  impactEsg: jsonb('impact_esg'),
  exitStrategy: text('exit_strategy'),

  // Additional DD categories
  managementTeam: jsonb('management_team'),
  legalCompliance: jsonb('legal_compliance'),
  marketPosition: jsonb('market_position'),
  operationalCapacity: jsonb('operational_capacity'),
  technologySystems: jsonb('technology_systems'),
  customerSupplierRelations: jsonb('customer_supplier_relations'),

  isComplete: boolean('is_complete').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  a2fIdIdx: index('a2f_dd_reports_a2f_id_idx').on(table.a2fId),
  stageIdx: index('a2f_dd_reports_stage_idx').on(table.stage),
}));

/**
 * Stores Pre-IC scoring results per pipeline entry.
 * Two scoring rubric variants: Repayable Grant (max 110) and Matching Grant (max 110).
 *
 * JSONB `scores` shape:
 *  Repayable:  { repaymentCapacity, marketScalability, impactInclusion, investmentPlan, bonus }
 *  Matching:   { financialReadiness, marketScalability, impactInclusion, investmentLeverage, bonus }
 */
export const a2fScoring = pgTable('a2f_scoring', {
  id: serial('id').primaryKey(),
  a2fId: integer('a2f_id')
    .notNull()
    .references(() => a2fPipeline.id, { onDelete: 'cascade' }),
  scorerId: text('scorer_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  instrumentType: a2fInstrumentTypeEnum('instrument_type').notNull(),
  scores: jsonb('scores').notNull(),
  totalScore: integer('total_score').notNull().default(0),
  bonusPoints: integer('bonus_points').notNull().default(0),
  scorerNotes: text('scorer_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  a2fIdIdx: index('a2f_scoring_a2f_id_idx').on(table.a2fId),
  scorerIdIdx: index('a2f_scoring_scorer_id_idx').on(table.scorerId),
}));

/**
 * Stores Investment Committee documents — GAIR and Investment Memos.
 * Auto-populated from DD reports; supports multi-member IC approval.
 *
 * JSONB `content` shape:
 *  { risks, mitigations, sourceOfFunds, usesOfFunds, strengths, weaknesses, narrative }
 */
export const investmentAppraisals = pgTable('investment_appraisals', {
  id: serial('id').primaryKey(),
  a2fId: integer('a2f_id')
    .notNull()
    .references(() => a2fPipeline.id, { onDelete: 'cascade' }),
  documentType: a2fDocumentTypeEnum('document_type').notNull(),
  content: jsonb('content').notNull(),
  icApprovalStatus: boolean('ic_approval_status').default(false).notNull(),
  approvedBy: jsonb('approved_by').$type<string[]>().default([]),
  generatedDocumentUrl: text('generated_document_url'),
  preparedById: text('prepared_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  a2fIdIdx: index('investment_appraisals_a2f_id_idx').on(table.a2fId),
  docTypeIdx: index('investment_appraisals_doc_type_idx').on(table.documentType),
}));

/**
 * Records the formal Grant Agreement for each funded enterprise.
 * Matching Grant: tracks HiH + enterprise co-contributions.
 * Repayable Grant: 24-month term, 3-month grace, 6% interest by default.
 */
export const grantAgreements = pgTable('grant_agreements', {
  id: serial('id').primaryKey(),
  a2fId: integer('a2f_id')
    .notNull()
    .references(() => a2fPipeline.id, { onDelete: 'cascade' }),
  agreementType: a2fAgreementTypeEnum('agreement_type').notNull(),
  totalProjectAmount: decimal('total_project_amount', { precision: 14, scale: 2 }).notNull(),
  hihContribution: decimal('hih_contribution', { precision: 14, scale: 2 }).notNull(),
  enterpriseContribution: decimal('enterprise_contribution', { precision: 14, scale: 2 }).default('0'),

  // Repayable grant terms (defaults per spec)
  termMonths: integer('term_months').default(24),
  interestRate: decimal('interest_rate', { precision: 5, scale: 2 }).default('6.0'),
  gracePeriodMonths: integer('grace_period_months').default(3),

  // Document lifecycle
  offerLetterUrl: text('offer_letter_url'),
  signedDocumentUrl: text('signed_document_url'),
  offerSentAt: timestamp('offer_sent_at'),
  signedAt: timestamp('signed_at'),
  isFullyExecuted: boolean('is_fully_executed').default(false).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  a2fIdIdx: index('grant_agreements_a2f_id_idx').on(table.a2fId),
  agreementTypeIdx: index('grant_agreements_agreement_type_idx').on(table.agreementType),
}));

/**
 * Ledger of all disbursements and repayments against a Grant Agreement.
 * Proof documents (receipts/bank slips) uploaded via UploadThing.
 */
export const disbursementsAndRepayments = pgTable('disbursements_and_repayments', {
  id: serial('id').primaryKey(),
  agreementId: integer('agreement_id')
    .notNull()
    .references(() => grantAgreements.id, { onDelete: 'cascade' }),
  transactionType: a2fTransactionTypeEnum('transaction_type').notNull(),
  amount: decimal('amount', { precision: 14, scale: 2 }).notNull(),
  transactionDate: timestamp('transaction_date').notNull(),
  proofDocumentUrl: text('proof_document_url'),
  status: a2fTransactionStatusEnum('status').default('pending').notNull(),
  verifiedById: text('verified_by_id').references(() => users.id, { onDelete: 'set null' }),
  verifiedAt: timestamp('verified_at'),
  rejectionReason: text('rejection_reason'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  agreementIdIdx: index('disbursements_agreement_id_idx').on(table.agreementId),
  transactionTypeIdx: index('disbursements_transaction_type_idx').on(table.transactionType),
  statusIdx: index('disbursements_status_idx').on(table.status),
  transactionDateIdx: index('disbursements_transaction_date_idx').on(table.transactionDate),
}));

// --- Relations ---

export const a2fPipelineRelations = relations(a2fPipeline, ({ one, many }) => ({
  application: one(applications, {
    fields: [a2fPipeline.applicationId],
    references: [applications.id],
  }),
  a2fOfficer: one(users, {
    fields: [a2fPipeline.a2fOfficerId],
    references: [users.id],
  }),
  dueDiligenceReports: many(a2fDueDiligenceReports),
  scoringRecords: many(a2fScoring),
  investmentAppraisals: many(investmentAppraisals),
  grantAgreements: many(grantAgreements),
}));

export const a2fDueDiligenceReportsRelations = relations(a2fDueDiligenceReports, ({ one }) => ({
  a2fPipeline: one(a2fPipeline, {
    fields: [a2fDueDiligenceReports.a2fId],
    references: [a2fPipeline.id],
  }),
  submittedBy: one(users, {
    fields: [a2fDueDiligenceReports.submittedById],
    references: [users.id],
  }),
}));

export const a2fScoringRelations = relations(a2fScoring, ({ one }) => ({
  a2fPipeline: one(a2fPipeline, {
    fields: [a2fScoring.a2fId],
    references: [a2fPipeline.id],
  }),
  scorer: one(users, {
    fields: [a2fScoring.scorerId],
    references: [users.id],
  }),
}));

export const investmentAppraisalsRelations = relations(investmentAppraisals, ({ one }) => ({
  a2fPipeline: one(a2fPipeline, {
    fields: [investmentAppraisals.a2fId],
    references: [a2fPipeline.id],
  }),
  preparedBy: one(users, {
    fields: [investmentAppraisals.preparedById],
    references: [users.id],
  }),
}));

export const grantAgreementsRelations = relations(grantAgreements, ({ one, many }) => ({
  a2fPipeline: one(a2fPipeline, {
    fields: [grantAgreements.a2fId],
    references: [a2fPipeline.id],
  }),
  transactions: many(disbursementsAndRepayments),
}));

export const disbursementsAndRepaymentsRelations = relations(disbursementsAndRepayments, ({ one }) => ({
  grantAgreement: one(grantAgreements, {
    fields: [disbursementsAndRepayments.agreementId],
    references: [grantAgreements.id],
  }),
  verifiedBy: one(users, {
    fields: [disbursementsAndRepayments.verifiedById],
    references: [users.id],
  }),
}));

// --- A2F Type Exports ---

export type A2fPipeline = typeof a2fPipeline.$inferSelect;
export type NewA2fPipeline = typeof a2fPipeline.$inferInsert;

export type A2fDueDiligenceReport = typeof a2fDueDiligenceReports.$inferSelect;
export type NewA2fDueDiligenceReport = typeof a2fDueDiligenceReports.$inferInsert;

export type A2fScoring = typeof a2fScoring.$inferSelect;
export type NewA2fScoring = typeof a2fScoring.$inferInsert;

export type InvestmentAppraisal = typeof investmentAppraisals.$inferSelect;
export type NewInvestmentAppraisal = typeof investmentAppraisals.$inferInsert;

export type GrantAgreement = typeof grantAgreements.$inferSelect;
export type NewGrantAgreement = typeof grantAgreements.$inferInsert;

export type DisbursementOrRepayment = typeof disbursementsAndRepayments.$inferSelect;
export type NewDisbursementOrRepayment = typeof disbursementsAndRepayments.$inferInsert;

export type KycProfile = typeof kycProfiles.$inferSelect;
export type NewKycProfile = typeof kycProfiles.$inferInsert;

export type KycDocument = typeof kycDocuments.$inferSelect;
export type NewKycDocument = typeof kycDocuments.$inferInsert;

export type KycFieldChange = typeof kycFieldChanges.$inferSelect;
export type NewKycFieldChange = typeof kycFieldChanges.$inferInsert;

export type KycChangeRequest = typeof kycChangeRequests.$inferSelect;
export type NewKycChangeRequest = typeof kycChangeRequests.$inferInsert;

export type Mentor = typeof mentors.$inferSelect;
export type NewMentor = typeof mentors.$inferInsert;

export type MentorshipMatch = typeof mentorshipMatches.$inferSelect;
export type NewMentorshipMatch = typeof mentorshipMatches.$inferInsert;

export type MentorshipSession = typeof mentorshipSessions.$inferSelect;
export type NewMentorshipSession = typeof mentorshipSessions.$inferInsert;

export type MentorshipActionItem = typeof mentorshipActionItems.$inferSelect;
export type NewMentorshipActionItem = typeof mentorshipActionItems.$inferInsert;

export type CnaDiagnostic = typeof cnaDiagnostics.$inferSelect;
export type NewCnaDiagnostic = typeof cnaDiagnostics.$inferInsert;

export type CapacityDevelopmentPlan = typeof capacityDevelopmentPlans.$inferSelect;
export type NewCapacityDevelopmentPlan = typeof capacityDevelopmentPlans.$inferInsert;

export type CdpFocusSummaryRow = typeof cdpFocusSummary.$inferSelect;
export type NewCdpFocusSummaryRow = typeof cdpFocusSummary.$inferInsert;

export type CdpActivity = typeof cdpActivities.$inferSelect;
export type NewCdpActivity = typeof cdpActivities.$inferInsert;

export type CdpBusinessSupportSession = typeof cdpBusinessSupportSessions.$inferSelect;
export type NewCdpBusinessSupportSession = typeof cdpBusinessSupportSessions.$inferInsert;

export type CdpActivityProgressReview = typeof cdpActivityProgressReviews.$inferSelect;
export type NewCdpActivityProgressReview = typeof cdpActivityProgressReviews.$inferInsert;

export type CdpObjective = typeof cdpObjectives.$inferSelect;
export type NewCdpObjective = typeof cdpObjectives.$inferInsert;

export type CdpKeyResult = typeof cdpKeyResults.$inferSelect;
export type NewCdpKeyResult = typeof cdpKeyResults.$inferInsert;

export type CdpWeeklyMilestone = typeof cdpWeeklyMilestones.$inferSelect;
export type NewCdpWeeklyMilestone = typeof cdpWeeklyMilestones.$inferInsert;

export type CdpSessionActionItem = typeof cdpSessionActionItems.$inferSelect;
export type NewCdpSessionActionItem = typeof cdpSessionActionItems.$inferInsert;

export type CdpEndlineResponse = typeof cdpEndlineResponses.$inferSelect;
export type NewCdpEndlineResponse = typeof cdpEndlineResponses.$inferInsert;

export type BdsIntervention = typeof bdsInterventions.$inferSelect;
export type NewBdsIntervention = typeof bdsInterventions.$inferInsert;

export type BusinessPerformanceMetric = typeof businessPerformanceMetrics.$inferSelect;
export type NewBusinessPerformanceMetric = typeof businessPerformanceMetrics.$inferInsert;

export type AiReportQuery = typeof aiReportQueries.$inferSelect;
export type NewAiReportQuery = typeof aiReportQueries.$inferInsert;

export type KajabiUserMapping = typeof kajabiUserMapping.$inferSelect;
export type NewKajabiUserMapping = typeof kajabiUserMapping.$inferInsert;

export type KajabiProgressWebhook = typeof kajabiProgressWebhooks.$inferSelect;
export type NewKajabiProgressWebhook = typeof kajabiProgressWebhooks.$inferInsert;
