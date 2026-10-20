-- Extend Y1 Jun–Aug collection window to 18 September 2026 (first BDS collection only).
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET "collection_close_date" = '2026-09-18', "updated_at" = now()
WHERE "code" = 'Y1-MQ1';
