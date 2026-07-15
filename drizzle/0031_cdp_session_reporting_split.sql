ALTER TYPE "public"."cdp_session_approval_status"
  ADD VALUE IF NOT EXISTS 'rejected';

ALTER TABLE "cdp_business_support_sessions"
  ADD COLUMN IF NOT EXISTS "subtopic" text;
