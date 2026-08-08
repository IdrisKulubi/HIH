-- Option A: keep Oct→Oct programme years for ITT targets; align monitoring
-- windows to BDS start (Jun–Aug 2026 as Y1 Monitoring Q1).

CREATE UNIQUE INDEX IF NOT EXISTS "mel_reporting_periods_programme_sequence_unique"
  ON "mel_reporting_periods" ("programme_year", "sequence");
--> statement-breakpoint

-- Year 1: pre-delivery + monitoring quarters
UPDATE "mel_reporting_periods"
SET
  "code" = 'Y1-PRE',
  "label" = 'Y1 Pre-delivery (Oct 2025–May 2026) · Application, screening, onboarding, baseline, CNA & CDP planning',
  "start_date" = '2025-10-15',
  "end_date" = '2026-05-31',
  "collection_open_date" = '2025-10-15',
  "collection_close_date" = '2026-06-14',
  "status" = 'closed',
  "updated_at" = now()
WHERE "programme_year" = 1 AND "sequence" = 1;
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET
  "code" = 'Y1-MQ1',
  "label" = 'Y1 Monitoring Q1 (Jun–Aug 2026) · First BDS collection',
  "start_date" = '2026-06-01',
  "end_date" = '2026-08-31',
  "collection_open_date" = '2026-06-01',
  "collection_close_date" = '2026-09-14',
  "status" = 'open',
  "updated_at" = now()
WHERE "programme_year" = 1 AND "sequence" = 2;
--> statement-breakpoint

UPDATE "mel_reporting_periods"
SET
  "code" = 'Y1-MQ2',
  "label" = 'Y1 Monitoring Q2 (Sep–14 Oct 2026)',
  "start_date" = '2026-09-01',
  "end_date" = '2026-10-14',
  "collection_open_date" = '2026-09-01',
  "collection_close_date" = '2026-10-28',
  "status" = 'planned',
  "updated_at" = now()
WHERE "programme_year" = 1 AND "sequence" = 3;
--> statement-breakpoint

-- Retire the old fourth Y1 quarter so Jun–Aug is the active monitoring window.
UPDATE "mel_reporting_periods"
SET
  "code" = 'Y1-LEGACY-Q4',
  "label" = 'Y1 legacy quarter (archived after Option A calendar)',
  "status" = 'archived',
  "updated_at" = now()
WHERE "programme_year" = 1 AND "sequence" = 4;
--> statement-breakpoint

INSERT INTO "mel_reporting_periods"
  ("code", "label", "programme_year", "sequence", "start_date", "end_date", "collection_open_date", "collection_close_date", "status", "allow_catch_up")
VALUES
  ('Y2-MQ1', 'Y2 Monitoring Q1 (15 Oct–Nov 2026)', 2, 1, '2026-10-15', '2026-11-30', '2026-10-15', '2026-12-14', 'planned', true),
  ('Y2-MQ2', 'Y2 Monitoring Q2 (Dec 2026–Feb 2027)', 2, 2, '2026-12-01', '2027-02-28', '2026-12-01', '2027-03-14', 'planned', true),
  ('Y2-MQ3', 'Y2 Monitoring Q3 (Mar–May 2027)', 2, 3, '2027-03-01', '2027-05-31', '2027-03-01', '2027-06-14', 'planned', true),
  ('Y2-MQ4', 'Y2 Monitoring Q4 (Jun–Aug 2027)', 2, 4, '2027-06-01', '2027-08-31', '2027-06-01', '2027-09-14', 'planned', true),
  ('Y2-MQ5', 'Y2 Monitoring Q5 (Sep–14 Oct 2027)', 2, 5, '2027-09-01', '2027-10-14', '2027-09-01', '2027-10-28', 'planned', true),
  ('Y3-MQ1', 'Y3 Monitoring Q1 (15 Oct–Nov 2027)', 3, 1, '2027-10-15', '2027-11-30', '2027-10-15', '2027-12-14', 'planned', true),
  ('Y3-MQ2', 'Y3 Monitoring Q2 (Dec 2027–Feb 2028)', 3, 2, '2027-12-01', '2028-02-29', '2027-12-01', '2028-03-14', 'planned', true),
  ('Y3-MQ3', 'Y3 Monitoring Q3 (Mar–May 2028)', 3, 3, '2028-03-01', '2028-05-31', '2028-03-01', '2028-06-14', 'planned', true),
  ('Y3-MQ4', 'Y3 Monitoring Q4 (Jun–Aug 2028)', 3, 4, '2028-06-01', '2028-08-31', '2028-06-01', '2028-09-14', 'planned', true),
  ('Y3-MQ5', 'Y3 Monitoring Q5 (Sep–14 Oct 2028)', 3, 5, '2028-09-01', '2028-10-14', '2028-09-01', '2028-10-28', 'planned', true)
ON CONFLICT ("programme_year", "sequence") DO UPDATE SET
  "code" = EXCLUDED."code",
  "label" = EXCLUDED."label",
  "start_date" = EXCLUDED."start_date",
  "end_date" = EXCLUDED."end_date",
  "collection_open_date" = EXCLUDED."collection_open_date",
  "collection_close_date" = EXCLUDED."collection_close_date",
  "status" = CASE
    WHEN "mel_reporting_periods"."programme_year" = 1 AND "mel_reporting_periods"."sequence" = 2 THEN 'open'
    ELSE EXCLUDED."status"
  END,
  "allow_catch_up" = EXCLUDED."allow_catch_up",
  "updated_at" = now();
