ALTER TYPE "public"."application_status" ADD VALUE 'pending_senior_review' BEFORE 'shortlisted';--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "reviewer1_id" text;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "reviewer1_score" integer;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "reviewer1_notes" text;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "reviewer1_at" timestamp;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "reviewer2_id" text;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "reviewer2_score" integer;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "reviewer2_notes" text;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "reviewer2_at" timestamp;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "reviewer2_overrode_reviewer1" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "is_locked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "locked_by" text;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "locked_at" timestamp;--> statement-breakpoint
ALTER TABLE "eligibility_results" ADD COLUMN "lock_reason" text;