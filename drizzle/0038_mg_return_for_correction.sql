ALTER TABLE "a2f_matching_grant_applications" ADD COLUMN IF NOT EXISTS "returned_at" timestamp;
ALTER TABLE "a2f_matching_grant_applications" ADD COLUMN IF NOT EXISTS "returned_by_id" text REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "a2f_matching_grant_applications" ADD COLUMN IF NOT EXISTS "returned_to_edo_id" text REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "a2f_matching_grant_applications" ADD COLUMN IF NOT EXISTS "return_reason" text;
ALTER TABLE "a2f_matching_grant_applications" ADD COLUMN IF NOT EXISTS "return_count" integer DEFAULT 0 NOT NULL;
