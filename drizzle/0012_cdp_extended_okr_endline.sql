CREATE TYPE "public"."cdp_session_action_item_status" AS ENUM('open', 'done', 'waived', 'blocked');--> statement-breakpoint
ALTER TABLE "capacity_development_plans" ADD COLUMN "diagnostic_locked_at" timestamp;--> statement-breakpoint
ALTER TABLE "capacity_development_plans" ADD COLUMN "cdp_approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "cdp_business_support_sessions" ADD COLUMN "bootcamp_week" integer;--> statement-breakpoint
ALTER TABLE "cdp_business_support_sessions" ADD COLUMN "evidence_urls" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
CREATE TABLE "cdp_objectives" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "cdp_key_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"objective_id" integer NOT NULL,
	"title" text NOT NULL,
	"target_outcome" text,
	"achieved_outcome" text,
	"weight_percent" numeric(6, 2) DEFAULT '0' NOT NULL,
	"due_date" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "cdp_weekly_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"week_index" integer,
	"week_label" varchar(120),
	"action_text" text NOT NULL,
	"due_date" date,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"key_result_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "cdp_session_action_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"description" text NOT NULL,
	"status" "cdp_session_action_item_status" DEFAULT 'open' NOT NULL,
	"status_notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "cdp_endline_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"responses" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"impact_deltas" jsonb,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"submitted_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cdp_endline_responses_plan_id_unique" UNIQUE("plan_id")
);--> statement-breakpoint
ALTER TABLE "cdp_objectives" ADD CONSTRAINT "cdp_objectives_plan_id_capacity_development_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."capacity_development_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdp_key_results" ADD CONSTRAINT "cdp_key_results_objective_id_cdp_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."cdp_objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdp_weekly_milestones" ADD CONSTRAINT "cdp_weekly_milestones_plan_id_capacity_development_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."capacity_development_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdp_weekly_milestones" ADD CONSTRAINT "cdp_weekly_milestones_key_result_id_cdp_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."cdp_key_results"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdp_session_action_items" ADD CONSTRAINT "cdp_session_action_items_session_id_cdp_business_support_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."cdp_business_support_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdp_endline_responses" ADD CONSTRAINT "cdp_endline_responses_plan_id_capacity_development_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."capacity_development_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cdp_endline_responses" ADD CONSTRAINT "cdp_endline_responses_submitted_by_id_user_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cdp_objectives_plan_id_idx" ON "cdp_objectives" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "cdp_key_results_objective_id_idx" ON "cdp_key_results" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "cdp_weekly_milestones_plan_id_idx" ON "cdp_weekly_milestones" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "cdp_weekly_milestones_key_result_id_idx" ON "cdp_weekly_milestones" USING btree ("key_result_id");--> statement-breakpoint
CREATE INDEX "cdp_session_action_items_session_id_idx" ON "cdp_session_action_items" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "cdp_endline_responses_plan_id_idx" ON "cdp_endline_responses" USING btree ("plan_id");
