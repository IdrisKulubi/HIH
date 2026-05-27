CREATE TABLE IF NOT EXISTS "a2f_matching_grant_applications" (
  "id" serial PRIMARY KEY NOT NULL,
  "a2f_id" integer NOT NULL,
  "track" "application_track" NOT NULL,
  "status" varchar(32) DEFAULT 'draft' NOT NULL,
  "submitted_by_id" text,
  "total_project_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
  "bire_grant_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
  "enterprise_contribution_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
  "co_investment_source" text,
  "co_investment_justification" text,
  "project_title" text,
  "funding_need" text,
  "without_grant_impact" text,
  "capex_only_confirmed" boolean DEFAULT false NOT NULL,
  "enterprise_identification" jsonb DEFAULT '{}'::jsonb,
  "lead_entrepreneur" jsonb DEFAULT '{}'::jsonb,
  "programme_engagement" jsonb DEFAULT '{}'::jsonb,
  "business_overview" jsonb DEFAULT '{}'::jsonb,
  "financial_overview" jsonb DEFAULT '{}'::jsonb,
  "budget_items" jsonb DEFAULT '[]'::jsonb,
  "other_funding" jsonb DEFAULT '{}'::jsonb,
  "implementation_milestones" jsonb DEFAULT '[]'::jsonb,
  "financial_projections" jsonb DEFAULT '{}'::jsonb,
  "job_creation_plan" jsonb DEFAULT '[]'::jsonb,
  "impact" jsonb DEFAULT '{}'::jsonb,
  "governance_compliance" jsonb DEFAULT '{}'::jsonb,
  "supporting_documents" jsonb DEFAULT '[]'::jsonb,
  "declaration" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "a2f_matching_grant_applications"
    ADD CONSTRAINT "a2f_matching_grant_applications_a2f_id_a2f_pipeline_id_fk"
    FOREIGN KEY ("a2f_id") REFERENCES "public"."a2f_pipeline"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "a2f_matching_grant_applications"
    ADD CONSTRAINT "a2f_matching_grant_applications_submitted_by_id_users_id_fk"
    FOREIGN KEY ("submitted_by_id") REFERENCES "public"."user"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "a2f_matching_grant_applications_a2f_id_unique"
  ON "a2f_matching_grant_applications" USING btree ("a2f_id");

CREATE INDEX IF NOT EXISTS "a2f_matching_grant_applications_status_idx"
  ON "a2f_matching_grant_applications" USING btree ("status");

CREATE INDEX IF NOT EXISTS "a2f_matching_grant_applications_track_idx"
  ON "a2f_matching_grant_applications" USING btree ("track");
