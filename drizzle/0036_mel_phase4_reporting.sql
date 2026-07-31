CREATE TYPE "public"."mel_programme_result_status" AS ENUM('draft', 'approved', 'reopened', 'voided');
--> statement-breakpoint
CREATE TYPE "public"."mel_traffic_light" AS ENUM('red', 'amber', 'green', 'not_available');
--> statement-breakpoint
ALTER TABLE "mel_indicator_definitions" ADD COLUMN "lower_is_better" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE "mel_programme_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"indicator_id" integer NOT NULL,
	"reporting_period_id" integer NOT NULL,
	"segment_key" varchar(100) DEFAULT 'overall' NOT NULL,
	"value" numeric(18, 4),
	"value_text" text,
	"numerator" numeric(18, 4),
	"denominator" numeric(18, 4),
	"notes" text,
	"evidence_url" text,
	"status" "mel_programme_result_status" DEFAULT 'draft' NOT NULL,
	"entered_by_id" text,
	"approved_by_id" text,
	"approved_at" timestamp,
	"reopened_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "mel_programme_results_value_present_check" CHECK ("mel_programme_results"."value" IS NOT NULL OR "mel_programme_results"."value_text" IS NOT NULL OR ("mel_programme_results"."numerator" IS NOT NULL AND "mel_programme_results"."denominator" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "mel_indicator_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"indicator_id" integer NOT NULL,
	"reporting_period_id" integer,
	"programme_year" integer NOT NULL,
	"segment_key" varchar(100) DEFAULT 'overall' NOT NULL,
	"actual" numeric(18, 4),
	"numerator" numeric(18, 4),
	"denominator" numeric(18, 4),
	"target" numeric(18, 4),
	"achievement_percentage" numeric(12, 4),
	"traffic_light" "mel_traffic_light" DEFAULT 'not_available' NOT NULL,
	"calculation_version" integer DEFAULT 1 NOT NULL,
	"indicator_version" integer NOT NULL,
	"calculation_rule" text NOT NULL,
	"source_count" integer DEFAULT 0 NOT NULL,
	"lineage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"exclusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"calculation_hash" varchar(64) NOT NULL,
	"calculated_by_id" text,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mel_programme_results" ADD CONSTRAINT "mel_programme_results_indicator_id_mel_indicator_definitions_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."mel_indicator_definitions"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mel_programme_results" ADD CONSTRAINT "mel_programme_results_reporting_period_id_mel_reporting_periods_id_fk" FOREIGN KEY ("reporting_period_id") REFERENCES "public"."mel_reporting_periods"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mel_programme_results" ADD CONSTRAINT "mel_programme_results_entered_by_id_users_id_fk" FOREIGN KEY ("entered_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mel_programme_results" ADD CONSTRAINT "mel_programme_results_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mel_indicator_results" ADD CONSTRAINT "mel_indicator_results_indicator_id_mel_indicator_definitions_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."mel_indicator_definitions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mel_indicator_results" ADD CONSTRAINT "mel_indicator_results_reporting_period_id_mel_reporting_periods_id_fk" FOREIGN KEY ("reporting_period_id") REFERENCES "public"."mel_reporting_periods"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mel_indicator_results" ADD CONSTRAINT "mel_indicator_results_calculated_by_id_users_id_fk" FOREIGN KEY ("calculated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "mel_programme_results_indicator_period_segment_unique" ON "mel_programme_results" USING btree ("indicator_id", "reporting_period_id", "segment_key");
--> statement-breakpoint
CREATE INDEX "mel_programme_results_status_period_idx" ON "mel_programme_results" USING btree ("status", "reporting_period_id");
--> statement-breakpoint
CREATE INDEX "mel_programme_results_indicator_idx" ON "mel_programme_results" USING btree ("indicator_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "mel_indicator_results_indicator_period_segment_unique" ON "mel_indicator_results" USING btree ("indicator_id", "reporting_period_id", "programme_year", "segment_key");
--> statement-breakpoint
CREATE INDEX "mel_indicator_results_period_idx" ON "mel_indicator_results" USING btree ("reporting_period_id", "traffic_light");
--> statement-breakpoint
CREATE INDEX "mel_indicator_results_indicator_idx" ON "mel_indicator_results" USING btree ("indicator_id", "segment_key");
--> statement-breakpoint
CREATE INDEX "mel_indicator_results_year_idx" ON "mel_indicator_results" USING btree ("programme_year");
--> statement-breakpoint
CREATE INDEX "mel_monitoring_submissions_status_period_idx" ON "mel_monitoring_submissions" USING btree ("status", "reporting_period_id");
