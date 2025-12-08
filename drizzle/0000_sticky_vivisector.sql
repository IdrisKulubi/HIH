CREATE TYPE "public"."application_status" AS ENUM('draft', 'submitted', 'under_review', 'shortlisted', 'scoring_phase', 'dragons_den', 'finalist', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."application_track" AS ENUM('foundation', 'acceleration');--> statement-breakpoint
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
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "applicants" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"id_passport_number" varchar(50) NOT NULL,
	"gender" "gender" NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"email" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "applicants_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "application_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"criteria_id" integer NOT NULL,
	"config_id" integer NOT NULL,
	"score" integer NOT NULL,
	"max_score" integer NOT NULL,
	"level" varchar(100),
	"notes" text,
	"evaluated_by" text,
	"evaluated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"verifier_id" text NOT NULL,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"comments" text,
	"reviewed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
	"business_model_innovation" text,
	"relative_pricing" text,
	"product_differentiation" text,
	"threat_of_substitutes" text,
	"ease_of_market_entry" text,
	"environmental_impact" text,
	"special_groups_employed" integer,
	"business_compliance" text,
	"future_sales_growth" text,
	"current_special_groups_employed" integer,
	"job_creation_potential" text,
	"market_differentiation" text,
	"competitive_advantage" text,
	"offering_focus" text,
	"sales_marketing_integration" text,
	"social_impact_household" text,
	"supplier_involvement" text,
	"business_model_uniqueness" text,
	"customer_value_proposition" text,
	"competitive_advantage_strength" text,
	"sales_evidence_url" varchar(500),
	"photos_url" varchar(500),
	"tax_compliance_url" varchar(500),
	"funding_details" text,
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
	"market_potential_score" integer,
	"innovation_score" integer,
	"climate_adaptation_score" integer,
	"job_creation_score" integer,
	"viability_score" integer,
	"management_capacity_score" integer,
	"location_bonus" integer,
	"gender_bonus" integer,
	"custom_scores" text,
	"total_score" integer,
	"evaluation_notes" text,
	"evaluated_at" timestamp DEFAULT now() NOT NULL,
	"evaluated_by" text,
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
CREATE TABLE "evaluation_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"previous_config_id" integer,
	"new_config_id" integer NOT NULL,
	"previous_total_score" integer,
	"new_total_score" integer,
	"previous_is_eligible" boolean,
	"new_is_eligible" boolean,
	"change_reason" text,
	"evaluated_by" text NOT NULL,
	"evaluated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject" text NOT NULL,
	"email_body" text NOT NULL,
	"feedback_form_url" text NOT NULL,
	"link_display_text" varchar(100) DEFAULT 'Share Your Feedback',
	"status" "feedback_campaign_status" DEFAULT 'draft' NOT NULL,
	"batch_size" integer DEFAULT 5 NOT NULL,
	"total_recipients" integer DEFAULT 0,
	"sent_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"created_by" text NOT NULL,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"recipient_name" varchar(255) NOT NULL,
	"status" "feedback_email_status" DEFAULT 'pending' NOT NULL,
	"batch_number" integer NOT NULL,
	"sent_at" timestamp,
	"failed_at" timestamp,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"responded" boolean DEFAULT false,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scoring_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"version" varchar(50) DEFAULT '1.0' NOT NULL,
	"is_active" boolean DEFAULT false,
	"is_default" boolean DEFAULT false,
	"total_max_score" integer DEFAULT 100 NOT NULL,
	"pass_threshold" integer DEFAULT 60 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scoring_criteria" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" integer NOT NULL,
	"category" varchar(100) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"max_points" integer NOT NULL,
	"weightage" numeric(5, 2),
	"scoring_levels" text,
	"evaluation_type" varchar(50) DEFAULT 'manual',
	"sort_order" integer DEFAULT 0,
	"is_required" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
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
	"ticket_number" varchar(20) NOT NULL,
	"user_id" text NOT NULL,
	"category" "support_category" NOT NULL,
	"priority" "support_priority" DEFAULT 'medium' NOT NULL,
	"status" "support_status" DEFAULT 'open' NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"user_name" text NOT NULL,
	"attachment_url" varchar(500),
	"assigned_to" text,
	"resolved_at" timestamp,
	"resolved_by" text,
	"resolution_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "support_tickets_ticket_number_unique" UNIQUE("ticket_number")
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
	"name" text,
	"email" text NOT NULL,
	"password" text,
	"role" text DEFAULT 'user',
	"emailVerified" timestamp,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_active" timestamp DEFAULT now() NOT NULL,
	"is_online" boolean DEFAULT false,
	"profile_photo" text,
	"phone_number" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_scores" ADD CONSTRAINT "application_scores_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_scores" ADD CONSTRAINT "application_scores_criteria_id_scoring_criteria_id_fk" FOREIGN KEY ("criteria_id") REFERENCES "public"."scoring_criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_scores" ADD CONSTRAINT "application_scores_config_id_scoring_configurations_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."scoring_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_verifications" ADD CONSTRAINT "application_verifications_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_verifications" ADD CONSTRAINT "application_verifications_verifier_id_user_id_fk" FOREIGN KEY ("verifier_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD CONSTRAINT "eligibility_results_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_history" ADD CONSTRAINT "evaluation_history_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_history" ADD CONSTRAINT "evaluation_history_new_config_id_scoring_configurations_id_fk" FOREIGN KEY ("new_config_id") REFERENCES "public"."scoring_configurations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_campaigns" ADD CONSTRAINT "feedback_campaigns_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_emails" ADD CONSTRAINT "feedback_emails_campaign_id_feedback_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."feedback_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoring_criteria" ADD CONSTRAINT "scoring_criteria_config_id_scoring_configurations_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."scoring_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_responses" ADD CONSTRAINT "support_responses_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_responses" ADD CONSTRAINT "support_responses_responder_id_user_id_fk" FOREIGN KEY ("responder_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_verification_codes_email_idx" ON "email_verification_codes" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_verification_codes_code_idx" ON "email_verification_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "email_verification_codes_expires_at_idx" ON "email_verification_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "feedback_campaigns_status_idx" ON "feedback_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "feedback_campaigns_created_by_idx" ON "feedback_campaigns" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "feedback_campaigns_created_at_idx" ON "feedback_campaigns" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "feedback_emails_campaign_id_idx" ON "feedback_emails" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "feedback_emails_status_idx" ON "feedback_emails" USING btree ("status");--> statement-breakpoint
CREATE INDEX "feedback_emails_recipient_email_idx" ON "feedback_emails" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "feedback_emails_batch_number_idx" ON "feedback_emails" USING btree ("batch_number");--> statement-breakpoint
CREATE INDEX "support_responses_ticket_id_idx" ON "support_responses" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "support_responses_responder_id_idx" ON "support_responses" USING btree ("responder_id");--> statement-breakpoint
CREATE INDEX "support_responses_created_at_idx" ON "support_responses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "support_tickets_ticket_number_idx" ON "support_tickets" USING btree ("ticket_number");--> statement-breakpoint
CREATE INDEX "support_tickets_user_id_idx" ON "support_tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "support_tickets_category_idx" ON "support_tickets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "support_tickets_priority_idx" ON "support_tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "support_tickets_created_at_idx" ON "support_tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_profiles_user_id_idx" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_profiles_email_idx" ON "user_profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_profiles_role_idx" ON "user_profiles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_created_at_idx" ON "user" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_last_active_idx" ON "user" USING btree ("last_active");