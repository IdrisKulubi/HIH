ALTER TYPE "public"."session_status" ADD VALUE IF NOT EXISTS 'pending_approval';--> statement-breakpoint
ALTER TABLE "mentorship_sessions" ADD COLUMN IF NOT EXISTS "duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "mentorship_sessions" ADD COLUMN IF NOT EXISTS "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "mentorship_sessions" ADD COLUMN IF NOT EXISTS "approved_by_id" text;--> statement-breakpoint
ALTER TABLE "mentorship_sessions" ADD COLUMN IF NOT EXISTS "approved_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mentorship_sessions" ADD CONSTRAINT "mentorship_sessions_approved_by_id_user_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
