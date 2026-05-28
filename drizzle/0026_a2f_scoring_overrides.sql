CREATE TABLE IF NOT EXISTS "a2f_scoring_overrides" (
  "id" serial PRIMARY KEY NOT NULL,
  "a2f_id" integer NOT NULL,
  "previous_scores" jsonb NOT NULL,
  "new_scores" jsonb NOT NULL,
  "previous_total" integer NOT NULL,
  "new_total" integer NOT NULL,
  "reason" text NOT NULL,
  "created_by_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "a2f_scoring_overrides"
    ADD CONSTRAINT "a2f_scoring_overrides_a2f_id_a2f_pipeline_id_fk"
    FOREIGN KEY ("a2f_id") REFERENCES "public"."a2f_pipeline"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "a2f_scoring_overrides"
    ADD CONSTRAINT "a2f_scoring_overrides_created_by_id_users_id_fk"
    FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "a2f_scoring_overrides_a2f_id_idx" ON "a2f_scoring_overrides" ("a2f_id");
