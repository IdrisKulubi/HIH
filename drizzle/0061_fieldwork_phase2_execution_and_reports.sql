CREATE TYPE "public"."fieldwork_report_status" AS ENUM('draft', 'submitted', 'returned', 'approved');--> statement-breakpoint
CREATE TYPE "public"."fieldwork_verification_status" AS ENUM('pending', 'verified', 'needs_review', 'exception_approved');--> statement-breakpoint
ALTER TYPE "public"."fieldwork_visit_status" ADD VALUE IF NOT EXISTS 'checked_in';--> statement-breakpoint
ALTER TYPE "public"."fieldwork_visit_status" ADD VALUE IF NOT EXISTS 'checked_out';--> statement-breakpoint

ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "checked_in_at" timestamp;--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "checked_out_at" timestamp;--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "check_in_latitude" numeric(10,7);--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "check_in_longitude" numeric(10,7);--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "check_in_accuracy_meters" integer;--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "check_out_latitude" numeric(10,7);--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "check_out_longitude" numeric(10,7);--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "check_out_accuracy_meters" integer;--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "verification_status" "fieldwork_verification_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "verification_notes" text;--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "missed_reason" text;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "fieldwork_reports" (
  "id" serial PRIMARY KEY NOT NULL,
  "visit_id" integer NOT NULL UNIQUE,
  "status" "fieldwork_report_status" DEFAULT 'draft' NOT NULL,
  "activities_conducted" text,
  "findings_and_gaps" text,
  "enterprise_challenges" text,
  "solutions_offered" text,
  "recommendations" text,
  "action_points" text,
  "edo_responsible_id" text,
  "timeline" text,
  "submitted_at" timestamp,
  "reviewed_by_id" text,
  "reviewed_at" timestamp,
  "return_reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "fieldwork_reports" ADD CONSTRAINT "fieldwork_reports_visit_id_fieldwork_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."fieldwork_visits"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "fieldwork_reports" ADD CONSTRAINT "fieldwork_reports_edo_responsible_id_user_id_fk" FOREIGN KEY ("edo_responsible_id") REFERENCES "public"."user"("id") ON DELETE set null;--> statement-breakpoint
ALTER TABLE "fieldwork_reports" ADD CONSTRAINT "fieldwork_reports_reviewed_by_id_user_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."user"("id") ON DELETE set null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fieldwork_reports_status_idx" ON "fieldwork_reports" USING btree ("status", "submitted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fieldwork_reports_edo_idx" ON "fieldwork_reports" USING btree ("edo_responsible_id", "status");
