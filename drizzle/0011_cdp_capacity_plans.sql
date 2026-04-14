CREATE TYPE "public"."cdp_focus_code" AS ENUM('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L');--> statement-breakpoint
CREATE TYPE "public"."cdp_plan_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."cdp_progress_quarter" AS ENUM('Q1', 'Q2', 'Q3', 'Q4');--> statement-breakpoint
CREATE TYPE "public"."cdp_review_cycle_status" AS ENUM('not_started', 'in_progress', 'done', 'blocked');--> statement-breakpoint
CREATE TABLE "capacity_development_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"status" "cdp_plan_status" DEFAULT 'draft' NOT NULL,
	"diagnostic_date" date NOT NULL,
	"cdp_review_date" date,
	"lead_staff_id" text,
	"notes" text,
	"linked_cna_diagnostic_id" integer,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cdp_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"focus_code" "cdp_focus_code" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"gap_challenge" text,
	"intervention" text DEFAULT '' NOT NULL,
	"support_type" text,
	"delivery_method" text,
	"responsible_staff" text,
	"target_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cdp_activity_progress_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"activity_id" integer NOT NULL,
	"review_period" "cdp_progress_quarter" NOT NULL,
	"status" "cdp_review_cycle_status" DEFAULT 'not_started' NOT NULL,
	"outcome_achieved" boolean,
	"staff_notes" text,
	"reviewed_at" timestamp,
	"reviewed_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cdp_business_support_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"session_number" integer NOT NULL,
	"session_date" timestamp NOT NULL,
	"focus_codes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"agenda" text,
	"support_type" text,
	"duration_hours" numeric(6, 2),
	"key_actions_agreed" text,
	"challenges_raised" text,
	"next_steps" text,
	"follow_up_date" date,
	"conducted_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cdp_focus_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"focus_code" "cdp_focus_code" NOT NULL,
	"score0to10" integer DEFAULT 0 NOT NULL,
	"key_gaps" text,
	"recommended_intervention" text,
	"responsible_staff" text,
	"target_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bds_interventions" ADD COLUMN "cdp_activity_id" integer;--> statement-breakpoint
ALTER TABLE "capacity_development_plans" ADD CONSTRAINT "capacity_development_plans_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capacity_development_plans" ADD CONSTRAINT "capacity_development_plans_lead_staff_id_user_id_fk" FOREIGN KEY ("lead_staff_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capacity_development_plans" ADD CONSTRAINT "capacity_development_plans_linked_cna_diagnostic_id_cna_diagnostics_id_fk" FOREIGN KEY ("linked_cna_diagnostic_id") REFERENCES "public"."cna_diagnostics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capacity_development_plans" ADD CONSTRAINT "capacity_development_plans_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdp_activities" ADD CONSTRAINT "cdp_activities_plan_id_capacity_development_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."capacity_development_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdp_activity_progress_reviews" ADD CONSTRAINT "cdp_activity_progress_reviews_activity_id_cdp_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."cdp_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdp_activity_progress_reviews" ADD CONSTRAINT "cdp_activity_progress_reviews_reviewed_by_id_user_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdp_business_support_sessions" ADD CONSTRAINT "cdp_business_support_sessions_plan_id_capacity_development_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."capacity_development_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdp_business_support_sessions" ADD CONSTRAINT "cdp_business_support_sessions_conducted_by_id_user_id_fk" FOREIGN KEY ("conducted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdp_focus_summary" ADD CONSTRAINT "cdp_focus_summary_plan_id_capacity_development_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."capacity_development_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "capacity_development_plans_business_id_idx" ON "capacity_development_plans" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "capacity_development_plans_status_idx" ON "capacity_development_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cdp_activities_plan_id_idx" ON "cdp_activities" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "cdp_activities_plan_focus_idx" ON "cdp_activities" USING btree ("plan_id","focus_code");--> statement-breakpoint
CREATE INDEX "cdp_activity_progress_activity_id_idx" ON "cdp_activity_progress_reviews" USING btree ("activity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cdp_activity_progress_activity_quarter_uq" ON "cdp_activity_progress_reviews" USING btree ("activity_id","review_period");--> statement-breakpoint
CREATE INDEX "cdp_business_support_sessions_plan_id_idx" ON "cdp_business_support_sessions" USING btree ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cdp_bss_plan_session_uq" ON "cdp_business_support_sessions" USING btree ("plan_id","session_number");--> statement-breakpoint
CREATE INDEX "cdp_focus_summary_plan_id_idx" ON "cdp_focus_summary" USING btree ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cdp_focus_summary_plan_focus_uq" ON "cdp_focus_summary" USING btree ("plan_id","focus_code");--> statement-breakpoint
ALTER TABLE "bds_interventions" ADD CONSTRAINT "bds_interventions_cdp_activity_id_cdp_activities_id_fk" FOREIGN KEY ("cdp_activity_id") REFERENCES "public"."cdp_activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bds_interventions_cdp_activity_id_idx" ON "bds_interventions" USING btree ("cdp_activity_id");