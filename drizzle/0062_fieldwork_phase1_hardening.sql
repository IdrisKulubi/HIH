-- Phase 1 hardening: REDO routing, timing constraints, and queue indexes.
ALTER TABLE "fieldwork_plans" ADD COLUMN IF NOT EXISTS "assigned_redo_id" text;--> statement-breakpoint
ALTER TABLE "fieldwork_plans" ADD CONSTRAINT "fieldwork_plans_assigned_redo_id_user_id_fk" FOREIGN KEY ("assigned_redo_id") REFERENCES "public"."user"("id") ON DELETE set null;--> statement-breakpoint
ALTER TABLE "fieldwork_plans" ADD CONSTRAINT "fieldwork_plans_valid_window_chk" CHECK ("scheduled_end_at" > "scheduled_start_at");--> statement-breakpoint
ALTER TABLE "fieldwork_plans" ADD CONSTRAINT "fieldwork_plans_valid_duration_chk" CHECK ("estimated_duration_minutes" > 0);--> statement-breakpoint
ALTER TABLE "fieldwork_visits" ADD CONSTRAINT "fieldwork_visits_valid_duration_chk" CHECK ("estimated_duration_minutes" > 0);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fieldwork_plans_schedule_idx" ON "fieldwork_plans" USING btree ("scheduled_start_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fieldwork_plans_assigned_redo_status_idx" ON "fieldwork_plans" USING btree ("assigned_redo_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fieldwork_plans_reviewed_by_idx" ON "fieldwork_plans" USING btree ("reviewed_by_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fieldwork_visits_scheduled_start_idx" ON "fieldwork_visits" USING btree ("scheduled_start_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fieldwork_visits_status_idx" ON "fieldwork_visits" USING btree ("status", "scheduled_start_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fieldwork_visit_staff_visit_id_idx" ON "fieldwork_visit_staff" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fieldwork_visit_staff_user_id_idx" ON "fieldwork_visit_staff" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fieldwork_notification_deliveries_status_idx" ON "fieldwork_notification_deliveries" USING btree ("status", "created_at");
