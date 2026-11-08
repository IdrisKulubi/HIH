-- Collection happens after the reporting quarter: 1st to 10th of the following month.
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET "collection_open_date" = '2026-06-01', "collection_close_date" = '2026-06-10', "updated_at" = now()
WHERE "code" = 'Y1-PRE';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET "collection_open_date" = '2026-09-01', "collection_close_date" = '2026-09-10', "updated_at" = now()
WHERE "code" = 'Y1-MQ1';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET "collection_open_date" = '2026-12-01', "collection_close_date" = '2026-12-10', "updated_at" = now()
WHERE "code" = 'Y1-MQ2';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET "collection_open_date" = '2027-03-01', "collection_close_date" = '2027-03-10', "updated_at" = now()
WHERE "code" = 'Y2-MQ1';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET "collection_open_date" = '2027-06-01', "collection_close_date" = '2027-06-10', "updated_at" = now()
WHERE "code" = 'Y2-MQ2';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET "collection_open_date" = '2027-09-01', "collection_close_date" = '2027-09-10', "updated_at" = now()
WHERE "code" = 'Y2-MQ3';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET "collection_open_date" = '2027-12-01', "collection_close_date" = '2027-12-10', "updated_at" = now()
WHERE "code" = 'Y2-MQ4';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET "collection_open_date" = '2028-03-01', "collection_close_date" = '2028-03-10', "updated_at" = now()
WHERE "code" = 'Y3-MQ1';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET "collection_open_date" = '2028-06-01', "collection_close_date" = '2028-06-10', "updated_at" = now()
WHERE "code" = 'Y3-MQ2';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET "collection_open_date" = '2028-09-01', "collection_close_date" = '2028-09-10', "updated_at" = now()
WHERE "code" = 'Y3-MQ3';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET "collection_open_date" = '2028-12-01', "collection_close_date" = '2028-12-10', "updated_at" = now()
WHERE "code" = 'Y3-MQ4';
