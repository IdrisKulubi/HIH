ALTER TYPE "public"."mel_monitoring_status" ADD VALUE IF NOT EXISTS 'redo_review';
ALTER TYPE "public"."mel_monitoring_status" ADD VALUE IF NOT EXISTS 'returned_by_redo';
ALTER TYPE "public"."mel_monitoring_status" ADD VALUE IF NOT EXISTS 'mel_review';
ALTER TYPE "public"."mel_monitoring_status" ADD VALUE IF NOT EXISTS 'returned_by_mel';
ALTER TYPE "public"."mel_monitoring_status" ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE "public"."mel_monitoring_status" ADD VALUE IF NOT EXISTS 'reopened';
ALTER TYPE "public"."mel_monitoring_status" ADD VALUE IF NOT EXISTS 'voided';

ALTER TABLE "mel_monitoring_submissions" ADD COLUMN "approved_at" timestamp;
ALTER TABLE "mel_monitoring_submissions" ADD COLUMN "approved_by_id" text;
ALTER TABLE "mel_monitoring_submissions" ADD COLUMN "reopened_at" timestamp;
ALTER TABLE "mel_monitoring_submissions" ADD CONSTRAINT "mel_monitoring_submissions_approved_by_fk" FOREIGN KEY ("approved_by_id") REFERENCES "user"("id") ON DELETE set null;

CREATE TYPE "public"."mel_review_stage" AS ENUM('redo', 'mel', 'administrative');
CREATE TYPE "public"."mel_review_action" AS ENUM('advanced', 'returned', 'approved', 'reopened', 'voided', 'reassigned');
CREATE TYPE "public"."mel_dqa_category" AS ENUM('completeness', 'consistency', 'plausibility', 'timeliness');
CREATE TYPE "public"."mel_dqa_status" AS ENUM('open', 'accepted', 'resolved');
CREATE TYPE "public"."mel_evidence_review_status" AS ENUM('pending', 'verified', 'rejected');
CREATE TYPE "public"."mel_learning_action_status" AS ENUM('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE "public"."mel_notification_status" AS ENUM('pending', 'sent', 'failed');

CREATE TABLE "mel_monitoring_versions" (
  "id" serial PRIMARY KEY NOT NULL,
  "submission_id" integer NOT NULL,
  "version" integer NOT NULL,
  "status" "mel_monitoring_status" NOT NULL,
  "response_snapshot" jsonb,
  "jobs_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "waste_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "evidence_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "captured_by_id" text,
  "captured_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "mel_review_decisions" (
  "id" serial PRIMARY KEY NOT NULL,
  "submission_id" integer NOT NULL,
  "stage" "mel_review_stage" NOT NULL,
  "action" "mel_review_action" NOT NULL,
  "reviewer_id" text,
  "reviewer_role" varchar(50) NOT NULL,
  "from_status" "mel_monitoring_status" NOT NULL,
  "to_status" "mel_monitoring_status" NOT NULL,
  "reason" text,
  "affected_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "mel_dqa_issues" (
  "id" serial PRIMARY KEY NOT NULL,
  "submission_id" integer NOT NULL,
  "submission_version" integer NOT NULL,
  "rule_code" varchar(100) NOT NULL,
  "category" "mel_dqa_category" NOT NULL,
  "severity" varchar(20) NOT NULL,
  "question_code" varchar(100),
  "message" text NOT NULL,
  "observed_value" jsonb,
  "comparison_value" jsonb,
  "status" "mel_dqa_status" DEFAULT 'open' NOT NULL,
  "resolution_reason" text,
  "resolved_by_id" text,
  "resolved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mel_dqa_issues_severity_check" CHECK ("severity" IN ('error', 'warning'))
);

CREATE TABLE "mel_evidence_reviews" (
  "id" serial PRIMARY KEY NOT NULL,
  "evidence_id" integer NOT NULL,
  "reviewer_id" text,
  "status" "mel_evidence_review_status" DEFAULT 'pending' NOT NULL,
  "notes" text,
  "reviewed_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "mel_learning_actions" (
  "id" serial PRIMARY KEY NOT NULL,
  "business_id" integer,
  "submission_id" integer,
  "dqa_issue_id" integer,
  "finding" text NOT NULL,
  "agreed_action" text NOT NULL,
  "responsible_user_id" text,
  "due_date" date,
  "status" "mel_learning_action_status" DEFAULT 'open' NOT NULL,
  "follow_up_notes" text,
  "evidence_url" text,
  "created_by_id" text,
  "closed_by_id" text,
  "closed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "mel_notification_outbox" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_key" varchar(180) NOT NULL UNIQUE,
  "recipient_id" text,
  "event_type" varchar(80) NOT NULL,
  "title" varchar(255) NOT NULL,
  "body" text NOT NULL,
  "href" text NOT NULL,
  "status" "mel_notification_status" DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "sent_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "mel_monitoring_versions" ADD CONSTRAINT "mel_monitoring_versions_submission_fk" FOREIGN KEY ("submission_id") REFERENCES "mel_monitoring_submissions"("id") ON DELETE cascade;
ALTER TABLE "mel_monitoring_versions" ADD CONSTRAINT "mel_monitoring_versions_captured_by_fk" FOREIGN KEY ("captured_by_id") REFERENCES "user"("id") ON DELETE set null;
ALTER TABLE "mel_review_decisions" ADD CONSTRAINT "mel_review_decisions_submission_fk" FOREIGN KEY ("submission_id") REFERENCES "mel_monitoring_submissions"("id") ON DELETE cascade;
ALTER TABLE "mel_review_decisions" ADD CONSTRAINT "mel_review_decisions_reviewer_fk" FOREIGN KEY ("reviewer_id") REFERENCES "user"("id") ON DELETE set null;
ALTER TABLE "mel_dqa_issues" ADD CONSTRAINT "mel_dqa_issues_submission_fk" FOREIGN KEY ("submission_id") REFERENCES "mel_monitoring_submissions"("id") ON DELETE cascade;
ALTER TABLE "mel_dqa_issues" ADD CONSTRAINT "mel_dqa_issues_resolver_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "user"("id") ON DELETE set null;
ALTER TABLE "mel_evidence_reviews" ADD CONSTRAINT "mel_evidence_reviews_evidence_fk" FOREIGN KEY ("evidence_id") REFERENCES "mel_monitoring_evidence"("id") ON DELETE cascade;
ALTER TABLE "mel_evidence_reviews" ADD CONSTRAINT "mel_evidence_reviews_reviewer_fk" FOREIGN KEY ("reviewer_id") REFERENCES "user"("id") ON DELETE set null;
ALTER TABLE "mel_learning_actions" ADD CONSTRAINT "mel_learning_actions_business_fk" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE cascade;
ALTER TABLE "mel_learning_actions" ADD CONSTRAINT "mel_learning_actions_submission_fk" FOREIGN KEY ("submission_id") REFERENCES "mel_monitoring_submissions"("id") ON DELETE set null;
ALTER TABLE "mel_learning_actions" ADD CONSTRAINT "mel_learning_actions_dqa_fk" FOREIGN KEY ("dqa_issue_id") REFERENCES "mel_dqa_issues"("id") ON DELETE set null;
ALTER TABLE "mel_learning_actions" ADD CONSTRAINT "mel_learning_actions_owner_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "user"("id") ON DELETE set null;
ALTER TABLE "mel_learning_actions" ADD CONSTRAINT "mel_learning_actions_creator_fk" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE set null;
ALTER TABLE "mel_learning_actions" ADD CONSTRAINT "mel_learning_actions_closer_fk" FOREIGN KEY ("closed_by_id") REFERENCES "user"("id") ON DELETE set null;
ALTER TABLE "mel_notification_outbox" ADD CONSTRAINT "mel_notification_outbox_recipient_fk" FOREIGN KEY ("recipient_id") REFERENCES "user"("id") ON DELETE cascade;

CREATE UNIQUE INDEX "mel_monitoring_versions_submission_version_unique" ON "mel_monitoring_versions" ("submission_id", "version");
CREATE INDEX "mel_monitoring_versions_submission_idx" ON "mel_monitoring_versions" ("submission_id");
CREATE INDEX "mel_review_decisions_submission_idx" ON "mel_review_decisions" ("submission_id", "created_at");
CREATE INDEX "mel_review_decisions_reviewer_idx" ON "mel_review_decisions" ("reviewer_id");
CREATE UNIQUE INDEX "mel_dqa_issues_rule_version_unique" ON "mel_dqa_issues" ("submission_id", "submission_version", "rule_code");
CREATE INDEX "mel_dqa_issues_submission_idx" ON "mel_dqa_issues" ("submission_id", "status");
CREATE UNIQUE INDEX "mel_evidence_reviews_evidence_reviewer_unique" ON "mel_evidence_reviews" ("evidence_id", "reviewer_id");
CREATE INDEX "mel_evidence_reviews_evidence_idx" ON "mel_evidence_reviews" ("evidence_id", "status");
CREATE INDEX "mel_learning_actions_owner_status_idx" ON "mel_learning_actions" ("responsible_user_id", "status");
CREATE INDEX "mel_learning_actions_business_idx" ON "mel_learning_actions" ("business_id");
CREATE INDEX "mel_learning_actions_due_date_idx" ON "mel_learning_actions" ("due_date", "status");
CREATE INDEX "mel_notification_outbox_recipient_status_idx" ON "mel_notification_outbox" ("recipient_id", "status");
CREATE INDEX "mel_notification_outbox_event_type_idx" ON "mel_notification_outbox" ("event_type");
