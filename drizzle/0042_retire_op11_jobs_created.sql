-- Retire duplicate output jobs indicator; impact IM-JOBS-CREATED remains the official jobs measure.
UPDATE "mel_indicator_definitions"
SET
  "is_active" = false,
  "updated_at" = now()
WHERE "code" = 'OP1.1-JOBS-CREATED'
  AND "is_active" = true;
