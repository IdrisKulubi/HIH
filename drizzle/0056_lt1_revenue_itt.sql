-- LT1: revenue-based ITT (50% growth target, revenue baselines)

UPDATE "mel_indicator_definitions" AS definition
SET
  "name" = 'Percentage increase in enterprise revenue',
  "definition" = 'Growth in the cohort median monthly-equivalent enterprise revenue compared with the approved ITT baseline median.',
  "updated_at" = now()
WHERE definition."code" = 'LT1-PROFITABILITY-INCREASE';

UPDATE "mel_indicator_baselines" AS baseline
SET
  "value" = CASE
    WHEN baseline."segment_key" = 'track:foundation' THEN 200000::numeric
    WHEN baseline."segment_key" = 'track:acceleration' THEN 692600::numeric
    ELSE baseline."value"
  END,
  "notes" = CASE
    WHEN baseline."segment_key" IN ('track:foundation', 'track:acceleration') THEN 'Validated monthly revenue baseline'
    ELSE baseline."notes"
  END,
  "updated_at" = now()
FROM "mel_indicator_definitions" AS indicator
WHERE baseline."indicator_id" = indicator."id"
  AND indicator."code" = 'LT1-PROFITABILITY-INCREASE'
  AND baseline."segment_key" IN ('track:foundation', 'track:acceleration');

UPDATE "mel_indicator_targets" AS target
SET
  "value" = 50::numeric,
  "value_text" = NULL,
  "notes" = '50% increase in median monthly revenue vs ITT baseline.',
  "updated_at" = now()
FROM "mel_indicator_definitions" AS indicator
WHERE target."indicator_id" = indicator."id"
  AND indicator."code" = 'LT1-PROFITABILITY-INCREASE'
  AND target."segment_key" = 'overall';

INSERT INTO "mel_indicator_targets"
  ("indicator_id", "programme_year", "segment_key", "value", "notes")
SELECT
  indicator."id",
  year_row."programme_year",
  'overall',
  50::numeric,
  '50% increase in median monthly revenue vs ITT baseline.'
FROM "mel_indicator_definitions" AS indicator
CROSS JOIN (VALUES (1), (2), (3)) AS year_row("programme_year")
WHERE indicator."code" = 'LT1-PROFITABILITY-INCREASE'
  AND NOT EXISTS (
    SELECT 1
    FROM "mel_indicator_targets" AS existing
    WHERE existing."indicator_id" = indicator."id"
      AND existing."programme_year" = year_row."programme_year"
      AND existing."segment_key" = 'overall'
      AND existing."reporting_period_id" IS NULL
  );
