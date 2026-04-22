ALTER TABLE "kyc_profiles" ADD COLUMN IF NOT EXISTS "allocated_staff" varchar(255);--> statement-breakpoint
ALTER TABLE "kyc_profiles" ADD COLUMN IF NOT EXISTS "hub_name" varchar(255);
