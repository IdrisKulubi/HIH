ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "check_in_location_state" varchar(20);--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "check_out_location_state" varchar(20);--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "check_in_distance_meters" integer;--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "check_out_distance_meters" integer;--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "location_consent_at" timestamp;--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "exception_by_id" text;--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "exception_reason" text;--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "exception_at" timestamp;--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "missed_recorded_at" timestamp;--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD CONSTRAINT "fieldwork_visits_exception_by_id_user_id_fk" FOREIGN KEY ("exception_by_id") REFERENCES "public"."user"("id") ON DELETE set null;--> statement-breakpoint

ALTER TABLE "fieldwork_notification_deliveries" ADD COLUMN IF NOT EXISTS "visit_id" integer;--> statement-breakpoint
ALTER TABLE "fieldwork_notification_deliveries" ADD COLUMN IF NOT EXISTS "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "fieldwork_notification_deliveries" ADD CONSTRAINT "fieldwork_notification_deliveries_visit_id_fieldwork_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."fieldwork_visits"("id") ON DELETE set null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fieldwork_notification_deliveries_visit_idx" ON "fieldwork_notification_deliveries" USING btree ("visit_id", "kind");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "fieldwork_report_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "report_id" integer NOT NULL,
  "actor_id" text,
  "event_type" varchar(100) NOT NULL,
  "details" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "fieldwork_report_events" ADD CONSTRAINT "fieldwork_report_events_report_id_fieldwork_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."fieldwork_reports"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "fieldwork_report_events" ADD CONSTRAINT "fieldwork_report_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fieldwork_report_events_report_idx" ON "fieldwork_report_events" USING btree ("report_id", "created_at");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "fieldwork_gate_overrides" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "granted_by_id" text,
  "reason" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "fieldwork_gate_overrides" ADD CONSTRAINT "fieldwork_gate_overrides_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "fieldwork_gate_overrides" ADD CONSTRAINT "fieldwork_gate_overrides_granted_by_id_user_id_fk" FOREIGN KEY ("granted_by_id") REFERENCES "public"."user"("id") ON DELETE set null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fieldwork_gate_overrides_user_idx" ON "fieldwork_gate_overrides" USING btree ("user_id", "expires_at");
