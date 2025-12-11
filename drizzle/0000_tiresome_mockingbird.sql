CREATE TYPE "public"."application_status" AS ENUM('draft', 'submitted', 'under_review', 'pending_senior_review', 'shortlisted', 'scoring_phase', 'dragons_den', 'finalist', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."application_track" AS ENUM('foundation', 'acceleration');--> statement-breakpoint
CREATE TYPE "public"."business_registration_type" AS ENUM('limited_company', 'partnership', 'cooperative', 'self_help_group_cbo', 'sole_proprietorship', 'other');--> statement-breakpoint
CREATE TYPE "public"."business_sector" AS ENUM('agriculture_and_agribusiness', 'manufacturing', 'renewable_energy', 'water_management', 'waste_management', 'forestry', 'tourism', 'transport', 'construction', 'ict', 'trade', 'healthcare', 'education', 'other');--> statement-breakpoint
CREATE TYPE "public"."country" AS ENUM('ghana', 'kenya', 'nigeria', 'rwanda', 'tanzania');--> statement-breakpoint
CREATE TYPE "public"."customer_segment" AS ENUM('household_individuals', 'micro_small_medium_enterprises', 'institutions', 'corporates', 'government_and_ngos', 'other');--> statement-breakpoint
CREATE TYPE "public"."education_level" AS ENUM('primary_school_and_below', 'high_school', 'technical_college', 'undergraduate', 'postgraduate');--> statement-breakpoint
CREATE TYPE "public"."feedback_campaign_status" AS ENUM('draft', 'scheduled', 'sending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."feedback_email_status" AS ENUM('pending', 'sending', 'sent', 'failed', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."funding_instrument" AS ENUM('debt', 'equity', 'quasi', 'other');--> statement-breakpoint
CREATE TYPE "public"."funding_source" AS ENUM('high_net_worth_individual', 'financial_institutions', 'government_agency', 'local_or_international_ngo', 'other');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."kenya_county" AS ENUM('baringo', 'bomet', 'bungoma', 'busia', 'elgeyo_marakwet', 'embu', 'garissa', 'homa_bay', 'isiolo', 'kajiado', 'kakamega', 'kericho', 'kiambu', 'kilifi', 'kirinyaga', 'kisii', 'kisumu', 'kitui', 'kwale', 'laikipia', 'lamu', 'machakos', 'makueni', 'mandera', 'marsabit', 'meru', 'migori', 'mombasa', 'muranga', 'nairobi', 'nakuru', 'nandi', 'narok', 'nyamira', 'nyandarua', 'nyeri', 'samburu', 'siaya', 'taita_taveta', 'tana_river', 'tharaka_nithi', 'trans_nzoia', 'turkana', 'uasin_gishu', 'vihiga', 'wajir', 'west_pokot');--> statement-breakpoint
CREATE TYPE "public"."revenue_band" AS ENUM('below_500k', '500k_to_3m', '3m_to_10m', '10m_to_50m', 'above_50m');--> statement-breakpoint
CREATE TYPE "public"."support_category" AS ENUM('technical_issue', 'application_help', 'account_problem', 'payment_issue', 'feature_request', 'bug_report', 'general_inquiry', 'other');--> statement-breakpoint
CREATE TYPE "public"."support_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."support_status" AS ENUM('open', 'in_progress', 'waiting_for_user', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('applicant', 'admin', 'technical_reviewer');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'rejected', 'needs_info');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"idToken" text,
	"password" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applicants" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"id_passport_number" varchar(50) NOT NULL,
	"gender" "gender" NOT NULL,
	"dob" date NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"email" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "applicants_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "application_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"eligibility_result_id" integer NOT NULL,
	"criteria_id" integer NOT NULL,
	"config_id" integer,
	"score" numeric(5, 2) NOT NULL,
	"reviewer_comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_id" integer NOT NULL,
	"track" "application_track",
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"referral_source" varchar(100),
	"referral_source_other" varchar(100),
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicant_id" integer NOT NULL,
	"name" text NOT NULL,
	"is_registered" boolean NOT NULL,
	"registration_type" "business_registration_type",
	"registration_certificate_url" varchar(500),
	"sector" "business_sector" NOT NULL,
	"sector_other" text,
	"description" text NOT NULL,
	"problem_solved" text NOT NULL,
	"country" "country" NOT NULL,
	"county" "kenya_county",
	"city" varchar(100) NOT NULL,
	"years_operational" integer NOT NULL,
	"has_financial_records" boolean NOT NULL,
	"financial_records_url" varchar(500),
	"has_audited_accounts" boolean NOT NULL,
	"audited_accounts_url" varchar(500),
	"revenue_last_year" numeric(12, 2) NOT NULL,
	"customer_count" integer,
	"has_external_funding" boolean,
	"external_funding_details" text,
	"business_model_innovation" text,
	"digitization_level" boolean,
	"digitization_reason" text,
	"relative_pricing" text,
	"product_differentiation" text,
	"threat_of_substitutes" text,
	"competitor_overview" text,
	"ease_of_market_entry" text,
	"environmental_impact" text,
	"environmental_impact_description" text,
	"full_time_employees_total" integer,
	"full_time_employees_women" integer,
	"full_time_employees_youth" integer,
	"full_time_employees_pwd" integer,
	"business_compliance" text,
	"compliance_documents_url" varchar(500),
	"growth_history" text,
	"average_annual_revenue_growth" text,
	"future_sales_growth" text,
	"future_sales_growth_reason" text,
	"job_creation_potential" text,
	"projected_inclusion" text,
	"scalability_plan" text,
	"market_scale_potential" text,
	"market_differentiation" text,
	"competitive_advantage" text,
	"competitive_advantage_source" text,
	"technology_integration" text,
	"sales_marketing_integration" text,
	"sales_marketing_approach" text,
	"social_impact_contribution" text,
	"supplier_involvement" text,
	"supplier_support_description" text,
	"business_model_uniqueness" text,
	"business_model_uniqueness_description" text,
	"customer_value_proposition" text,
	"competitive_advantage_strength" text,
	"competitive_advantage_barriers" text,
	"sales_evidence_url" varchar(500),
	"photos_url" varchar(500),
	"tax_compliance_url" varchar(500),
	"funding_details" text,
	"has_social_safeguarding" boolean,
	"declaration_name" text,
	"declaration_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eligibility_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"scoring_config_id" integer,
	"is_eligible" boolean NOT NULL,
	"age_eligible" boolean NOT NULL,
	"registration_eligible" boolean NOT NULL,
	"revenue_eligible" boolean NOT NULL,
	"business_plan_eligible" boolean NOT NULL,
	"impact_eligible" boolean NOT NULL,
	"total_score" numeric(5, 2) DEFAULT '0',
	"commercial_viability_score" numeric(5, 2),
	"business_model_score" numeric(5, 2),
	"market_potential_score" numeric(5, 2),
	"social_impact_score" numeric(5, 2),
	"revenue_growth_score" numeric(5, 2),
	"scalability_score" numeric(5, 2),
	"reviewer1_score" numeric(5, 2),
	"reviewer1_notes" text,
	"reviewer1_id" text,
	"reviewer1_at" timestamp,
	"reviewer2_score" numeric(5, 2),
	"reviewer2_notes" text,
	"reviewer2_id" text,
	"reviewer2_at" timestamp,
	"reviewer2_overrode_reviewer1" boolean DEFAULT false,
	"evaluated_by" text,
	"evaluated_at" timestamp,
	"evaluation_notes" text,
	"is_locked" boolean DEFAULT false,
	"locked_by" text,
	"locked_at" timestamp,
	"lock_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "eligibility_results_application_id_unique" UNIQUE("application_id")
);
--> statement-breakpoint
CREATE TABLE "email_verification_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false,
	"attempts" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"full_time_male" integer DEFAULT 0,
	"full_time_female" integer DEFAULT 0,
	"part_time_male" integer DEFAULT 0,
	"part_time_female" integer DEFAULT 0,
	"total_employees" integer GENERATED ALWAYS AS ("full_time_male" + "full_time_female" + "part_time_male" + "part_time_female") STORED,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject" varchar(255),
	"email_body" text,
	"feedback_form_url" varchar(500),
	"link_display_text" varchar(255),
	"description" text,
	"target_role" "user_role",
	"status" "feedback_campaign_status" DEFAULT 'draft' NOT NULL,
	"batch_size" integer DEFAULT 50,
	"total_recipients" integer DEFAULT 0,
	"sent_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"started_at" timestamp,
	"completed_at" timestamp,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"recipient_id" text NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"recipient_name" varchar(255) NOT NULL,
	"batch_number" integer DEFAULT 1 NOT NULL,
	"status" "feedback_email_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"failed_at" timestamp,
	"retry_count" integer DEFAULT 0,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "funding" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"has_external_funding" boolean NOT NULL,
	"funding_source" "funding_source",
	"funder_name" text,
	"amount_usd" numeric(12, 2),
	"funding_date" date,
	"funding_instrument" "funding_instrument",
	"repayment_terms" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scoring_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scoring_criteria" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" integer,
	"category" text NOT NULL,
	"criteria_name" text NOT NULL,
	"track" "application_track" NOT NULL,
	"weight" integer NOT NULL,
	"scoring_logic" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "support_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"responder_id" text NOT NULL,
	"responder_name" text NOT NULL,
	"responder_role" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"attachment_url" varchar(500),
	"is_internal" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ticket_number" varchar(20) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"category" "support_category" NOT NULL,
	"priority" "support_priority" DEFAULT 'medium' NOT NULL,
	"status" "support_status" DEFAULT 'open' NOT NULL,
	"assigned_to" text,
	"resolution" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	CONSTRAINT "support_tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "target_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"customer_segment" "customer_segment" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" varchar(500) NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"sender_id" text NOT NULL,
	"message" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'applicant' NOT NULL,
	"profile_image" text,
	"phone_number" varchar(20),
	"country" varchar(100),
	"organization" text,
	"bio" text,
	"is_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean NOT NULL,
	"image" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"password" text,
	"role" text DEFAULT 'user',
	"last_active" timestamp DEFAULT now(),
	"is_online" boolean DEFAULT false,
	"profile_photo" text,
	"phone_number" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_scores" ADD CONSTRAINT "application_scores_eligibility_result_id_eligibility_results_id_fk" FOREIGN KEY ("eligibility_result_id") REFERENCES "public"."eligibility_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_scores" ADD CONSTRAINT "application_scores_criteria_id_scoring_criteria_id_fk" FOREIGN KEY ("criteria_id") REFERENCES "public"."scoring_criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_scores" ADD CONSTRAINT "application_scores_config_id_scoring_configurations_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."scoring_configurations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD CONSTRAINT "eligibility_results_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD CONSTRAINT "eligibility_results_reviewer1_id_user_id_fk" FOREIGN KEY ("reviewer1_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD CONSTRAINT "eligibility_results_reviewer2_id_user_id_fk" FOREIGN KEY ("reviewer2_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD CONSTRAINT "eligibility_results_locked_by_user_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_campaigns" ADD CONSTRAINT "feedback_campaigns_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_emails" ADD CONSTRAINT "feedback_emails_campaign_id_feedback_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."feedback_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_emails" ADD CONSTRAINT "feedback_emails_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding" ADD CONSTRAINT "funding_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_criteria" ADD CONSTRAINT "scoring_criteria_config_id_scoring_configurations_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."scoring_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_responses" ADD CONSTRAINT "support_responses_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_responses" ADD CONSTRAINT "support_responses_responder_id_user_id_fk" FOREIGN KEY ("responder_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_customers" ADD CONSTRAINT "target_customers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_message_id_ticket_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."ticket_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_verification_codes_email_idx" ON "email_verification_codes" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_verification_codes_code_idx" ON "email_verification_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "email_verification_codes_expires_at_idx" ON "email_verification_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "support_responses_ticket_id_idx" ON "support_responses" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "support_responses_responder_id_idx" ON "support_responses" USING btree ("responder_id");--> statement-breakpoint
CREATE INDEX "support_responses_created_at_idx" ON "support_responses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_profiles_user_id_idx" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_profiles_email_idx" ON "user_profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_profiles_role_idx" ON "user_profiles" USING btree ("role");