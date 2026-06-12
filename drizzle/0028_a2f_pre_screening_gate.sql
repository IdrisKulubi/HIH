ALTER TABLE "a2f_pipeline"
  ADD COLUMN IF NOT EXISTS "screening_required" boolean DEFAULT true NOT NULL;

UPDATE "a2f_pipeline"
SET "screening_required" = true
WHERE "screening_required" IS DISTINCT FROM true;

CREATE TABLE IF NOT EXISTS "a2f_pre_screening_attempts" (
  "id" serial PRIMARY KEY NOT NULL,
  "application_id" integer NOT NULL,
  "track" "application_track" NOT NULL,
  "assigned_reviewer_id" text NOT NULL,
  "status" varchar(20) DEFAULT 'draft' NOT NULL,
  "ratings" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "category_scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "hard_stop_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "total_score" integer DEFAULT 0 NOT NULL,
  "outcome" varchar(20),
  "notes" text,
  "assessed_at" timestamp,
  "rescreen_eligible_at" date,
  "invitation_status" varchar(20) DEFAULT 'not_applicable' NOT NULL,
  "invitation_sent_at" timestamp,
  "invitation_error" text,
  "invitation_attempts" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "a2f_pre_screening_attempts_application_id_applications_id_fk"
    FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id")
    ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "a2f_pre_screening_attempts_assigned_reviewer_id_user_id_fk"
    FOREIGN KEY ("assigned_reviewer_id") REFERENCES "public"."user"("id")
    ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "a2f_pre_screening_status_check"
    CHECK ("status" IN ('draft', 'submitted')),
  CONSTRAINT "a2f_pre_screening_outcome_check"
    CHECK ("outcome" IS NULL OR "outcome" IN ('pass', 'conditional', 'stop')),
  CONSTRAINT "a2f_pre_screening_invitation_status_check"
    CHECK ("invitation_status" IN ('not_applicable', 'pending', 'sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS "a2f_pre_screening_application_id_idx"
  ON "a2f_pre_screening_attempts" USING btree ("application_id");
CREATE INDEX IF NOT EXISTS "a2f_pre_screening_reviewer_id_idx"
  ON "a2f_pre_screening_attempts" USING btree ("assigned_reviewer_id");
CREATE INDEX IF NOT EXISTS "a2f_pre_screening_outcome_idx"
  ON "a2f_pre_screening_attempts" USING btree ("outcome");
CREATE UNIQUE INDEX IF NOT EXISTS "a2f_pre_screening_one_draft_per_application"
  ON "a2f_pre_screening_attempts" USING btree ("application_id")
  WHERE "status" = 'draft';
