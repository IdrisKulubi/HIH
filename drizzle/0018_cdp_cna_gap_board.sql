CREATE TYPE "public"."cdp_gap_priority" AS ENUM('high', 'medium');
CREATE TYPE "public"."cdp_gap_status" AS ENUM('open', 'converted', 'dismissed');
CREATE TYPE "public"."cdp_session_type" AS ENUM('physical', 'virtual');
CREATE TYPE "public"."cdp_session_approval_status" AS ENUM('pending', 'approved');

ALTER TABLE "capacity_development_plans"
  ADD COLUMN "linked_cna_assessment_id" integer;

ALTER TABLE "capacity_development_plans"
  ADD CONSTRAINT "capacity_development_plans_linked_cna_assessment_id_cna_assessments_id_fk"
  FOREIGN KEY ("linked_cna_assessment_id")
  REFERENCES "public"."cna_assessments"("id")
  ON DELETE set null
  ON UPDATE no action;

CREATE INDEX "capacity_development_plans_linked_cna_assessment_idx"
  ON "capacity_development_plans" USING btree ("linked_cna_assessment_id");

CREATE TABLE "cdp_gap_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "plan_id" integer NOT NULL,
  "assessment_id" integer NOT NULL,
  "question_response_id" integer NOT NULL,
  "activity_id" integer,
  "focus_code" "cdp_focus_code" NOT NULL,
  "focus_name" text NOT NULL,
  "question_text" text NOT NULL,
  "reviewer_role" "cna_reviewer_role" NOT NULL,
  "rating_label" "cna_rating" NOT NULL,
  "priority" "cdp_gap_priority" NOT NULL,
  "reviewer_comment" text,
  "status" "cdp_gap_status" DEFAULT 'open' NOT NULL,
  "recommended_intervention" text,
  "selected_intervention_key" text,
  "dismissal_reason" text,
  "converted_at" timestamp,
  "dismissed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "cdp_gap_items"
  ADD CONSTRAINT "cdp_gap_items_plan_id_capacity_development_plans_id_fk"
  FOREIGN KEY ("plan_id")
  REFERENCES "public"."capacity_development_plans"("id")
  ON DELETE cascade
  ON UPDATE no action;

ALTER TABLE "cdp_gap_items"
  ADD CONSTRAINT "cdp_gap_items_assessment_id_cna_assessments_id_fk"
  FOREIGN KEY ("assessment_id")
  REFERENCES "public"."cna_assessments"("id")
  ON DELETE cascade
  ON UPDATE no action;

ALTER TABLE "cdp_gap_items"
  ADD CONSTRAINT "cdp_gap_items_question_response_id_cna_question_responses_id_fk"
  FOREIGN KEY ("question_response_id")
  REFERENCES "public"."cna_question_responses"("id")
  ON DELETE cascade
  ON UPDATE no action;

ALTER TABLE "cdp_gap_items"
  ADD CONSTRAINT "cdp_gap_items_activity_id_cdp_activities_id_fk"
  FOREIGN KEY ("activity_id")
  REFERENCES "public"."cdp_activities"("id")
  ON DELETE set null
  ON UPDATE no action;

CREATE INDEX "cdp_gap_items_plan_id_idx" ON "cdp_gap_items" USING btree ("plan_id");
CREATE INDEX "cdp_gap_items_assessment_id_idx" ON "cdp_gap_items" USING btree ("assessment_id");
CREATE INDEX "cdp_gap_items_question_response_id_idx" ON "cdp_gap_items" USING btree ("question_response_id");
CREATE INDEX "cdp_gap_items_status_idx" ON "cdp_gap_items" USING btree ("status");
CREATE INDEX "cdp_gap_items_priority_idx" ON "cdp_gap_items" USING btree ("priority");
CREATE UNIQUE INDEX "cdp_gap_items_plan_response_uq"
  ON "cdp_gap_items" USING btree ("plan_id", "question_response_id");

ALTER TABLE "cdp_business_support_sessions"
  ADD COLUMN "session_type" "cdp_session_type" DEFAULT 'virtual' NOT NULL,
  ADD COLUMN "approval_status" "cdp_session_approval_status" DEFAULT 'pending' NOT NULL,
  ADD COLUMN "approved_by_id" text,
  ADD COLUMN "approved_at" timestamp,
  ADD COLUMN "meeting_link" text;

ALTER TABLE "cdp_business_support_sessions"
  ADD CONSTRAINT "cdp_business_support_sessions_approved_by_id_user_id_fk"
  FOREIGN KEY ("approved_by_id")
  REFERENCES "public"."user"("id")
  ON DELETE set null
  ON UPDATE no action;
