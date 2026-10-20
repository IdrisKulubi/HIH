-- Session 1 is now the virtual kickoff. Existing matches were created with a physical session 1.
UPDATE "mentorship_sessions"
SET
  "session_type" = 'virtual',
  "updated_at" = now()
WHERE "session_number" = 1
  AND "session_type" = 'physical'
  AND "status" = 'scheduled';
