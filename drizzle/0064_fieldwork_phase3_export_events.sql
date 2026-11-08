CREATE TABLE IF NOT EXISTS "fieldwork_export_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "actor_id" text,
  "dataset" varchar(40) NOT NULL,
  "format" varchar(10) NOT NULL,
  "filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "row_count" integer NOT NULL,
  "includes_precise_location" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "fieldwork_export_events" ADD CONSTRAINT "fieldwork_export_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fieldwork_export_events_created_idx" ON "fieldwork_export_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fieldwork_notification_deliveries_recipient_idx" ON "fieldwork_notification_deliveries" USING btree ("recipient_email", "status", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fieldwork_audit_events_type_idx" ON "fieldwork_audit_events" USING btree ("event_type", "created_at");
