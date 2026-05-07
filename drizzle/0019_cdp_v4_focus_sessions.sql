ALTER TABLE "cdp_business_support_sessions"
  ADD COLUMN "focus_code" "cdp_focus_code" DEFAULT 'A' NOT NULL;

DROP INDEX IF EXISTS "cdp_bss_plan_session_uq";

CREATE INDEX "cdp_business_support_sessions_plan_focus_idx"
  ON "cdp_business_support_sessions" USING btree ("plan_id", "focus_code");

CREATE UNIQUE INDEX "cdp_bss_plan_focus_session_uq"
  ON "cdp_business_support_sessions" USING btree ("plan_id", "focus_code", "session_number");
