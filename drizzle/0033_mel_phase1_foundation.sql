CREATE TYPE "public"."mel_reporting_period_status" AS ENUM('planned', 'open', 'closed', 'archived');
CREATE TYPE "public"."mel_result_level" AS ENUM('impact', 'long_term_outcome', 'output', 'operational');
CREATE TYPE "public"."mel_indicator_unit" AS ENUM('count', 'kes', 'percentage', 'kilograms', 'status', 'score');
CREATE TYPE "public"."mel_indicator_source_type" AS ENUM('system', 'quarterly_enterprise_form', 'programme_mel_entry', 'integration', 'derived');
CREATE TYPE "public"."mel_aggregation" AS ENUM('sum', 'median', 'count', 'distinct_count', 'ratio', 'latest_value');

CREATE TABLE "mel_programme_settings" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "programme_name" varchar(255) DEFAULT 'BIRE Programme' NOT NULL,
  "timezone" varchar(100) DEFAULT 'Africa/Nairobi' NOT NULL,
  "red_threshold" numeric(5, 2) DEFAULT '50' NOT NULL,
  "green_threshold" numeric(5, 2) DEFAULT '80' NOT NULL,
  "financially_resilient_definition" text,
  "include_refugee_disaggregation" boolean DEFAULT false NOT NULL,
  "updated_by_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mel_programme_settings_singleton_id_check" CHECK ("mel_programme_settings"."id" = 1),
  CONSTRAINT "mel_programme_settings_threshold_order_check" CHECK (
    "mel_programme_settings"."red_threshold" >= 0
    AND "mel_programme_settings"."green_threshold" <= 100
    AND "mel_programme_settings"."red_threshold" < "mel_programme_settings"."green_threshold"
  )
);

CREATE TABLE "mel_reporting_periods" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar(30) NOT NULL,
  "label" varchar(120) NOT NULL,
  "programme_year" integer NOT NULL,
  "sequence" integer NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "collection_open_date" date NOT NULL,
  "collection_close_date" date NOT NULL,
  "status" "mel_reporting_period_status" DEFAULT 'planned' NOT NULL,
  "allow_catch_up" boolean DEFAULT true NOT NULL,
  "created_by_id" text,
  "updated_by_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mel_reporting_periods_code_unique" UNIQUE("code"),
  CONSTRAINT "mel_reporting_periods_date_order_check" CHECK ("mel_reporting_periods"."start_date" <= "mel_reporting_periods"."end_date"),
  CONSTRAINT "mel_reporting_periods_collection_date_order_check" CHECK (
    "mel_reporting_periods"."collection_open_date" <= "mel_reporting_periods"."collection_close_date"
  )
);

CREATE TABLE "mel_indicator_definitions" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" varchar(80) NOT NULL,
  "result_code" varchar(40) NOT NULL,
  "result_level" "mel_result_level" NOT NULL,
  "result_statement" text NOT NULL,
  "name" text NOT NULL,
  "definition" text,
  "unit" "mel_indicator_unit" NOT NULL,
  "source_type" "mel_indicator_source_type" NOT NULL,
  "frequency" varchar(40) DEFAULT 'quarterly' NOT NULL,
  "aggregation" "mel_aggregation" NOT NULL,
  "numerator_definition" text,
  "denominator_definition" text,
  "disaggregation_dimensions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "evidence_required" boolean DEFAULT false NOT NULL,
  "is_one_time" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "unresolved_notes" text,
  "created_by_id" text,
  "updated_by_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mel_indicator_definitions_code_unique" UNIQUE("code"),
  CONSTRAINT "mel_indicator_definitions_version_positive_check" CHECK ("mel_indicator_definitions"."version" > 0)
);

CREATE TABLE "mel_indicator_baselines" (
  "id" serial PRIMARY KEY NOT NULL,
  "indicator_id" integer NOT NULL,
  "segment_key" varchar(100) DEFAULT 'overall' NOT NULL,
  "value" numeric(18, 4),
  "value_text" text,
  "period_label" varchar(100),
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mel_indicator_baselines_value_present_check" CHECK (
    "mel_indicator_baselines"."value" IS NOT NULL OR "mel_indicator_baselines"."value_text" IS NOT NULL
  )
);

CREATE TABLE "mel_indicator_targets" (
  "id" serial PRIMARY KEY NOT NULL,
  "indicator_id" integer NOT NULL,
  "programme_year" integer NOT NULL,
  "reporting_period_id" integer,
  "segment_key" varchar(100) DEFAULT 'overall' NOT NULL,
  "value" numeric(18, 4),
  "value_text" text,
  "notes" text,
  "approved_by_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mel_indicator_targets_value_present_check" CHECK (
    "mel_indicator_targets"."value" IS NOT NULL OR "mel_indicator_targets"."value_text" IS NOT NULL
  )
);

CREATE TABLE "mel_audit_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "actor_id" text,
  "actor_role" varchar(50) NOT NULL,
  "entity_type" varchar(80) NOT NULL,
  "entity_id" varchar(100) NOT NULL,
  "action" varchar(80) NOT NULL,
  "reason" text,
  "before" jsonb,
  "after" jsonb,
  "correlation_id" varchar(100),
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "mel_programme_settings"
  ADD CONSTRAINT "mel_programme_settings_updated_by_id_users_id_fk"
  FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "mel_reporting_periods"
  ADD CONSTRAINT "mel_reporting_periods_created_by_id_users_id_fk"
  FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "mel_reporting_periods"
  ADD CONSTRAINT "mel_reporting_periods_updated_by_id_users_id_fk"
  FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "mel_indicator_definitions"
  ADD CONSTRAINT "mel_indicator_definitions_created_by_id_users_id_fk"
  FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "mel_indicator_definitions"
  ADD CONSTRAINT "mel_indicator_definitions_updated_by_id_users_id_fk"
  FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "mel_indicator_baselines"
  ADD CONSTRAINT "mel_indicator_baselines_indicator_id_mel_indicator_definitions_id_fk"
  FOREIGN KEY ("indicator_id") REFERENCES "public"."mel_indicator_definitions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "mel_indicator_targets"
  ADD CONSTRAINT "mel_indicator_targets_indicator_id_mel_indicator_definitions_id_fk"
  FOREIGN KEY ("indicator_id") REFERENCES "public"."mel_indicator_definitions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "mel_indicator_targets"
  ADD CONSTRAINT "mel_indicator_targets_reporting_period_id_mel_reporting_periods_id_fk"
  FOREIGN KEY ("reporting_period_id") REFERENCES "public"."mel_reporting_periods"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "mel_indicator_targets"
  ADD CONSTRAINT "mel_indicator_targets_approved_by_id_users_id_fk"
  FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "mel_audit_events"
  ADD CONSTRAINT "mel_audit_events_actor_id_users_id_fk"
  FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX "mel_reporting_periods_programme_sequence_unique"
  ON "mel_reporting_periods" USING btree ("programme_year", "sequence");
CREATE INDEX "mel_reporting_periods_status_idx" ON "mel_reporting_periods" USING btree ("status");
CREATE INDEX "mel_reporting_periods_dates_idx" ON "mel_reporting_periods" USING btree ("start_date", "end_date");
CREATE INDEX "mel_indicator_definitions_result_code_idx" ON "mel_indicator_definitions" USING btree ("result_code");
CREATE INDEX "mel_indicator_definitions_active_idx" ON "mel_indicator_definitions" USING btree ("is_active");
CREATE INDEX "mel_indicator_definitions_source_idx" ON "mel_indicator_definitions" USING btree ("source_type");
CREATE UNIQUE INDEX "mel_indicator_baselines_indicator_segment_unique"
  ON "mel_indicator_baselines" USING btree ("indicator_id", "segment_key");
CREATE INDEX "mel_indicator_baselines_indicator_id_idx" ON "mel_indicator_baselines" USING btree ("indicator_id");
CREATE UNIQUE INDEX "mel_indicator_targets_annual_unique"
  ON "mel_indicator_targets" USING btree ("indicator_id", "programme_year", "segment_key")
  WHERE "reporting_period_id" IS NULL;
CREATE UNIQUE INDEX "mel_indicator_targets_period_unique"
  ON "mel_indicator_targets" USING btree ("indicator_id", "reporting_period_id", "segment_key")
  WHERE "reporting_period_id" IS NOT NULL;
CREATE INDEX "mel_indicator_targets_indicator_id_idx" ON "mel_indicator_targets" USING btree ("indicator_id");
CREATE INDEX "mel_indicator_targets_period_id_idx" ON "mel_indicator_targets" USING btree ("reporting_period_id");
CREATE INDEX "mel_audit_events_entity_idx" ON "mel_audit_events" USING btree ("entity_type", "entity_id");
CREATE INDEX "mel_audit_events_actor_id_idx" ON "mel_audit_events" USING btree ("actor_id");
CREATE INDEX "mel_audit_events_created_at_idx" ON "mel_audit_events" USING btree ("created_at");
