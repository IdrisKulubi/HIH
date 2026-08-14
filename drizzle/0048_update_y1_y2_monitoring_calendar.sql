UPDATE "mel_reporting_periods"
SET
  "label" = 'Y1 Monitoring Q2 (Sept–Nov 2026)',
  "start_date" = '2026-09-01',
  "end_date" = '2026-11-30',
  "collection_open_date" = '2026-09-01',
  "collection_close_date" = '2026-12-14',
  "updated_at" = now()
WHERE "code" = 'Y1-MQ2';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET
  "label" = 'Y2 Monitoring Q1 (Dec 2026–Feb 2027)',
  "start_date" = '2026-12-01',
  "end_date" = '2027-02-28',
  "collection_open_date" = '2026-12-01',
  "collection_close_date" = '2027-03-14',
  "updated_at" = now()
WHERE "code" = 'Y2-MQ1';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET
  "label" = 'Y2 Monitoring Q2 (Mar–May 2027)',
  "start_date" = '2027-03-01',
  "end_date" = '2027-05-31',
  "collection_open_date" = '2027-03-01',
  "collection_close_date" = '2027-06-14',
  "updated_at" = now()
WHERE "code" = 'Y2-MQ2';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET
  "label" = 'Y2 Monitoring Q3 (Jun–Aug 2027)',
  "start_date" = '2027-06-01',
  "end_date" = '2027-08-31',
  "collection_open_date" = '2027-06-01',
  "collection_close_date" = '2027-09-14',
  "updated_at" = now()
WHERE "code" = 'Y2-MQ3';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET
  "label" = 'Y2 Monitoring Q4 (Sept–Nov 2027)',
  "start_date" = '2027-09-01',
  "end_date" = '2027-11-30',
  "collection_open_date" = '2027-09-01',
  "collection_close_date" = '2027-12-14',
  "updated_at" = now()
WHERE "code" = 'Y2-MQ4';
--> statement-breakpoint

DELETE FROM "mel_reporting_periods"
WHERE "code" = 'Y2-MQ5';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET
  "label" = 'Y3 Monitoring Q1 (Dec 2027–Feb 2028)',
  "start_date" = '2027-12-01',
  "end_date" = '2028-02-29',
  "collection_open_date" = '2027-12-01',
  "collection_close_date" = '2028-03-14',
  "updated_at" = now()
WHERE "code" = 'Y3-MQ1';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET
  "label" = 'Y3 Monitoring Q2 (Mar–May 2028)',
  "start_date" = '2028-03-01',
  "end_date" = '2028-05-31',
  "collection_open_date" = '2028-03-01',
  "collection_close_date" = '2028-06-14',
  "updated_at" = now()
WHERE "code" = 'Y3-MQ2';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET
  "label" = 'Y3 Monitoring Q3 (Jun–Aug 2028)',
  "start_date" = '2028-06-01',
  "end_date" = '2028-08-31',
  "collection_open_date" = '2028-06-01',
  "collection_close_date" = '2028-09-14',
  "updated_at" = now()
WHERE "code" = 'Y3-MQ3';
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET
  "label" = 'Y3 Monitoring Q4 (Sept–Nov 2028)',
  "start_date" = '2028-09-01',
  "end_date" = '2028-11-30',
  "collection_open_date" = '2028-09-01',
  "collection_close_date" = '2028-12-14',
  "updated_at" = now()
WHERE "code" = 'Y3-MQ4';
--> statement-breakpoint

DELETE FROM "mel_reporting_periods"
WHERE "code" = 'Y3-MQ5';
