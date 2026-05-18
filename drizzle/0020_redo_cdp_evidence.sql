ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'redo';

ALTER TABLE "cdp_business_support_sessions"
  ADD COLUMN IF NOT EXISTS "evidence_notes" text;

ALTER TABLE "cdp_business_support_sessions"
  ADD COLUMN IF NOT EXISTS "evidence_files" jsonb DEFAULT '[]'::jsonb;
