-- Transfer Caroline Muthee's nine active enterprise assignments to Maureen Kaburu
-- and Grace Kariithi. Run against the intended production database.
-- This is atomic: any missing/ambiguous account or enterprise raises an error
-- and rolls back the entire transfer.

BEGIN;
SET LOCAL search_path TO public;

DO $transfer$
DECLARE
  caroline_id text;
  maureen_id text;
  grace_id text;
  expected_count integer;
  valid_count integer;
  affected_count integer;
BEGIN
  IF to_regclass('public.user_profiles') IS NULL
     OR to_regclass('public.mel_enterprise_assignments') IS NULL
     OR to_regclass('public.businesses') IS NULL THEN
    RAISE EXCEPTION 'Required tables are missing from database %, schema public. Check the SQL editor connection/database.', current_database();
  END IF;

  SELECT user_id INTO caroline_id
  FROM public.user_profiles
  WHERE lower(trim(email)) = lower('caroline.muthee@handinhand-ea.org')
    AND role = 'bds_edo';
  IF caroline_id IS NULL OR (SELECT count(*) FROM public.user_profiles WHERE lower(trim(email)) = lower('caroline.muthee@handinhand-ea.org') AND role = 'bds_edo') <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one Caroline account with role bds_edo';
  END IF;

  SELECT user_id INTO maureen_id
  FROM public.user_profiles
  WHERE lower(trim(email)) = lower('Maureen.kaburu@handinhand-ea.org')
    AND role = 'bds_edo';
  IF maureen_id IS NULL OR (SELECT count(*) FROM public.user_profiles WHERE lower(trim(email)) = lower('Maureen.kaburu@handinhand-ea.org') AND role = 'bds_edo') <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one Maureen account with role bds_edo';
  END IF;

  SELECT user_id INTO grace_id
  FROM public.user_profiles
  WHERE lower(trim(email)) = lower('Grace.kariithi@handinhand-ea.org')
    AND role = 'bds_edo';
  IF grace_id IS NULL OR (SELECT count(*) FROM public.user_profiles WHERE lower(trim(email)) = lower('Grace.kariithi@handinhand-ea.org') AND role = 'bds_edo') <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one Grace account with role bds_edo';
  END IF;

  IF maureen_id = grace_id OR caroline_id IN (maureen_id, grace_id) THEN
    RAISE EXCEPTION 'Caroline, Maureen, and Grace must be three distinct accounts';
  END IF;

  -- Check enterprise names are unique and all nine were found.
  WITH requested(name, business_id) AS (
    VALUES
      ('PENA STEEL COMPANY', 1058),
      ('Pitch Africa Studios & Tech Hub', 882),
      ('Play Academy Africa', 391),
      ('Royal Couture Kenya', 811),
      ('Rungeto Upishi Kisasa Self Help Group', 877),
      ('SPOTON CATERERS', 1084),
      ('The Phlogiston Company Limited', 521),
      ('USTAWI KENYA PROGRAM', 986),
      ('Watbell Enterprises', 957)
  )
  SELECT count(*) INTO valid_count
  FROM requested r
  JOIN public.businesses b ON b.id = r.business_id
    AND lower(trim(b.name)) = lower(r.name);

  WITH requested(name) AS (
    VALUES
      ('PENA STEEL COMPANY'),
      ('Pitch Africa Studios & Tech Hub'),
      ('Play Academy Africa'),
      ('Royal Couture Kenya'),
      ('Rungeto Upishi Kisasa Self Help Group'),
      ('SPOTON CATERERS'),
      ('The Phlogiston Company Limited'),
      ('USTAWI KENYA PROGRAM'),
      ('Watbell Enterprises')
  ), matches AS (
    SELECT r.name, count(b.id) AS match_count
    FROM requested r
    LEFT JOIN public.businesses b ON lower(trim(b.name)) = lower(r.name)
    GROUP BY r.name
  )
  SELECT count(*) INTO expected_count FROM matches WHERE match_count = 1;

  IF expected_count <> 9 OR valid_count <> 9 THEN
    RAISE EXCEPTION 'Enterprise names must each match one row and the expected database ID; unique name matches: %', expected_count;
  END IF;

  -- Ensure these are exactly the nine currently active Caroline assignments.
  WITH requested(name, business_id) AS (
    VALUES
      ('PENA STEEL COMPANY', 1058),
      ('Pitch Africa Studios & Tech Hub', 882),
      ('Play Academy Africa', 391),
      ('Royal Couture Kenya', 811),
      ('Rungeto Upishi Kisasa Self Help Group', 877),
      ('SPOTON CATERERS', 1084),
      ('The Phlogiston Company Limited', 521),
      ('USTAWI KENYA PROGRAM', 986),
      ('Watbell Enterprises', 957)
  ), target_businesses AS (
    SELECT b.id
    FROM requested r
    JOIN public.businesses b ON b.id = r.business_id
      AND lower(trim(b.name)) = lower(r.name)
  )
  SELECT count(*) INTO affected_count
  FROM public.mel_enterprise_assignments a
  JOIN target_businesses b ON b.id = a.business_id
  WHERE a.collector_id = caroline_id AND a.is_active;

  IF affected_count <> 9 THEN
    RAISE EXCEPTION 'Expected 9 active Caroline assignments among requested enterprises, found %', affected_count;
  END IF;

  -- End Caroline's assignment history for the nine businesses.
  WITH requested(name, business_id) AS (
    VALUES
      ('PENA STEEL COMPANY', 1058),
      ('Pitch Africa Studios & Tech Hub', 882),
      ('Play Academy Africa', 391),
      ('Royal Couture Kenya', 811),
      ('Rungeto Upishi Kisasa Self Help Group', 877),
      ('SPOTON CATERERS', 1084),
      ('The Phlogiston Company Limited', 521),
      ('USTAWI KENYA PROGRAM', 986),
      ('Watbell Enterprises', 957)
  ), target_businesses AS (
    SELECT b.id FROM requested r
    JOIN public.businesses b ON b.id = r.business_id
      AND lower(trim(b.name)) = lower(r.name)
  )
  UPDATE public.mel_enterprise_assignments a
  SET is_active = false, ended_at = now()
  FROM target_businesses b
  WHERE a.business_id = b.id
    AND a.collector_id = caroline_id
    AND a.is_active;

  -- Apply the requested ownership. Existing active assignments to the same
  -- recipient are preserved; otherwise insert a new active assignment.
  WITH requested(name, business_id, recipient_id) AS (
    VALUES
      ('PENA STEEL COMPANY', 1058, maureen_id),
      ('Pitch Africa Studios & Tech Hub', 882, maureen_id),
      ('Play Academy Africa', 391, grace_id),
      ('Royal Couture Kenya', 811, grace_id),
      ('Rungeto Upishi Kisasa Self Help Group', 877, maureen_id),
      ('SPOTON CATERERS', 1084, grace_id),
      ('The Phlogiston Company Limited', 521, grace_id),
      ('USTAWI KENYA PROGRAM', 986, grace_id),
      ('Watbell Enterprises', 957, maureen_id)
  ), target_assignments AS (
    SELECT b.id AS business_id, r.recipient_id
    FROM requested r
    JOIN public.businesses b ON b.id = r.business_id
      AND lower(trim(b.name)) = lower(r.name)
  )
  INSERT INTO public.mel_enterprise_assignments
    (business_id, collector_id, assigned_by_id, is_active, assigned_at)
  SELECT t.business_id, t.recipient_id, NULL, true, now()
  FROM target_assignments t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.mel_enterprise_assignments existing
    WHERE existing.business_id = t.business_id
      AND existing.collector_id = t.recipient_id
      AND existing.is_active
  );

  -- Verify each enterprise now has exactly the requested active EDO assignment.
  WITH requested(name, business_id, recipient_id) AS (
    VALUES
      ('PENA STEEL COMPANY', 1058, maureen_id),
      ('Pitch Africa Studios & Tech Hub', 882, maureen_id),
      ('Play Academy Africa', 391, grace_id),
      ('Royal Couture Kenya', 811, grace_id),
      ('Rungeto Upishi Kisasa Self Help Group', 877, maureen_id),
      ('SPOTON CATERERS', 1084, grace_id),
      ('The Phlogiston Company Limited', 521, grace_id),
      ('USTAWI KENYA PROGRAM', 986, grace_id),
      ('Watbell Enterprises', 957, maureen_id)
  ), target_assignments AS (
    SELECT b.id AS business_id, r.recipient_id
    FROM requested r
    JOIN public.businesses b ON b.id = r.business_id
      AND lower(trim(b.name)) = lower(r.name)
  )
  SELECT count(*) INTO affected_count
  FROM target_assignments t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.mel_enterprise_assignments a
    WHERE a.business_id = t.business_id
      AND a.collector_id = t.recipient_id
      AND a.is_active
  ) OR EXISTS (
    SELECT 1 FROM public.mel_enterprise_assignments a
    WHERE a.business_id = t.business_id
      AND a.is_active
      AND a.collector_id NOT IN (t.recipient_id)
  );

  IF affected_count <> 0 THEN
    RAISE EXCEPTION 'Assignment verification failed for % enterprise(s)', affected_count;
  END IF;
END;
$transfer$;

-- Review the assignments while still inside the transaction.
SELECT b.name AS enterprise, up.email AS assigned_edo, a.is_active
FROM public.mel_enterprise_assignments a
JOIN public.businesses b ON b.id = a.business_id
JOIN public.user_profiles up ON up.user_id = a.collector_id
WHERE a.is_active
  AND b.id IN (1058, 882, 391, 811, 877, 1084, 521, 986, 957)
ORDER BY b.name;

COMMIT;
