ALTER TABLE "mentorship_sessions"
  ADD COLUMN IF NOT EXISTS "evidence_files" jsonb DEFAULT '[]'::jsonb;

UPDATE "mentorship_sessions"
SET "evidence_files" = jsonb_build_array(
  jsonb_build_object(
    'url', "photographic_evidence_url",
    'name', 'Evidence',
    'type', 'application/octet-stream',
    'uploadedById', null,
    'uploadedAt', to_char(COALESCE("updated_at", "created_at"), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
)
WHERE "photographic_evidence_url" IS NOT NULL
  AND trim("photographic_evidence_url") <> ''
  AND COALESCE(jsonb_array_length("evidence_files"), 0) = 0;
