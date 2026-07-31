CREATE TYPE "public"."mel_monitoring_status" AS ENUM('draft', 'submitted', 'returned', 'resubmitted');
CREATE TYPE "public"."mel_monitoring_source_mode" AS ENUM('current', 'catch_up');
CREATE TYPE "public"."mel_job_type" AS ENUM('direct', 'indirect');
CREATE TYPE "public"."mel_evidence_status" AS ENUM('active', 'removed');
CREATE TYPE "public"."mel_achievement_status" AS ENUM('pending', 'approved', 'rejected');

CREATE TABLE "mel_enterprise_assignments" (
  "id" serial PRIMARY KEY NOT NULL, "business_id" integer NOT NULL, "collector_id" text NOT NULL,
  "assigned_by_id" text, "is_active" boolean DEFAULT true NOT NULL,
  "assigned_at" timestamp DEFAULT now() NOT NULL, "ended_at" timestamp
);

CREATE TABLE "mel_monitoring_submissions" (
  "id" serial PRIMARY KEY NOT NULL, "business_id" integer NOT NULL, "reporting_period_id" integer NOT NULL,
  "instrument_code" varchar(80) DEFAULT 'quarterly_enterprise_monitoring' NOT NULL,
  "collector_id" text NOT NULL, "collector_role" varchar(50) NOT NULL, "assigned_redo_id" text,
  "source_mode" "mel_monitoring_source_mode" DEFAULT 'current' NOT NULL, "visit_date" date,
  "status" "mel_monitoring_status" DEFAULT 'draft' NOT NULL, "submission_version" integer DEFAULT 1 NOT NULL,
  "return_count" integer DEFAULT 0 NOT NULL, "resubmission_count" integer DEFAULT 0 NOT NULL,
  "profile_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL, "instrument_version" integer DEFAULT 1 NOT NULL,
  "last_saved_at" timestamp DEFAULT now() NOT NULL, "submitted_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mel_monitoring_submission_version_positive_check" CHECK ("submission_version" > 0)
);

CREATE TABLE "mel_monitoring_responses" (
  "id" serial PRIMARY KEY NOT NULL, "submission_id" integer NOT NULL UNIQUE,
  "business_plan_improved" boolean, "revenue" numeric(18,2), "costs" numeric(18,2), "profit_loss" numeric(18,2),
  "financial_change_explanation" text, "market_research_completed" boolean, "market_intelligence_accessed" boolean,
  "new_market_segments" integer, "technology_adopted" boolean, "technology_details" text,
  "new_products_developed" boolean, "new_products_details" text, "linked_to_finance_provider" boolean,
  "finance_type" varchar(120), "finance_type_other" text, "finance_value" numeric(18,2),
  "financial_plan_completed" boolean, "active_insurance" boolean, "investor_readiness_completed" boolean,
  "life_cycle_assessment_completed" boolean, "eco_certification_active" boolean, "esg_report_completed" boolean,
  "social_safeguarding_guidelines" boolean, "circular_growth_reported" boolean, "circular_growth_value" numeric(18,2),
  "strategic_partnerships" boolean, "strategic_partnership_details" text, "forum_participation" boolean,
  "forum_details" text, "public_private_partnership" boolean, "public_private_partnership_details" text,
  "main_challenges" text, "negative_programme_impacts" text, "additional_support_needed" text,
  "collector_comment" text, "completed_sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mel_monitoring_responses_non_negative_financials_check" CHECK (
    ("revenue" IS NULL OR "revenue" >= 0) AND ("costs" IS NULL OR "costs" >= 0)
    AND ("finance_value" IS NULL OR "finance_value" >= 0)
    AND ("circular_growth_value" IS NULL OR "circular_growth_value" >= 0)
    AND ("new_market_segments" IS NULL OR "new_market_segments" >= 0)
  )
);

CREATE TABLE "mel_monitoring_jobs" (
  "id" serial PRIMARY KEY NOT NULL, "submission_id" integer NOT NULL, "job_type" "mel_job_type" NOT NULL,
  "quarterly_total" integer, "male" integer, "female" integer, "youth" integer, "plwd" integer, "refugee" integer,
  "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mel_monitoring_jobs_valid_breakdown_check" CHECK (
    ("quarterly_total" IS NULL OR "quarterly_total" >= 0) AND ("male" IS NULL OR "male" >= 0)
    AND ("female" IS NULL OR "female" >= 0) AND ("youth" IS NULL OR "youth" >= 0)
    AND ("plwd" IS NULL OR "plwd" >= 0) AND ("refugee" IS NULL OR "refugee" >= 0)
    AND ("quarterly_total" IS NULL OR "male" IS NULL OR "female" IS NULL OR "male" + "female" = "quarterly_total")
    AND ("quarterly_total" IS NULL OR "youth" IS NULL OR "youth" <= "quarterly_total")
    AND ("quarterly_total" IS NULL OR "plwd" IS NULL OR "plwd" <= "quarterly_total")
    AND ("quarterly_total" IS NULL OR "refugee" IS NULL OR "refugee" <= "quarterly_total")
  )
);

CREATE TABLE "mel_monitoring_waste" (
  "id" serial PRIMARY KEY NOT NULL, "submission_id" integer NOT NULL, "waste_stream" varchar(80) NOT NULL,
  "kilograms" numeric(18,3) DEFAULT 0 NOT NULL, "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mel_monitoring_waste_non_negative_check" CHECK ("kilograms" >= 0)
);

CREATE TABLE "mel_monitoring_evidence" (
  "id" serial PRIMARY KEY NOT NULL, "submission_id" integer NOT NULL, "question_code" varchar(100) NOT NULL,
  "file_key" varchar(255) NOT NULL, "file_url" text NOT NULL, "file_name" varchar(255) NOT NULL,
  "file_type" varchar(150) NOT NULL, "file_size" integer, "uploader_id" text, "replaces_evidence_id" integer,
  "status" "mel_evidence_status" DEFAULT 'active' NOT NULL, "removed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "mel_enterprise_achievements" (
  "id" serial PRIMARY KEY NOT NULL, "business_id" integer NOT NULL, "indicator_id" integer NOT NULL,
  "first_submission_id" integer NOT NULL, "evidence_id" integer,
  "status" "mel_achievement_status" DEFAULT 'pending' NOT NULL, "approved_period_id" integer,
  "approved_by_id" text, "approved_at" timestamp, "reopened_at" timestamp, "reopened_by_id" text,
  "reopened_reason" text, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "mel_enterprise_assignments" ADD CONSTRAINT "mel_enterprise_assignments_business_fk" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE cascade;
ALTER TABLE "mel_enterprise_assignments" ADD CONSTRAINT "mel_enterprise_assignments_collector_fk" FOREIGN KEY ("collector_id") REFERENCES "user"("id") ON DELETE cascade;
ALTER TABLE "mel_enterprise_assignments" ADD CONSTRAINT "mel_enterprise_assignments_assigner_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "user"("id") ON DELETE set null;
ALTER TABLE "mel_monitoring_submissions" ADD CONSTRAINT "mel_monitoring_submissions_business_fk" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE cascade;
ALTER TABLE "mel_monitoring_submissions" ADD CONSTRAINT "mel_monitoring_submissions_period_fk" FOREIGN KEY ("reporting_period_id") REFERENCES "mel_reporting_periods"("id") ON DELETE restrict;
ALTER TABLE "mel_monitoring_submissions" ADD CONSTRAINT "mel_monitoring_submissions_collector_fk" FOREIGN KEY ("collector_id") REFERENCES "user"("id") ON DELETE restrict;
ALTER TABLE "mel_monitoring_submissions" ADD CONSTRAINT "mel_monitoring_submissions_redo_fk" FOREIGN KEY ("assigned_redo_id") REFERENCES "user"("id") ON DELETE set null;
ALTER TABLE "mel_monitoring_responses" ADD CONSTRAINT "mel_monitoring_responses_submission_fk" FOREIGN KEY ("submission_id") REFERENCES "mel_monitoring_submissions"("id") ON DELETE cascade;
ALTER TABLE "mel_monitoring_jobs" ADD CONSTRAINT "mel_monitoring_jobs_submission_fk" FOREIGN KEY ("submission_id") REFERENCES "mel_monitoring_submissions"("id") ON DELETE cascade;
ALTER TABLE "mel_monitoring_waste" ADD CONSTRAINT "mel_monitoring_waste_submission_fk" FOREIGN KEY ("submission_id") REFERENCES "mel_monitoring_submissions"("id") ON DELETE cascade;
ALTER TABLE "mel_monitoring_evidence" ADD CONSTRAINT "mel_monitoring_evidence_submission_fk" FOREIGN KEY ("submission_id") REFERENCES "mel_monitoring_submissions"("id") ON DELETE cascade;
ALTER TABLE "mel_monitoring_evidence" ADD CONSTRAINT "mel_monitoring_evidence_uploader_fk" FOREIGN KEY ("uploader_id") REFERENCES "user"("id") ON DELETE set null;
ALTER TABLE "mel_monitoring_evidence" ADD CONSTRAINT "mel_monitoring_evidence_replaces_fk" FOREIGN KEY ("replaces_evidence_id") REFERENCES "mel_monitoring_evidence"("id") ON DELETE set null;
ALTER TABLE "mel_enterprise_achievements" ADD CONSTRAINT "mel_enterprise_achievements_business_fk" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE cascade;
ALTER TABLE "mel_enterprise_achievements" ADD CONSTRAINT "mel_enterprise_achievements_indicator_fk" FOREIGN KEY ("indicator_id") REFERENCES "mel_indicator_definitions"("id") ON DELETE restrict;
ALTER TABLE "mel_enterprise_achievements" ADD CONSTRAINT "mel_enterprise_achievements_submission_fk" FOREIGN KEY ("first_submission_id") REFERENCES "mel_monitoring_submissions"("id") ON DELETE restrict;
ALTER TABLE "mel_enterprise_achievements" ADD CONSTRAINT "mel_enterprise_achievements_evidence_fk" FOREIGN KEY ("evidence_id") REFERENCES "mel_monitoring_evidence"("id") ON DELETE set null;
ALTER TABLE "mel_enterprise_achievements" ADD CONSTRAINT "mel_enterprise_achievements_period_fk" FOREIGN KEY ("approved_period_id") REFERENCES "mel_reporting_periods"("id") ON DELETE set null;
ALTER TABLE "mel_enterprise_achievements" ADD CONSTRAINT "mel_enterprise_achievements_approver_fk" FOREIGN KEY ("approved_by_id") REFERENCES "user"("id") ON DELETE set null;
ALTER TABLE "mel_enterprise_achievements" ADD CONSTRAINT "mel_enterprise_achievements_reopener_fk" FOREIGN KEY ("reopened_by_id") REFERENCES "user"("id") ON DELETE set null;

CREATE UNIQUE INDEX "mel_enterprise_assignments_active_unique" ON "mel_enterprise_assignments" ("business_id", "collector_id") WHERE "is_active" = true;
CREATE INDEX "mel_enterprise_assignments_collector_idx" ON "mel_enterprise_assignments" ("collector_id", "is_active");
CREATE INDEX "mel_enterprise_assignments_business_idx" ON "mel_enterprise_assignments" ("business_id", "is_active");
CREATE UNIQUE INDEX "mel_monitoring_submission_business_period_instrument_unique" ON "mel_monitoring_submissions" ("business_id", "reporting_period_id", "instrument_code");
CREATE INDEX "mel_monitoring_submission_collector_idx" ON "mel_monitoring_submissions" ("collector_id", "status");
CREATE INDEX "mel_monitoring_submission_business_idx" ON "mel_monitoring_submissions" ("business_id");
CREATE INDEX "mel_monitoring_submission_period_idx" ON "mel_monitoring_submissions" ("reporting_period_id");
CREATE INDEX "mel_monitoring_responses_submission_idx" ON "mel_monitoring_responses" ("submission_id");
CREATE UNIQUE INDEX "mel_monitoring_jobs_submission_type_unique" ON "mel_monitoring_jobs" ("submission_id", "job_type");
CREATE INDEX "mel_monitoring_jobs_submission_idx" ON "mel_monitoring_jobs" ("submission_id");
CREATE UNIQUE INDEX "mel_monitoring_waste_submission_stream_unique" ON "mel_monitoring_waste" ("submission_id", "waste_stream");
CREATE INDEX "mel_monitoring_evidence_submission_idx" ON "mel_monitoring_evidence" ("submission_id");
CREATE INDEX "mel_monitoring_evidence_question_idx" ON "mel_monitoring_evidence" ("question_code", "status");
CREATE UNIQUE INDEX "mel_enterprise_achievements_business_indicator_unique" ON "mel_enterprise_achievements" ("business_id", "indicator_id");
CREATE INDEX "mel_enterprise_achievements_business_idx" ON "mel_enterprise_achievements" ("business_id", "status");
