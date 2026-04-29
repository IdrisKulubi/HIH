ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'mentor';
--> statement-breakpoint
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'bds_edo';
--> statement-breakpoint
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'investment_analyst';
--> statement-breakpoint
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'mel';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "cna_reviewer_role" AS ENUM('mentor', 'bds_edo', 'investment_analyst', 'mel');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "cna_assessment_status" AS ENUM('draft', 'in_progress', 'submitted', 'locked', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "cna_role_review_status" AS ENUM('not_started', 'in_progress', 'submitted', 'returned');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "cna_rating" AS ENUM('poor', 'fair', 'great');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cna_question_bank" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_code" "cdp_focus_code" NOT NULL,
	"section_name" text NOT NULL,
	"question_text" text NOT NULL,
	"assigned_role" "cna_reviewer_role" NOT NULL,
	"source_role_label" varchar(40) NOT NULL,
	"source_sheet" varchar(160),
	"source_row" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cna_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"application_id" integer,
	"status" "cna_assessment_status" DEFAULT 'draft' NOT NULL,
	"created_by_id" text,
	"submitted_at" timestamp,
	"locked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cna_role_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessment_id" integer NOT NULL,
	"role" "cna_reviewer_role" NOT NULL,
	"reviewer_id" text,
	"status" "cna_role_review_status" DEFAULT 'not_started' NOT NULL,
	"started_at" timestamp,
	"submitted_at" timestamp,
	"admin_return_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cna_role_reviews_assessment_role_uq" UNIQUE("assessment_id","role")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cna_question_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessment_id" integer NOT NULL,
	"role_review_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"rating_label" "cna_rating" NOT NULL,
	"question_weight" numeric(7, 4) NOT NULL,
	"score_value" numeric(7, 4) NOT NULL,
	"comment" text,
	"evidence_url" text,
	"answered_by_id" text,
	"answered_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cna_question_responses_assessment_question_uq" UNIQUE("assessment_id","question_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cna_assessments" ADD CONSTRAINT "cna_assessments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cna_assessments" ADD CONSTRAINT "cna_assessments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cna_assessments" ADD CONSTRAINT "cna_assessments_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cna_role_reviews" ADD CONSTRAINT "cna_role_reviews_assessment_id_cna_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."cna_assessments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cna_role_reviews" ADD CONSTRAINT "cna_role_reviews_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cna_question_responses" ADD CONSTRAINT "cna_question_responses_assessment_id_cna_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."cna_assessments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cna_question_responses" ADD CONSTRAINT "cna_question_responses_role_review_id_cna_role_reviews_id_fk" FOREIGN KEY ("role_review_id") REFERENCES "public"."cna_role_reviews"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cna_question_responses" ADD CONSTRAINT "cna_question_responses_question_id_cna_question_bank_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."cna_question_bank"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cna_question_responses" ADD CONSTRAINT "cna_question_responses_answered_by_id_user_id_fk" FOREIGN KEY ("answered_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cna_question_bank_section_idx" ON "cna_question_bank" USING btree ("section_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cna_question_bank_role_idx" ON "cna_question_bank" USING btree ("assigned_role");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cna_question_bank_active_idx" ON "cna_question_bank" USING btree ("is_active");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cna_question_bank_source_uq" ON "cna_question_bank" USING btree ("source_sheet","source_row","question_text");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cna_assessments_business_id_idx" ON "cna_assessments" USING btree ("business_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cna_assessments_application_id_idx" ON "cna_assessments" USING btree ("application_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cna_assessments_status_idx" ON "cna_assessments" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cna_role_reviews_assessment_id_idx" ON "cna_role_reviews" USING btree ("assessment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cna_role_reviews_reviewer_id_idx" ON "cna_role_reviews" USING btree ("reviewer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cna_question_responses_assessment_id_idx" ON "cna_question_responses" USING btree ("assessment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cna_question_responses_role_review_id_idx" ON "cna_question_responses" USING btree ("role_review_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cna_question_responses_question_id_idx" ON "cna_question_responses" USING btree ("question_id");
