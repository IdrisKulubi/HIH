ALTER TABLE "disbursements_and_repayments"
  ADD COLUMN IF NOT EXISTS "milestone_id" integer,
  ADD COLUMN IF NOT EXISTS "procurement_item_id" integer,
  ADD COLUMN IF NOT EXISTS "tranche_label" varchar(120);

DO $$
BEGIN
  ALTER TABLE "disbursements_and_repayments"
    ADD CONSTRAINT "disbursements_and_repayments_milestone_id_a2f_grant_milestones_id_fk"
    FOREIGN KEY ("milestone_id") REFERENCES "a2f_grant_milestones"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "disbursements_and_repayments"
    ADD CONSTRAINT "disbursements_and_repayments_procurement_item_id_a2f_procurement_items_id_fk"
    FOREIGN KEY ("procurement_item_id") REFERENCES "a2f_procurement_items"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "disbursements_milestone_id_idx"
  ON "disbursements_and_repayments" USING btree ("milestone_id");
CREATE INDEX IF NOT EXISTS "disbursements_procurement_item_id_idx"
  ON "disbursements_and_repayments" USING btree ("procurement_item_id");
