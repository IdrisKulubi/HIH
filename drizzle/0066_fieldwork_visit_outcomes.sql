ALTER TABLE "fieldwork_visits" ADD COLUMN IF NOT EXISTS "outcomes" text[] DEFAULT '{}'::text[] NOT NULL;
