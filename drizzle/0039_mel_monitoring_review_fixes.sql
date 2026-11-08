CREATE TYPE "public"."mel_finance_type" AS ENUM('loan', 'matching_grant', 'repayable_grant', 'other');

ALTER TABLE "mel_programme_settings"
  ADD COLUMN "monthly_financial_baselines" jsonb
  DEFAULT '{"foundation":{"revenue":200000,"costs":124221,"profit":50000},"acceleration":{"revenue":692600,"costs":490500,"profit":150000}}'::jsonb
  NOT NULL;

ALTER TABLE "mel_monitoring_responses"
  ADD COLUMN "strategic_partnership_count" integer;
ALTER TABLE "mel_monitoring_responses"
  ADD CONSTRAINT "mel_monitoring_responses_strategic_partnership_count_check"
  CHECK ("strategic_partnership_count" IS NULL OR "strategic_partnership_count" >= 0);

ALTER TABLE "mel_monitoring_versions"
  ADD COLUMN "finance_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "mel_monitoring_versions"
  ADD COLUMN "evidence_reference_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL;

CREATE TABLE "mel_monitoring_finance_entries" (
  "id" serial PRIMARY KEY NOT NULL,
  "submission_id" integer NOT NULL,
  "finance_type" "mel_finance_type" NOT NULL,
  "other_description" text,
  "amount" numeric(18,2) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mel_monitoring_finance_entries_amount_check" CHECK ("amount" >= 0),
  CONSTRAINT "mel_monitoring_finance_entries_other_description_check" CHECK (
    ("finance_type" = 'other' AND NULLIF(BTRIM("other_description"), '') IS NOT NULL)
    OR ("finance_type" <> 'other' AND "other_description" IS NULL)
  )
);

ALTER TABLE "mel_monitoring_finance_entries"
  ADD CONSTRAINT "mel_monitoring_finance_entries_submission_fk"
  FOREIGN KEY ("submission_id") REFERENCES "mel_monitoring_submissions"("id") ON DELETE cascade;
CREATE UNIQUE INDEX "mel_monitoring_finance_entries_submission_type_unique"
  ON "mel_monitoring_finance_entries" ("submission_id", "finance_type");
CREATE INDEX "mel_monitoring_finance_entries_submission_idx"
  ON "mel_monitoring_finance_entries" ("submission_id");

CREATE TABLE "mel_monitoring_evidence_references" (
  "id" serial PRIMARY KEY NOT NULL,
  "submission_id" integer NOT NULL,
  "question_code" varchar(100) NOT NULL,
  "source_evidence_id" integer NOT NULL,
  "created_by_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "mel_monitoring_evidence_references"
  ADD CONSTRAINT "mel_monitoring_evidence_references_submission_fk"
  FOREIGN KEY ("submission_id") REFERENCES "mel_monitoring_submissions"("id") ON DELETE cascade;
ALTER TABLE "mel_monitoring_evidence_references"
  ADD CONSTRAINT "mel_monitoring_evidence_references_source_evidence_fk"
  FOREIGN KEY ("source_evidence_id") REFERENCES "mel_monitoring_evidence"("id") ON DELETE restrict;
ALTER TABLE "mel_monitoring_evidence_references"
  ADD CONSTRAINT "mel_monitoring_evidence_references_created_by_fk"
  FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE set null;
CREATE UNIQUE INDEX "mel_monitoring_evidence_references_submission_question_unique"
  ON "mel_monitoring_evidence_references" ("submission_id", "question_code");
CREATE INDEX "mel_monitoring_evidence_references_source_evidence_idx"
  ON "mel_monitoring_evidence_references" ("source_evidence_id");

UPDATE "mel_reporting_periods"
SET
  "code" = '2026-JUN-AUG',
  "label" = 'Quarter 1 - June to August 2026',
  "start_date" = '2026-06-01',
  "end_date" = '2026-08-31',
  "collection_open_date" = '2026-06-01',
  "collection_close_date" = '2026-09-15',
  "updated_at" = now()
WHERE "programme_year" = 1 AND "sequence" = 1;

INSERT INTO "mel_reporting_periods"
  ("code", "label", "programme_year", "sequence", "start_date", "end_date", "collection_open_date", "collection_close_date", "status", "allow_catch_up")
VALUES
  ('2026-SEP-NOV', 'Quarter 2 - September to November 2026', 1, 2, '2026-09-01', '2026-11-30', '2026-09-01', '2026-12-15', 'planned', true),
  ('2026-DEC-2027-FEB', 'Quarter 3 - December 2026 to February 2027', 1, 3, '2026-12-01', '2027-02-28', '2026-12-01', '2027-03-15', 'planned', true),
  ('2027-MAR-MAY', 'Quarter 4 - March to May 2027', 1, 4, '2027-03-01', '2027-05-31', '2027-03-01', '2027-06-15', 'planned', true)
ON CONFLICT ("programme_year", "sequence") DO UPDATE SET
  "code" = EXCLUDED."code",
  "label" = EXCLUDED."label",
  "start_date" = EXCLUDED."start_date",
  "end_date" = EXCLUDED."end_date",
  "collection_open_date" = EXCLUDED."collection_open_date",
  "collection_close_date" = EXCLUDED."collection_close_date",
  "updated_at" = now();

INSERT INTO "mel_monitoring_finance_entries"
  ("submission_id", "finance_type", "other_description", "amount")
SELECT
  "submission_id",
  CASE
    WHEN LOWER(REPLACE(COALESCE("finance_type", ''), '-', '_')) = 'loan' THEN 'loan'::"mel_finance_type"
    WHEN LOWER(REPLACE(COALESCE("finance_type", ''), ' ', '_')) = 'matching_grant' THEN 'matching_grant'::"mel_finance_type"
    WHEN LOWER(REPLACE(COALESCE("finance_type", ''), ' ', '_')) = 'repayable_grant' THEN 'repayable_grant'::"mel_finance_type"
    ELSE 'other'::"mel_finance_type"
  END,
  CASE
    WHEN LOWER(REPLACE(COALESCE("finance_type", ''), '-', '_')) = 'loan' THEN NULL
    WHEN LOWER(REPLACE(COALESCE("finance_type", ''), ' ', '_')) IN ('matching_grant', 'repayable_grant') THEN NULL
    ELSE COALESCE(NULLIF(BTRIM("finance_type_other"), ''), NULLIF(BTRIM("finance_type"), ''), 'Legacy finance type')
  END,
  "finance_value"
FROM "mel_monitoring_responses"
WHERE "finance_value" IS NOT NULL
ON CONFLICT ("submission_id", "finance_type") DO NOTHING;

UPDATE "mel_indicator_baselines" AS baseline
SET "value" = CASE
      WHEN baseline."segment_key" = 'track:foundation' THEN 50000
      WHEN baseline."segment_key" = 'track:acceleration' THEN 150000
      ELSE NULL
    END,
    "value_text" = CASE
      WHEN baseline."segment_key" = 'overall' THEN 'Track-specific baseline required'
      ELSE NULL
    END,
    "notes" = CASE
      WHEN baseline."segment_key" = 'overall' THEN 'Overall comparison is unavailable. View Foundation and Acceleration separately.'
      ELSE 'Validated monthly profitability baseline'
    END,
    "updated_at" = now()
FROM "mel_indicator_definitions" AS indicator
WHERE baseline."indicator_id" = indicator."id"
  AND indicator."code" = 'LT1-PROFITABILITY-INCREASE'
  AND baseline."segment_key" IN ('overall', 'track:foundation', 'track:acceleration');

CREATE UNIQUE INDEX IF NOT EXISTS "mel_indicator_baselines_indicator_segment_unique"
  ON "mel_indicator_baselines" ("indicator_id", "segment_key");

INSERT INTO "mel_indicator_baselines"
  ("indicator_id", "segment_key", "value", "value_text", "notes")
SELECT
  indicator."id",
  baseline."segment_key",
  baseline."value",
  baseline."value_text",
  baseline."notes"
FROM "mel_indicator_definitions" AS indicator
CROSS JOIN (VALUES
  ('overall', NULL::numeric, 'Track-specific baseline required', 'Overall comparison is unavailable. View Foundation and Acceleration separately.'),
  ('track:foundation', 50000::numeric, NULL::text, 'Validated monthly profitability baseline'),
  ('track:acceleration', 150000::numeric, NULL::text, 'Validated monthly profitability baseline')
) AS baseline("segment_key", "value", "value_text", "notes")
WHERE indicator."code" = 'LT1-PROFITABILITY-INCREASE'
  AND NOT EXISTS (
    SELECT 1
    FROM "mel_indicator_baselines" AS existing
    WHERE existing."indicator_id" = indicator."id"
      AND existing."segment_key" = baseline."segment_key"
  );
