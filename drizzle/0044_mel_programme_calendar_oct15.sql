-- Align MEL reporting periods to the official Oct 15 programme calendar
-- Y1: 15 Oct 2025 – 15 Oct 2026
-- Y2: 15 Oct 2026 – 15 Oct 2027
-- Y3: 15 Oct 2027 – 15 Oct 2028

CREATE UNIQUE INDEX IF NOT EXISTS "mel_reporting_periods_programme_sequence_unique"
  ON "mel_reporting_periods" ("programme_year", "sequence");

-- Remap existing Year 1 quarters in place (preserve IDs linked to submissions).
UPDATE "mel_reporting_periods"
SET
  "code" = 'Y1-Q1',
  "label" = 'Year 1 Q1 (2025-10-15 to 2026-01-14)',
  "start_date" = '2025-10-15',
  "end_date" = '2026-01-14',
  "collection_open_date" = '2025-10-15',
  "collection_close_date" = '2026-01-28',
  "status" = 'closed',
  "updated_at" = now()
WHERE "programme_year" = 1 AND "sequence" = 1;
--> statement-breakpoint
UPDATE "mel_reporting_periods"
SET
  "code" = 'Y1-Q2',
  "label" = 'Year 1 Q2 (2026-01-15 to 2026-04-14)',
  "start_date" = '2026-01-15',
  "end_date" = '2026-04-14',
  "collection_open_date" = '2026-01-15',
  "collection_close_date" = '2026-04-28',
  "status" = 'closed',
  "updated_at" = now()
WHERE "programme_year" = 1 AND "sequence" = 2;
--> statement-breakpoint
UPDATE "mel_reporting_periods"
SET
  "code" = 'Y1-Q3',
  "label" = 'Year 1 Q3 (2026-04-15 to 2026-07-14)',
  "start_date" = '2026-04-15',
  "end_date" = '2026-07-14',
  "collection_open_date" = '2026-04-15',
  "collection_close_date" = '2026-07-28',
  "status" = 'closed',
  "updated_at" = now()
WHERE "programme_year" = 1 AND "sequence" = 3;
--> statement-breakpoint
UPDATE "mel_reporting_periods"
SET
  "code" = 'Y1-Q4',
  "label" = 'Year 1 Q4 (2026-07-15 to 2026-10-14)',
  "start_date" = '2026-07-15',
  "end_date" = '2026-10-14',
  "collection_open_date" = '2026-07-15',
  "collection_close_date" = '2026-10-28',
  "status" = 'open',
  "updated_at" = now()
WHERE "programme_year" = 1 AND "sequence" = 4;
--> statement-breakpoint

INSERT INTO "mel_reporting_periods"
  ("code", "label", "programme_year", "sequence", "start_date", "end_date", "collection_open_date", "collection_close_date", "status", "allow_catch_up")
VALUES
  ('Y2-Q1', 'Year 2 Q1 (2026-10-15 to 2027-01-14)', 2, 1, '2026-10-15', '2027-01-14', '2026-10-15', '2027-01-28', 'planned', true),
  ('Y2-Q2', 'Year 2 Q2 (2027-01-15 to 2027-04-14)', 2, 2, '2027-01-15', '2027-04-14', '2027-01-15', '2027-04-28', 'planned', true),
  ('Y2-Q3', 'Year 2 Q3 (2027-04-15 to 2027-07-14)', 2, 3, '2027-04-15', '2027-07-14', '2027-04-15', '2027-07-28', 'planned', true),
  ('Y2-Q4', 'Year 2 Q4 (2027-07-15 to 2027-10-14)', 2, 4, '2027-07-15', '2027-10-14', '2027-07-15', '2027-10-28', 'planned', true),
  ('Y3-Q1', 'Year 3 Q1 (2027-10-15 to 2028-01-14)', 3, 1, '2027-10-15', '2028-01-14', '2027-10-15', '2028-01-28', 'planned', true),
  ('Y3-Q2', 'Year 3 Q2 (2028-01-15 to 2028-04-14)', 3, 2, '2028-01-15', '2028-04-14', '2028-01-15', '2028-04-28', 'planned', true),
  ('Y3-Q3', 'Year 3 Q3 (2028-04-15 to 2028-07-14)', 3, 3, '2028-04-15', '2028-07-14', '2028-04-15', '2028-07-28', 'planned', true),
  ('Y3-Q4', 'Year 3 Q4 (2028-07-15 to 2028-10-14)', 3, 4, '2028-07-15', '2028-10-14', '2028-07-15', '2028-10-28', 'planned', true)
ON CONFLICT ("programme_year", "sequence") DO UPDATE SET
  "code" = EXCLUDED."code",
  "label" = EXCLUDED."label",
  "start_date" = EXCLUDED."start_date",
  "end_date" = EXCLUDED."end_date",
  "collection_open_date" = EXCLUDED."collection_open_date",
  "collection_close_date" = EXCLUDED."collection_close_date",
  "status" = EXCLUDED."status",
  "allow_catch_up" = EXCLUDED."allow_catch_up",
  "updated_at" = now();
--> statement-breakpoint

-- Ensure OP1.1 annual targets match the shared ITT (Total 400 = Y1 250 + Y2 150).
UPDATE "mel_indicator_targets" AS target
SET
  "value" = CASE target."programme_year"
    WHEN 0 THEN '400'
    WHEN 1 THEN '250'
    WHEN 2 THEN '150'
    WHEN 3 THEN '0'
    ELSE target."value"
  END,
  "updated_at" = now()
FROM "mel_indicator_definitions" AS indicator
WHERE indicator."id" = target."indicator_id"
  AND indicator."code" IN ('OP1.1-ENTERPRISES-MOBILISED', 'OP1.1-CNA-COMPLETED', 'OP1.1-CDP-IMPLEMENTED')
  AND target."reporting_period_id" IS NULL
  AND target."segment_key" = 'overall'
  AND target."programme_year" IN (0, 1, 2, 3);
