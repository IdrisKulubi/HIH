ALTER TABLE "investment_appraisals"
  ADD COLUMN IF NOT EXISTS "donor_decision" varchar(40),
  ADD COLUMN IF NOT EXISTS "donor_decision_reason" text,
  ADD COLUMN IF NOT EXISTS "donor_decided_by_id" text,
  ADD COLUMN IF NOT EXISTS "donor_decided_at" timestamp;

DO $$
BEGIN
  ALTER TABLE "investment_appraisals"
    ADD CONSTRAINT "investment_appraisals_donor_decided_by_id_user_id_fk"
    FOREIGN KEY ("donor_decided_by_id") REFERENCES "user"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
