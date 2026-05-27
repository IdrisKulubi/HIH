ALTER TABLE "investment_appraisals"
  ADD COLUMN IF NOT EXISTS "ic_decision" varchar(40),
  ADD COLUMN IF NOT EXISTS "approved_grant_amount" numeric(14, 2),
  ADD COLUMN IF NOT EXISTS "decision_notes" text,
  ADD COLUMN IF NOT EXISTS "decision_conditions" text,
  ADD COLUMN IF NOT EXISTS "decided_by_id" text,
  ADD COLUMN IF NOT EXISTS "decided_at" timestamp;

DO $$
BEGIN
  ALTER TABLE "investment_appraisals"
    ADD CONSTRAINT "investment_appraisals_decided_by_id_user_id_fk"
    FOREIGN KEY ("decided_by_id") REFERENCES "user"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
