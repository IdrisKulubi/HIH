DO $$ BEGIN
 CREATE TYPE "public"."kajabi_status" AS ENUM('NOT_STARTED', 'REGISTERED', 'COMPLETED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "kajabi_status" "kajabi_status" DEFAULT 'NOT_STARTED' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "kajabi_registered_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "kajabi_completed_at" timestamp;
