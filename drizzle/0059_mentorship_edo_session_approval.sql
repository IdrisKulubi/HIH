ALTER TABLE "mentorship_sessions" ADD COLUMN IF NOT EXISTS "edo_approved_by_id" text;--> statement-breakpoint
ALTER TABLE "mentorship_sessions" ADD COLUMN IF NOT EXISTS "edo_approved_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mentorship_sessions" ADD CONSTRAINT "mentorship_sessions_edo_approved_by_id_user_id_fk" FOREIGN KEY ("edo_approved_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
