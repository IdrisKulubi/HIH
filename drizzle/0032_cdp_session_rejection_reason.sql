ALTER TABLE "cdp_business_support_sessions"
  ADD COLUMN IF NOT EXISTS "rejection_reason" text;
