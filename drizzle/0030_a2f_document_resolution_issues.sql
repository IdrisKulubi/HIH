CREATE TABLE IF NOT EXISTS "a2f_document_resolution_issues" (
  "id" serial PRIMARY KEY NOT NULL,
  "a2f_id" integer NOT NULL,
  "matching_grant_application_id" integer,
  "document_name" text NOT NULL,
  "document_url" text,
  "document_file_name" text,
  "issue_details" text NOT NULL,
  "status" varchar(32) DEFAULT 'open' NOT NULL,
  "assigned_to_id" text NOT NULL,
  "raised_by_id" text NOT NULL,
  "resolution_notes" text,
  "resolved_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "a2f_document_resolution_issues"
    ADD CONSTRAINT "a2f_document_resolution_issues_a2f_id_a2f_pipeline_id_fk"
    FOREIGN KEY ("a2f_id") REFERENCES "public"."a2f_pipeline"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "a2f_document_resolution_issues"
    ADD CONSTRAINT "a2f_document_resolution_issues_matching_grant_application_id_fk"
    FOREIGN KEY ("matching_grant_application_id")
    REFERENCES "public"."a2f_matching_grant_applications"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "a2f_document_resolution_issues"
    ADD CONSTRAINT "a2f_document_resolution_issues_assigned_to_id_user_id_fk"
    FOREIGN KEY ("assigned_to_id") REFERENCES "public"."user"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "a2f_document_resolution_issues"
    ADD CONSTRAINT "a2f_document_resolution_issues_raised_by_id_user_id_fk"
    FOREIGN KEY ("raised_by_id") REFERENCES "public"."user"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "a2f_document_resolution_issues_a2f_id_idx"
  ON "a2f_document_resolution_issues" USING btree ("a2f_id");

CREATE INDEX IF NOT EXISTS "a2f_document_resolution_issues_assignee_status_idx"
  ON "a2f_document_resolution_issues" USING btree ("assigned_to_id", "status");

CREATE INDEX IF NOT EXISTS "a2f_document_resolution_issues_status_idx"
  ON "a2f_document_resolution_issues" USING btree ("status");
