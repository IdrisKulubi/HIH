CREATE TYPE "public"."mel_instrument_type" AS ENUM('baseline','quarterly_monitoring','midline','endline','special_study');
--> statement-breakpoint
CREATE TYPE "public"."mel_instrument_status" AS ENUM('draft','published','retired');
--> statement-breakpoint
CREATE TYPE "public"."mel_question_response_type" AS ENUM('short_text','long_text','integer','decimal','currency','percentage','date','boolean','single_select','multi_select','file');
--> statement-breakpoint
CREATE TYPE "public"."mel_import_provider" AS ENUM('kobo','odk','file','legacy');
--> statement-breakpoint
CREATE TYPE "public"."mel_import_status" AS ENUM('pending','processing','completed','completed_with_errors','failed');
--> statement-breakpoint
CREATE TYPE "public"."mel_import_record_status" AS ENUM('quarantined','validated','promoted','duplicate','rejected');
--> statement-breakpoint
CREATE TYPE "public"."mel_operational_check_status" AS ENUM('not_started','in_progress','passed','failed','waived');
--> statement-breakpoint
CREATE TYPE "public"."mel_rollout_stage" AS ENUM('internal_test','pilot','programme_rollout','stabilization','complete');
--> statement-breakpoint
CREATE TABLE "mel_instruments" ("id" serial PRIMARY KEY, "code" varchar(80) NOT NULL UNIQUE, "name" varchar(255) NOT NULL, "description" text, "type" "mel_instrument_type" NOT NULL, "status" "mel_instrument_status" DEFAULT 'draft' NOT NULL, "created_by_id" text REFERENCES "users"("id") ON DELETE SET NULL, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);
--> statement-breakpoint
CREATE TABLE "mel_instrument_versions" ("id" serial PRIMARY KEY, "instrument_id" integer NOT NULL REFERENCES "mel_instruments"("id") ON DELETE CASCADE, "version" integer NOT NULL, "status" "mel_instrument_status" DEFAULT 'draft' NOT NULL, "effective_from_period_id" integer REFERENCES "mel_reporting_periods"("id") ON DELETE SET NULL, "effective_to_period_id" integer REFERENCES "mel_reporting_periods"("id") ON DELETE SET NULL, "published_by_id" text REFERENCES "users"("id") ON DELETE SET NULL, "published_at" timestamp, "retired_at" timestamp, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);
--> statement-breakpoint
CREATE TABLE "mel_instrument_sections" ("id" serial PRIMARY KEY, "version_id" integer NOT NULL REFERENCES "mel_instrument_versions"("id") ON DELETE CASCADE, "code" varchar(80) NOT NULL, "title" varchar(255) NOT NULL, "description" text, "sort_order" integer DEFAULT 0 NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);
--> statement-breakpoint
CREATE TABLE "mel_instrument_questions" ("id" serial PRIMARY KEY, "section_id" integer NOT NULL REFERENCES "mel_instrument_sections"("id") ON DELETE CASCADE, "code" varchar(100) NOT NULL, "label" text NOT NULL, "response_type" "mel_question_response_type" NOT NULL, "is_required" boolean DEFAULT false NOT NULL, "help_text" text, "options" jsonb DEFAULT '[]'::jsonb NOT NULL, "visibility_rule" jsonb, "validation_rules" jsonb DEFAULT '{}'::jsonb NOT NULL, "indicator_id" integer REFERENCES "mel_indicator_definitions"("id") ON DELETE SET NULL, "evidence_required" boolean DEFAULT false NOT NULL, "sort_order" integer DEFAULT 0 NOT NULL, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);
--> statement-breakpoint
CREATE TABLE "mel_integration_connections" ("id" serial PRIMARY KEY, "name" varchar(180) NOT NULL, "provider" "mel_import_provider" NOT NULL, "instrument_version_id" integer NOT NULL REFERENCES "mel_instrument_versions"("id") ON DELETE RESTRICT, "external_form_id" varchar(255), "secret_hash" varchar(64), "is_active" boolean DEFAULT true NOT NULL, "created_by_id" text REFERENCES "users"("id") ON DELETE SET NULL, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);
--> statement-breakpoint
CREATE TABLE "mel_import_mappings" ("id" serial PRIMARY KEY, "connection_id" integer NOT NULL REFERENCES "mel_integration_connections"("id") ON DELETE CASCADE, "version" integer DEFAULT 1 NOT NULL, "enterprise_id_field" varchar(150) NOT NULL, "reporting_period_field" varchar(150) NOT NULL, "external_submission_id_field" varchar(150) NOT NULL, "field_map" jsonb DEFAULT '{}'::jsonb NOT NULL, "is_active" boolean DEFAULT true NOT NULL, "created_by_id" text REFERENCES "users"("id") ON DELETE SET NULL, "created_at" timestamp DEFAULT now() NOT NULL);
--> statement-breakpoint
CREATE TABLE "mel_import_batches" ("id" serial PRIMARY KEY, "connection_id" integer REFERENCES "mel_integration_connections"("id") ON DELETE SET NULL, "mapping_id" integer REFERENCES "mel_import_mappings"("id") ON DELETE SET NULL, "source_name" varchar(255) NOT NULL, "source_checksum" varchar(64), "status" "mel_import_status" DEFAULT 'pending' NOT NULL, "total_records" integer DEFAULT 0 NOT NULL, "valid_records" integer DEFAULT 0 NOT NULL, "quarantined_records" integer DEFAULT 0 NOT NULL, "duplicate_records" integer DEFAULT 0 NOT NULL, "imported_by_id" text REFERENCES "users"("id") ON DELETE SET NULL, "started_at" timestamp, "completed_at" timestamp, "created_at" timestamp DEFAULT now() NOT NULL);
--> statement-breakpoint
CREATE TABLE "mel_import_records" ("id" serial PRIMARY KEY, "batch_id" integer NOT NULL REFERENCES "mel_import_batches"("id") ON DELETE CASCADE, "connection_id" integer REFERENCES "mel_integration_connections"("id") ON DELETE SET NULL, "external_submission_id" varchar(255) NOT NULL, "idempotency_key" varchar(320) NOT NULL UNIQUE, "status" "mel_import_record_status" DEFAULT 'quarantined' NOT NULL, "business_id" integer REFERENCES "businesses"("id") ON DELETE SET NULL, "reporting_period_id" integer REFERENCES "mel_reporting_periods"("id") ON DELETE SET NULL, "raw_payload" jsonb NOT NULL, "normalized_payload" jsonb, "validation_errors" jsonb DEFAULT '[]'::jsonb NOT NULL, "attempts" integer DEFAULT 0 NOT NULL, "last_error" text, "promoted_submission_id" integer, "reviewed_by_id" text REFERENCES "users"("id") ON DELETE SET NULL, "reviewed_at" timestamp, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);
--> statement-breakpoint
CREATE TABLE "mel_instrument_submissions" ("id" serial PRIMARY KEY, "instrument_version_id" integer NOT NULL REFERENCES "mel_instrument_versions"("id") ON DELETE RESTRICT, "business_id" integer NOT NULL REFERENCES "businesses"("id") ON DELETE RESTRICT, "reporting_period_id" integer NOT NULL REFERENCES "mel_reporting_periods"("id") ON DELETE RESTRICT, "collector_id" text REFERENCES "users"("id") ON DELETE SET NULL, "status" "mel_monitoring_status" DEFAULT 'draft' NOT NULL, "response_data" jsonb DEFAULT '{}'::jsonb NOT NULL, "attachment_metadata" jsonb DEFAULT '[]'::jsonb NOT NULL, "import_record_id" integer UNIQUE REFERENCES "mel_import_records"("id") ON DELETE SET NULL, "submitted_at" timestamp, "approved_at" timestamp, "approved_by_id" text REFERENCES "users"("id") ON DELETE SET NULL, "return_reason" text, "created_at" timestamp DEFAULT now() NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);
--> statement-breakpoint
ALTER TABLE "mel_import_records" ADD CONSTRAINT "mel_import_records_promoted_submission_fk" FOREIGN KEY ("promoted_submission_id") REFERENCES "mel_instrument_submissions"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE TABLE "mel_operational_events" ("id" serial PRIMARY KEY, "severity" varchar(20) NOT NULL, "event_type" varchar(100) NOT NULL, "correlation_id" varchar(100) NOT NULL, "message" text NOT NULL, "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL, "resolved_at" timestamp, "resolved_by_id" text REFERENCES "users"("id") ON DELETE SET NULL, "created_at" timestamp DEFAULT now() NOT NULL);
--> statement-breakpoint
CREATE TABLE "mel_operational_checks" ("id" serial PRIMARY KEY, "code" varchar(100) NOT NULL UNIQUE, "category" varchar(80) NOT NULL, "name" varchar(255) NOT NULL, "owner" varchar(180), "status" "mel_operational_check_status" DEFAULT 'not_started' NOT NULL, "evidence" text, "notes" text, "verified_by_id" text REFERENCES "users"("id") ON DELETE SET NULL, "verified_at" timestamp, "updated_at" timestamp DEFAULT now() NOT NULL);
--> statement-breakpoint
CREATE TABLE "mel_rollout_control" ("id" integer PRIMARY KEY DEFAULT 1, "stage" "mel_rollout_stage" DEFAULT 'internal_test' NOT NULL, "collection_enabled" boolean DEFAULT false NOT NULL, "imports_enabled" boolean DEFAULT false NOT NULL, "reporting_enabled" boolean DEFAULT false NOT NULL, "pilot_county_codes" jsonb DEFAULT '[]'::jsonb NOT NULL, "rollback_reason" text, "updated_by_id" text REFERENCES "users"("id") ON DELETE SET NULL, "updated_at" timestamp DEFAULT now() NOT NULL, CONSTRAINT "mel_rollout_control_singleton_check" CHECK ("id" = 1));
--> statement-breakpoint
CREATE TABLE "mel_rate_limit_buckets" ("key" varchar(255) PRIMARY KEY, "window_started_at" timestamp NOT NULL, "request_count" integer DEFAULT 0 NOT NULL, "updated_at" timestamp DEFAULT now() NOT NULL);
--> statement-breakpoint
CREATE INDEX "mel_instruments_status_type_idx" ON "mel_instruments" ("status","type");
CREATE UNIQUE INDEX "mel_instrument_versions_instrument_version_unique" ON "mel_instrument_versions" ("instrument_id","version");
CREATE INDEX "mel_instrument_versions_status_idx" ON "mel_instrument_versions" ("status");
CREATE UNIQUE INDEX "mel_instrument_sections_version_code_unique" ON "mel_instrument_sections" ("version_id","code");
CREATE INDEX "mel_instrument_sections_version_order_idx" ON "mel_instrument_sections" ("version_id","sort_order");
CREATE UNIQUE INDEX "mel_instrument_questions_section_code_unique" ON "mel_instrument_questions" ("section_id","code");
CREATE INDEX "mel_instrument_questions_section_order_idx" ON "mel_instrument_questions" ("section_id","sort_order");
CREATE INDEX "mel_instrument_questions_indicator_idx" ON "mel_instrument_questions" ("indicator_id");
CREATE UNIQUE INDEX "mel_integration_connections_provider_form_unique" ON "mel_integration_connections" ("provider","external_form_id");
CREATE INDEX "mel_integration_connections_active_idx" ON "mel_integration_connections" ("is_active");
CREATE UNIQUE INDEX "mel_import_mappings_connection_version_unique" ON "mel_import_mappings" ("connection_id","version");
CREATE INDEX "mel_import_mappings_active_idx" ON "mel_import_mappings" ("connection_id","is_active");
CREATE INDEX "mel_import_batches_status_idx" ON "mel_import_batches" ("status","created_at");
CREATE INDEX "mel_import_batches_checksum_idx" ON "mel_import_batches" ("source_checksum");
CREATE INDEX "mel_import_records_batch_status_idx" ON "mel_import_records" ("batch_id","status");
CREATE INDEX "mel_import_records_business_period_idx" ON "mel_import_records" ("business_id","reporting_period_id");
CREATE INDEX "mel_instrument_submissions_version_period_status_idx" ON "mel_instrument_submissions" ("instrument_version_id","reporting_period_id","status");
CREATE INDEX "mel_instrument_submissions_business_idx" ON "mel_instrument_submissions" ("business_id");
CREATE INDEX "mel_operational_events_type_created_idx" ON "mel_operational_events" ("event_type","created_at");
CREATE INDEX "mel_operational_events_severity_idx" ON "mel_operational_events" ("severity","resolved_at");
CREATE INDEX "mel_operational_checks_category_status_idx" ON "mel_operational_checks" ("category","status");
--> statement-breakpoint
INSERT INTO "mel_rollout_control" ("id", "collection_enabled", "reporting_enabled") VALUES (1, true, true) ON CONFLICT ("id") DO NOTHING;
