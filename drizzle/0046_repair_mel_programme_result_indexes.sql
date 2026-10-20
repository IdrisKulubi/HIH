CREATE UNIQUE INDEX IF NOT EXISTS "mel_programme_results_indicator_period_segment_unique"
ON "mel_programme_results" USING btree ("indicator_id", "reporting_period_id", "segment_key");
