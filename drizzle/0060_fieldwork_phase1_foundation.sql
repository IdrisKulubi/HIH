CREATE TYPE "public"."fieldwork_notification_status" AS ENUM('pending', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."fieldwork_plan_status" AS ENUM('draft', 'submitted', 'returned', 'approved', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."fieldwork_visit_status" AS ENUM('scheduled', 'cancelled', 'completed', 'missed');--> statement-breakpoint

CREATE TABLE "fieldwork_plans" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar(255) NOT NULL,
  "scheduled_start_at" timestamp NOT NULL,
  "scheduled_end_at" timestamp NOT NULL,
  "estimated_duration_minutes" integer NOT NULL,
  "status" "fieldwork_plan_status" DEFAULT 'draft' NOT NULL,
  "created_by_id" text NOT NULL,
  "submitted_at" timestamp,
  "reviewed_by_id" text,
  "reviewed_at" timestamp,
  "return_reason" text,
  "cancellation_reason" text,
  "cancelled_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "fieldwork_visits" (
  "id" serial PRIMARY KEY NOT NULL,
  "plan_id" integer NOT NULL,
  "business_id" integer NOT NULL,
  "agenda" text NOT NULL,
  "scheduled_start_at" timestamp NOT NULL,
  "estimated_duration_minutes" integer NOT NULL,
  "status" "fieldwork_visit_status" DEFAULT 'scheduled' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "fieldwork_visits_plan_business_uq" UNIQUE("plan_id", "business_id")
);--> statement-breakpoint
CREATE TABLE "fieldwork_visit_staff" (
  "id" serial PRIMARY KEY NOT NULL,
  "visit_id" integer NOT NULL,
  "user_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "fieldwork_visit_staff_visit_user_uq" UNIQUE("visit_id", "user_id")
);--> statement-breakpoint
CREATE TABLE "fieldwork_notification_deliveries" (
  "id" serial PRIMARY KEY NOT NULL,
  "plan_id" integer NOT NULL,
  "recipient_email" varchar(255) NOT NULL,
  "recipient_role" varchar(80) NOT NULL,
  "kind" varchar(80) NOT NULL,
  "status" "fieldwork_notification_status" DEFAULT 'pending' NOT NULL,
  "provider_message_id" varchar(255),
  "failure_reason" text,
  "sent_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "fieldwork_audit_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "plan_id" integer NOT NULL,
  "visit_id" integer,
  "actor_id" text,
  "event_type" varchar(100) NOT NULL,
  "details" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "fieldwork_plans" ADD CONSTRAINT "fieldwork_plans_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "fieldwork_plans" ADD CONSTRAINT "fieldwork_plans_reviewed_by_id_user_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."user"("id") ON DELETE set null;--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD CONSTRAINT "fieldwork_visits_plan_id_fieldwork_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."fieldwork_plans"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD CONSTRAINT "fieldwork_visits_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "fieldwork_visit_staff" ADD CONSTRAINT "fieldwork_visit_staff_visit_id_fieldwork_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."fieldwork_visits"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "fieldwork_visit_staff" ADD CONSTRAINT "fieldwork_visit_staff_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "fieldwork_notification_deliveries" ADD CONSTRAINT "fieldwork_notification_deliveries_plan_id_fieldwork_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."fieldwork_plans"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "fieldwork_audit_events" ADD CONSTRAINT "fieldwork_audit_events_plan_id_fieldwork_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."fieldwork_plans"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "fieldwork_audit_events" ADD CONSTRAINT "fieldwork_audit_events_visit_id_fieldwork_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."fieldwork_visits"("id") ON DELETE set null;--> statement-breakpoint
ALTER TABLE "fieldwork_audit_events" ADD CONSTRAINT "fieldwork_audit_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null;--> statement-breakpoint

CREATE INDEX "fieldwork_plans_owner_status_idx" ON "fieldwork_plans" USING btree ("created_by_id", "status");--> statement-breakpoint
CREATE INDEX "fieldwork_plans_review_status_idx" ON "fieldwork_plans" USING btree ("status", "scheduled_start_at");--> statement-breakpoint
CREATE INDEX "fieldwork_visits_plan_id_idx" ON "fieldwork_visits" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "fieldwork_visits_business_id_idx" ON "fieldwork_visits" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "fieldwork_notification_deliveries_plan_id_idx" ON "fieldwork_notification_deliveries" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "fieldwork_audit_events_plan_id_idx" ON "fieldwork_audit_events" USING btree ("plan_id", "created_at");
