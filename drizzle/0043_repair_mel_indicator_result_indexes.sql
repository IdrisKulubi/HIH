CREATE UNIQUE INDEX IF NOT EXISTS "mel_indicator_results_indicator_period_segment_unique"
ON "mel_indicator_results" USING btree ("indicator_id", "reporting_period_id", "programme_year", "segment_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mel_indicator_results_period_idx"
ON "mel_indicator_results" USING btree ("reporting_period_id", "traffic_light");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mel_indicator_results_indicator_idx" 
ON "mel_indicator_results" USING btree ("indicator_id", "segment_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mel_indicator_results_year_idx"
ON "mel_indicator_results" USING btree ("programme_year");
