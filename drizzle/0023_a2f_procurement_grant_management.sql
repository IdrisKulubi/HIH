CREATE TABLE IF NOT EXISTS "a2f_procurement_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "a2f_id" integer NOT NULL,
  "agreement_id" integer,
  "item_name" varchar(255) NOT NULL,
  "description" text,
  "category" varchar(120) DEFAULT 'productive_equipment',
  "supplier_name" varchar(255),
  "selected_quote_amount" numeric(14, 2) DEFAULT '0',
  "bire_contribution_amount" numeric(14, 2) DEFAULT '0',
  "enterprise_contribution_amount" numeric(14, 2) DEFAULT '0',
  "procurement_status" varchar(40) DEFAULT 'planned' NOT NULL,
  "quote_documents" jsonb DEFAULT '[]'::jsonb,
  "purchase_order_url" text,
  "invoice_url" text,
  "delivery_note_url" text,
  "verification_document_url" text,
  "notes" text,
  "created_by_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "a2f_grant_milestones" (
  "id" serial PRIMARY KEY NOT NULL,
  "a2f_id" integer NOT NULL,
  "agreement_id" integer,
  "milestone_name" varchar(255) NOT NULL,
  "description" text,
  "tranche_label" varchar(120),
  "planned_completion_date" date,
  "actual_completion_date" date,
  "verification_method" text,
  "evidence_url" text,
  "status" varchar(40) DEFAULT 'planned' NOT NULL,
  "issues" text,
  "corrective_actions" text,
  "verified_by_id" text,
  "verified_at" timestamp,
  "created_by_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  ALTER TABLE "a2f_procurement_items"
    ADD CONSTRAINT "a2f_procurement_items_a2f_id_a2f_pipeline_id_fk"
    FOREIGN KEY ("a2f_id") REFERENCES "a2f_pipeline"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "a2f_procurement_items"
    ADD CONSTRAINT "a2f_procurement_items_agreement_id_grant_agreements_id_fk"
    FOREIGN KEY ("agreement_id") REFERENCES "grant_agreements"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "a2f_procurement_items"
    ADD CONSTRAINT "a2f_procurement_items_created_by_id_user_id_fk"
    FOREIGN KEY ("created_by_id") REFERENCES "user"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "a2f_grant_milestones"
    ADD CONSTRAINT "a2f_grant_milestones_a2f_id_a2f_pipeline_id_fk"
    FOREIGN KEY ("a2f_id") REFERENCES "a2f_pipeline"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "a2f_grant_milestones"
    ADD CONSTRAINT "a2f_grant_milestones_agreement_id_grant_agreements_id_fk"
    FOREIGN KEY ("agreement_id") REFERENCES "grant_agreements"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "a2f_grant_milestones"
    ADD CONSTRAINT "a2f_grant_milestones_verified_by_id_user_id_fk"
    FOREIGN KEY ("verified_by_id") REFERENCES "user"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "a2f_grant_milestones"
    ADD CONSTRAINT "a2f_grant_milestones_created_by_id_user_id_fk"
    FOREIGN KEY ("created_by_id") REFERENCES "user"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "a2f_procurement_items_a2f_id_idx"
  ON "a2f_procurement_items" USING btree ("a2f_id");
CREATE INDEX IF NOT EXISTS "a2f_procurement_items_agreement_id_idx"
  ON "a2f_procurement_items" USING btree ("agreement_id");
CREATE INDEX IF NOT EXISTS "a2f_procurement_items_status_idx"
  ON "a2f_procurement_items" USING btree ("procurement_status");

CREATE INDEX IF NOT EXISTS "a2f_grant_milestones_a2f_id_idx"
  ON "a2f_grant_milestones" USING btree ("a2f_id");
CREATE INDEX IF NOT EXISTS "a2f_grant_milestones_agreement_id_idx"
  ON "a2f_grant_milestones" USING btree ("agreement_id");
CREATE INDEX IF NOT EXISTS "a2f_grant_milestones_status_idx"
  ON "a2f_grant_milestones" USING btree ("status");
