-- Repair DBs missing the unique index from 0011 (required for upsert semantics / integrity).
-- Drop duplicate (activity_id, review_period) rows, keeping the lowest id.
DELETE FROM cdp_activity_progress_reviews AS d
WHERE EXISTS (
  SELECT 1
  FROM cdp_activity_progress_reviews AS d2
  WHERE d2.activity_id = d.activity_id
    AND d2.review_period = d.review_period
    AND d2.id < d.id
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cdp_activity_progress_activity_quarter_uq"
ON "cdp_activity_progress_reviews" USING btree ("activity_id","review_period");
