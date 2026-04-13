CREATE TYPE "public"."action_item_status" AS ENUM('pending', 'partial', 'completed');--> statement-breakpoint
CREATE TYPE "public"."bds_status" AS ENUM('recommended', 'in_progress', 'completed', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."kyc_change_request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."kyc_document_type" AS ENUM('tax_compliance_certificate', 'cr12', 'bank_account_proof', 'programme_consent_form', 'director_id_document', 'additional_supporting_document');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('not_started', 'in_progress', 'submitted', 'needs_info', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."mentorship_match_status" AS ENUM('active', 'completed', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."profile_lock_status" AS ENUM('unlocked', 'locked', 'change_requested', 'change_approved');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('scheduled', 'completed', 'missed', 'rescheduled');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('physical', 'virtual');--> statement-breakpoint
CREATE TABLE "ai_report_queries" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" text NOT NULL,
	"query_text" text NOT NULL,
	"generated_summary" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bds_interventions" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"diagnostic_id" integer,
	"intervention_name" text NOT NULL,
	"status" "bds_status" DEFAULT 'recommended' NOT NULL,
	"provider_name" text,
	"completion_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"reporting_period" text NOT NULL,
	"revenue_generated" numeric(14, 2),
	"new_jobs_created" integer DEFAULT 0,
	"new_markets_entered" integer DEFAULT 0,
	"market_expansion_index" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cna_diagnostics" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"conducted_by_id" text,
	"financial_management_score" integer NOT NULL,
	"market_reach_score" integer NOT NULL,
	"operations_score" integer NOT NULL,
	"compliance_score" integer NOT NULL,
	"top_risk_area" text,
	"resilience_index" numeric(5, 2),
	"conducted_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kajabi_progress_webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"kajabi_external_id" varchar(255) NOT NULL,
	"course_id" varchar(255) NOT NULL,
	"event_title" varchar(255) NOT NULL,
	"payload" jsonb,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kajabi_user_mapping" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kajabi_external_id" varchar(255) NOT NULL,
	"has_active_access" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kajabi_user_mapping_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "kajabi_user_mapping_kajabi_external_id_unique" UNIQUE("kajabi_external_id")
);
--> statement-breakpoint
CREATE TABLE "kyc_change_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"kyc_profile_id" integer NOT NULL,
	"requested_by_id" text NOT NULL,
	"field_name" varchar(120) NOT NULL,
	"current_value" jsonb,
	"requested_value" jsonb,
	"reason" text NOT NULL,
	"status" "kyc_change_request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_id" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"kyc_profile_id" integer NOT NULL,
	"document_type" "kyc_document_type" NOT NULL,
	"file_url" varchar(500) NOT NULL,
	"file_name" varchar(255),
	"document_number" varchar(255),
	"notes" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_by_id" text,
	"verified_at" timestamp,
	"rejection_reason" text,
	"uploaded_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_field_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"kyc_profile_id" integer NOT NULL,
	"field_name" varchar(120) NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"is_core_field" boolean DEFAULT false NOT NULL,
	"changed_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"business_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"status" "kyc_status" DEFAULT 'not_started' NOT NULL,
	"profile_lock_status" "profile_lock_status" DEFAULT 'unlocked' NOT NULL,
	"gps_coordinates" varchar(255),
	"registration_type_confirmed" "business_registration_type",
	"kra_pin" varchar(100),
	"bank_name" varchar(255),
	"bank_account_name" varchar(255),
	"baseline_month_label" varchar(100),
	"baseline_revenue" numeric(14, 2),
	"baseline_employee_count" integer,
	"secondary_contact_name" varchar(255),
	"secondary_contact_phone" varchar(50),
	"secondary_contact_email" varchar(255),
	"review_notes" text,
	"rejection_reason" text,
	"needs_info_reason" text,
	"original_snapshot" jsonb,
	"submitted_snapshot" jsonb,
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"verified_at" timestamp,
	"verified_by_id" text,
	"locked_at" timestamp,
	"locked_by_id" text,
	"last_saved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kyc_profiles_application_id_unique" UNIQUE("application_id"),
	CONSTRAINT "kyc_profiles_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "mentors" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expertise_area" "business_sector" NOT NULL,
	"max_mentees" integer DEFAULT 3,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mentors_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "mentorship_action_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"description" text NOT NULL,
	"status" "action_item_status" DEFAULT 'pending' NOT NULL,
	"enterprise_feedback" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentorship_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"mentor_id" integer NOT NULL,
	"status" "mentorship_match_status" DEFAULT 'active' NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentorship_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"session_number" integer NOT NULL,
	"session_type" "session_type" NOT NULL,
	"status" "session_status" DEFAULT 'scheduled' NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"completed_date" timestamp,
	"diagnostic_notes" text,
	"photographic_evidence_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "kyc_status" "kyc_status" DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "kyc_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "selected_at" timestamp;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "kyc_submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "kyc_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "kyc_verified_by" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "verification_status" "verification_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_report_queries" ADD CONSTRAINT "ai_report_queries_admin_id_user_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bds_interventions" ADD CONSTRAINT "bds_interventions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bds_interventions" ADD CONSTRAINT "bds_interventions_diagnostic_id_cna_diagnostics_id_fk" FOREIGN KEY ("diagnostic_id") REFERENCES "public"."cna_diagnostics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_performance_metrics" ADD CONSTRAINT "business_performance_metrics_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cna_diagnostics" ADD CONSTRAINT "cna_diagnostics_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cna_diagnostics" ADD CONSTRAINT "cna_diagnostics_conducted_by_id_user_id_fk" FOREIGN KEY ("conducted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kajabi_user_mapping" ADD CONSTRAINT "kajabi_user_mapping_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_change_requests" ADD CONSTRAINT "kyc_change_requests_kyc_profile_id_kyc_profiles_id_fk" FOREIGN KEY ("kyc_profile_id") REFERENCES "public"."kyc_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_change_requests" ADD CONSTRAINT "kyc_change_requests_requested_by_id_user_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_change_requests" ADD CONSTRAINT "kyc_change_requests_reviewed_by_id_user_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_kyc_profile_id_kyc_profiles_id_fk" FOREIGN KEY ("kyc_profile_id") REFERENCES "public"."kyc_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_verified_by_id_user_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_uploaded_by_id_user_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_field_changes" ADD CONSTRAINT "kyc_field_changes_kyc_profile_id_kyc_profiles_id_fk" FOREIGN KEY ("kyc_profile_id") REFERENCES "public"."kyc_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_field_changes" ADD CONSTRAINT "kyc_field_changes_changed_by_id_user_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_profiles" ADD CONSTRAINT "kyc_profiles_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_profiles" ADD CONSTRAINT "kyc_profiles_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_profiles" ADD CONSTRAINT "kyc_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_profiles" ADD CONSTRAINT "kyc_profiles_verified_by_id_user_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_profiles" ADD CONSTRAINT "kyc_profiles_locked_by_id_user_id_fk" FOREIGN KEY ("locked_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentors" ADD CONSTRAINT "mentors_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_action_items" ADD CONSTRAINT "mentorship_action_items_session_id_mentorship_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."mentorship_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_matches" ADD CONSTRAINT "mentorship_matches_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_matches" ADD CONSTRAINT "mentorship_matches_mentor_id_mentors_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_sessions" ADD CONSTRAINT "mentorship_sessions_match_id_mentorship_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."mentorship_matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_report_queries_admin_id_idx" ON "ai_report_queries" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "bds_interventions_business_id_idx" ON "bds_interventions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "bds_interventions_diagnostic_id_idx" ON "bds_interventions" USING btree ("diagnostic_id");--> statement-breakpoint
CREATE INDEX "business_performance_metrics_business_id_idx" ON "business_performance_metrics" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "cna_diagnostics_business_id_idx" ON "cna_diagnostics" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "kajabi_progress_webhooks_external_id_idx" ON "kajabi_progress_webhooks" USING btree ("kajabi_external_id");--> statement-breakpoint
CREATE INDEX "kajabi_user_mapping_user_id_idx" ON "kajabi_user_mapping" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "kyc_change_requests_profile_id_idx" ON "kyc_change_requests" USING btree ("kyc_profile_id");--> statement-breakpoint
CREATE INDEX "kyc_change_requests_status_idx" ON "kyc_change_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kyc_change_requests_requested_by_idx" ON "kyc_change_requests" USING btree ("requested_by_id");--> statement-breakpoint
CREATE INDEX "kyc_documents_profile_id_idx" ON "kyc_documents" USING btree ("kyc_profile_id");--> statement-breakpoint
CREATE INDEX "kyc_documents_type_idx" ON "kyc_documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "kyc_field_changes_profile_id_idx" ON "kyc_field_changes" USING btree ("kyc_profile_id");--> statement-breakpoint
CREATE INDEX "kyc_field_changes_field_idx" ON "kyc_field_changes" USING btree ("field_name");--> statement-breakpoint
CREATE INDEX "kyc_profiles_application_id_idx" ON "kyc_profiles" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "kyc_profiles_business_id_idx" ON "kyc_profiles" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "kyc_profiles_user_id_idx" ON "kyc_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "kyc_profiles_status_idx" ON "kyc_profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kyc_profiles_lock_status_idx" ON "kyc_profiles" USING btree ("profile_lock_status");--> statement-breakpoint
CREATE INDEX "mentors_user_id_idx" ON "mentors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mentorship_action_items_session_id_idx" ON "mentorship_action_items" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "mentorship_matches_business_id_idx" ON "mentorship_matches" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "mentorship_matches_mentor_id_idx" ON "mentorship_matches" USING btree ("mentor_id");--> statement-breakpoint
CREATE INDEX "mentorship_sessions_match_id_idx" ON "mentorship_sessions" USING btree ("match_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mentorship_sessions_match_session_uq" ON "mentorship_sessions" USING btree ("match_id","session_number");--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_kyc_verified_by_user_id_fk" FOREIGN KEY ("kyc_verified_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;