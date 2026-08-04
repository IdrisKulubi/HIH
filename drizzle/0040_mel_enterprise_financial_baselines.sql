ALTER TABLE "mel_programme_settings"
  ADD COLUMN IF NOT EXISTS "financial_variance_threshold_percent" numeric(7, 2) NOT NULL DEFAULT 100;

CREATE TABLE IF NOT EXISTS "mel_financial_baseline_batches" (
  "id" serial PRIMARY KEY,
  "source_name" varchar(255) NOT NULL,
  "source_checksum" varchar(64) NOT NULL,
  "effective_date" date NOT NULL,
  "status" varchar(30) NOT NULL DEFAULT 'validating',
  "total_records" integer NOT NULL DEFAULT 0,
  "valid_records" integer NOT NULL DEFAULT 0,
  "quarantined_records" integer NOT NULL DEFAULT 0,
  "uploaded_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "activated_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "activated_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "mel_financial_baseline_batches_status_check" CHECK ("status" IN ('validating','needs_review','validated','active','superseded')),
  CONSTRAINT "mel_financial_baseline_batches_counts_check" CHECK ("total_records" >= 0 AND "valid_records" >= 0 AND "quarantined_records" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "mel_financial_baseline_batches_checksum_unique"
  ON "mel_financial_baseline_batches" ("source_checksum");

CREATE TABLE IF NOT EXISTS "mel_enterprise_financial_baselines" (
  "id" serial PRIMARY KEY,
  "batch_id" integer NOT NULL REFERENCES "mel_financial_baseline_batches"("id") ON DELETE CASCADE,
  "source_row" integer NOT NULL,
  "source_business_id" varchar(120) NOT NULL,
  "source_business_name" text NOT NULL,
  "business_id" integer REFERENCES "businesses"("id") ON DELETE RESTRICT,
  "effective_date" date NOT NULL,
  "monthly_revenue" numeric(18, 2),
  "monthly_costs" numeric(18, 2),
  "monthly_profit" numeric(18, 2),
  "annual_revenue" numeric(18, 2),
  "annual_costs" numeric(18, 2),
  "annual_profit" numeric(18, 2),
  "raw_row" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "validation_errors" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "validation_warnings" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "status" varchar(30) NOT NULL DEFAULT 'quarantined',
  "resolved_by_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "resolved_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "mel_enterprise_financial_baselines_batch_row_unique" UNIQUE ("batch_id", "source_row"),
  CONSTRAINT "mel_enterprise_financial_baselines_status_check" CHECK ("status" IN ('validated','quarantined','active','superseded')),
  CONSTRAINT "mel_enterprise_financial_baselines_values_check" CHECK (
    ("monthly_revenue" IS NULL OR "monthly_revenue" >= 0) AND
    ("monthly_costs" IS NULL OR "monthly_costs" >= 0) AND
    ("annual_revenue" IS NULL OR "annual_revenue" >= 0) AND
    ("annual_costs" IS NULL OR "annual_costs" >= 0)
  )
);

CREATE INDEX IF NOT EXISTS "mel_enterprise_financial_baselines_batch_status_idx"
  ON "mel_enterprise_financial_baselines" ("batch_id", "status");
CREATE INDEX IF NOT EXISTS "mel_enterprise_financial_baselines_business_date_idx"
  ON "mel_enterprise_financial_baselines" ("business_id", "effective_date");
CREATE UNIQUE INDEX IF NOT EXISTS "mel_enterprise_financial_baselines_one_active_business_idx"
  ON "mel_enterprise_financial_baselines" ("business_id") WHERE "status" = 'active';

ALTER TABLE "mel_monitoring_responses"
  ADD COLUMN IF NOT EXISTS "financial_baseline_snapshot" jsonb,
  ADD COLUMN IF NOT EXISTS "financial_comparison_snapshot" jsonb;
