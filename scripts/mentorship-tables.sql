-- Mentorship tables only (from drizzle/0010_nappy_maverick.sql)
-- Run against the same database your app uses (prod POSTGRES_URL).
-- Safe to re-run: enums/tables use IF NOT EXISTS patterns.

DO $$ BEGIN
  CREATE TYPE "public"."action_item_status" AS ENUM('pending', 'partial', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."mentorship_match_status" AS ENUM('active', 'completed', 'terminated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."session_status" AS ENUM('scheduled', 'completed', 'missed', 'rescheduled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."session_type" AS ENUM('physical', 'virtual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "mentors" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "expertise_area" "business_sector" NOT NULL,
  "max_mentees" integer DEFAULT 3,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mentors_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE IF NOT EXISTS "mentorship_matches" (
  "id" serial PRIMARY KEY NOT NULL,
  "business_id" integer NOT NULL,
  "mentor_id" integer NOT NULL,
  "status" "mentorship_match_status" DEFAULT 'active' NOT NULL,
  "start_date" timestamp DEFAULT now() NOT NULL,
  "end_date" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "mentorship_sessions" (
  "id" serial PRIMARY KEY NOT NULL,
  "match_id" integer NOT NULL,
  "session_number" integer NOT NULL,
  "session_type" "session_type" NOT NULL,
  "status" "session_status" DEFAULT 'scheduled' NOT NULL,
  "scheduled_date" timestamp NOT NULL,
  "completed_date" timestamp,
  "diagnostic_notes" text,
  "photographic_evidence_url" varchar(500),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "mentorship_action_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "session_id" integer NOT NULL,
  "description" text NOT NULL,
  "status" "action_item_status" DEFAULT 'pending' NOT NULL,
  "enterprise_feedback" text,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "mentors"
    ADD CONSTRAINT "mentors_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "mentorship_matches"
    ADD CONSTRAINT "mentorship_matches_business_id_businesses_id_fk"
    FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "mentorship_matches"
    ADD CONSTRAINT "mentorship_matches_mentor_id_mentors_id_fk"
    FOREIGN KEY ("mentor_id") REFERENCES "public"."mentors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "mentorship_sessions"
    ADD CONSTRAINT "mentorship_sessions_match_id_mentorship_matches_id_fk"
    FOREIGN KEY ("match_id") REFERENCES "public"."mentorship_matches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "mentorship_action_items"
    ADD CONSTRAINT "mentorship_action_items_session_id_mentorship_sessions_id_fk"
    FOREIGN KEY ("session_id") REFERENCES "public"."mentorship_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "mentors_user_id_idx" ON "mentors" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "mentorship_matches_business_id_idx" ON "mentorship_matches" USING btree ("business_id");
CREATE INDEX IF NOT EXISTS "mentorship_matches_mentor_id_idx" ON "mentorship_matches" USING btree ("mentor_id");
CREATE INDEX IF NOT EXISTS "mentorship_sessions_match_id_idx" ON "mentorship_sessions" USING btree ("match_id");
CREATE UNIQUE INDEX IF NOT EXISTS "mentorship_sessions_match_session_uq" ON "mentorship_sessions" USING btree ("match_id", "session_number");
CREATE INDEX IF NOT EXISTS "mentorship_action_items_session_id_idx" ON "mentorship_action_items" USING btree ("session_id");
