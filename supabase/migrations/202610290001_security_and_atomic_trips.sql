-- Compatible with the exported production schema: UUID IDs and public.data_source enum.
-- Run the WHOLE file in SQL Editor as postgres before deploying the application.
-- Replaces policies only on spots, trips, trip_spots and trip_collaborators.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Abort rather than partially modifying a project with an unexpected schema.
DO $$
BEGIN
  IF to_regclass('public.spots') IS NULL OR to_regclass('public.trips') IS NULL
    OR to_regclass('public.trip_spots') IS NULL OR to_regclass('public.trip_collaborators') IS NULL THEN
    RAISE EXCEPTION 'Required application tables are missing';
  END IF;
END $$;

ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending';
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
-- Defaults describe unknown information; existing values are preserved.
ALTER TABLE public.spots ALTER COLUMN opening_hours SET DEFAULT 'Sin confirmar';
ALTER TABLE public.spots ALTER COLUMN entry_fee SET DEFAULT 'Sin confirmar';
ALTER TABLE public.spots ALTER COLUMN rating_avg DROP DEFAULT;
-- Review old generated records once, retaining all rows and original metadata.
UPDATE public.spots SET is_verified = false, verification_status = 'pending',
  metadata = coalesce(metadata, '{}'::jsonb) || '{"security_review_20261029":true}'::jsonb
WHERE source_type::text = 'ai_scraper'
  AND NOT coalesce(metadata, '{}'::jsonb) ? 'security_review_20261029';
UPDATE public.spots SET verification_status = 'pending' WHERE verification_status IS NULL;

-- The exported policies contained USING(true)/WITH CHECK(true) for public writes
-- and all authenticated trip rows. Replace the complete policy sets, not just add
-- permissive rules that would be OR-ed with those unsafe policies.
DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('spots','trips','trip_spots','trip_collaborators')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', item.policyname, item.schemaname, item.tablename);
  END LOOP;
END $$;
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS does not protect TRUNCATE; reset table-level grants as well.
REVOKE ALL ON public.spots, public.trips, public.trip_spots, public.trip_collaborators FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.spots TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips, public.trip_spots, public.trip_collaborators TO authenticated;
GRANT ALL ON public.spots, public.trips, public.trip_spots, public.trip_collaborators TO service_role;

CREATE POLICY spots_approved_read ON public.spots FOR SELECT TO anon, authenticated
USING (is_verified IS TRUE AND verification_status = 'approved');
CREATE POLICY spots_admin_read ON public.spots FOR SELECT TO authenticated
USING (((select auth.jwt())->'app_metadata'->>'role') = 'admin');
-- No browser writes to spots: authenticated server endpoints enforce moderation.

-- Internal membership lookup avoids circular RLS between trips and invitations.
-- This schema must NOT be added to Supabase Data API exposed schemas.
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated;
CREATE OR REPLACE FUNCTION app_private.trip_access(p_trip_id uuid, p_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT (select auth.uid()) IS NOT NULL AND p_permission IN ('read','edit','own') AND EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = p_trip_id AND (
      t.owner_id = (select auth.uid()) OR (
        p_permission <> 'own' AND EXISTS (
          SELECT 1 FROM public.trip_collaborators c
          WHERE c.trip_id = t.id
          AND (p_permission = 'read' OR c.role = 'editor')
          AND (c.user_id = (select auth.uid()) OR (
            c.user_id IS NULL AND lower(trim(c.invited_email)) =
              nullif(lower(trim((select auth.jwt())->>'email')), '')
          ))
        )
      )
    )
  );
$$;
REVOKE ALL ON FUNCTION app_private.trip_access(uuid,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.trip_access(uuid,text) TO authenticated;

CREATE POLICY trips_member_read ON public.trips FOR SELECT TO authenticated
USING (owner_id = (select auth.uid()) OR (select app_private.trip_access(id,'read')));
CREATE POLICY trips_owner_insert ON public.trips FOR INSERT TO authenticated
WITH CHECK (owner_id = (select auth.uid()));
CREATE POLICY trips_owner_update ON public.trips FOR UPDATE TO authenticated
USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));
CREATE POLICY trips_owner_delete ON public.trips FOR DELETE TO authenticated
USING (owner_id = (select auth.uid()));

CREATE POLICY trip_spots_member_read ON public.trip_spots FOR SELECT TO authenticated
USING ((select app_private.trip_access(trip_id,'read')));
CREATE POLICY trip_spots_editor_insert ON public.trip_spots FOR INSERT TO authenticated
WITH CHECK ((select app_private.trip_access(trip_id,'edit')));
CREATE POLICY trip_spots_editor_update ON public.trip_spots FOR UPDATE TO authenticated
USING ((select app_private.trip_access(trip_id,'edit')))
WITH CHECK ((select app_private.trip_access(trip_id,'edit')));
CREATE POLICY trip_spots_editor_delete ON public.trip_spots FOR DELETE TO authenticated
USING ((select app_private.trip_access(trip_id,'edit')));

-- Owners manage invitations. Invitees can only read their own invitation.
CREATE POLICY collaborators_read ON public.trip_collaborators FOR SELECT TO authenticated
USING ((select app_private.trip_access(trip_id,'own')) OR user_id = (select auth.uid()) OR (
  user_id IS NULL AND lower(trim(invited_email)) = nullif(lower(trim((select auth.jwt())->>'email')), '')
));
CREATE POLICY collaborators_owner_insert ON public.trip_collaborators FOR INSERT TO authenticated
WITH CHECK ((select app_private.trip_access(trip_id,'own')));
CREATE POLICY collaborators_owner_update ON public.trip_collaborators FOR UPDATE TO authenticated
USING ((select app_private.trip_access(trip_id,'own')))
WITH CHECK ((select app_private.trip_access(trip_id,'own')));
CREATE POLICY collaborators_owner_delete ON public.trip_collaborators FOR DELETE TO authenticated
USING ((select app_private.trip_access(trip_id,'own')));

CREATE INDEX IF NOT EXISTS trips_owner_access_idx ON public.trips(owner_id);
CREATE INDEX IF NOT EXISTS trip_spots_trip_access_idx ON public.trip_spots(trip_id);
CREATE INDEX IF NOT EXISTS collaborators_trip_access_idx ON public.trip_collaborators(trip_id);
CREATE INDEX IF NOT EXISTS collaborators_user_access_idx ON public.trip_collaborators(user_id);

-- Quotas are server-only and shared across all application instances.
CREATE TABLE IF NOT EXISTS public.api_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, scope, window_start)
);
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_usage FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.consume_api_quota(p_user_id uuid, p_scope text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE current_count integer; maximum integer;
BEGIN
  maximum := CASE p_scope WHEN 'upload' THEN 10 WHEN 'spot' THEN 20 WHEN 'ai' THEN 30 ELSE NULL END;
  IF maximum IS NULL THEN RAISE EXCEPTION 'Invalid scope'; END IF;
  INSERT INTO public.api_usage(user_id, scope, window_start)
  VALUES (p_user_id, p_scope, date_trunc('hour', now()))
  ON CONFLICT (user_id, scope, window_start) DO UPDATE SET count = public.api_usage.count + 1
  RETURNING count INTO current_count;
  -- Retain only recent quota windows; no personal payloads are stored.
  DELETE FROM public.api_usage WHERE window_start < now() - interval '2 days';
  RETURN current_count <= maximum;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_api_quota(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_quota(uuid, text) TO service_role;

-- Direct browser writes to this bucket cannot bypass image validation or quotas.
DROP POLICY IF EXISTS spot_images_insert_guard ON storage.objects;
DROP POLICY IF EXISTS spot_images_update_guard ON storage.objects;
DROP POLICY IF EXISTS spot_images_delete_guard ON storage.objects;
CREATE POLICY spot_images_insert_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id <> 'spot-images');
CREATE POLICY spot_images_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon, authenticated
USING (bucket_id <> 'spot-images') WITH CHECK (bucket_id <> 'spot-images');
CREATE POLICY spot_images_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO anon, authenticated
USING (bucket_id <> 'spot-images');

CREATE OR REPLACE FUNCTION public.create_trip_with_stops(
  p_title text, p_duration_days integer, p_stops jsonb,
  p_emails jsonb DEFAULT '[]', p_ai_prompt text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE saved public.trips%ROWTYPE; item jsonb; stop public.trip_spots%ROWTYPE; email text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_title IS NULL OR length(trim(p_title)) NOT BETWEEN 1 AND 200 OR p_duration_days IS NULL OR p_duration_days NOT BETWEEN 1 AND 30
    OR jsonb_typeof(p_stops) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid trip'; END IF;
  IF jsonb_array_length(p_stops) NOT BETWEEN 1 AND 100 OR jsonb_typeof(p_emails) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid stops'; END IF;
  IF jsonb_array_length(p_emails) > 20 OR length(p_ai_prompt) > 5000 THEN RAISE EXCEPTION 'Too many collaborators or prompt too long'; END IF;
  INSERT INTO public.trips(owner_id,title,duration_days,is_ai_generated,ai_prompt)
  VALUES(auth.uid(),trim(p_title),p_duration_days,p_ai_prompt IS NOT NULL,p_ai_prompt) RETURNING * INTO saved;
  FOR item IN SELECT value FROM jsonb_array_elements(p_stops) LOOP
    -- Populate only whitelisted fields; IDs are cast using the existing table's types.
    SELECT * INTO stop FROM jsonb_populate_record(NULL::public.trip_spots, item);
    IF stop.day_number IS NULL OR stop.day_number NOT BETWEEN 1 AND p_duration_days
      OR stop.order_index IS NULL OR stop.order_index NOT BETWEEN 0 AND 99
      OR stop.estimated_cost IS NULL OR stop.estimated_cost < 0 OR stop.estimated_cost > 100000000
      OR (stop.spot_id IS NULL AND coalesce(length(trim(stop.custom_title)),0) NOT BETWEEN 1 AND 200)
      OR length(stop.custom_address) > 500 THEN RAISE EXCEPTION 'Invalid stop'; END IF;
    IF stop.spot_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.spots WHERE id = stop.spot_id AND is_verified IS TRUE AND verification_status = 'approved'
    ) THEN RAISE EXCEPTION 'Destination unavailable'; END IF;
    INSERT INTO public.trip_spots(trip_id,spot_id,custom_title,custom_address,day_number,order_index,estimated_cost)
    VALUES(saved.id,stop.spot_id,stop.custom_title,stop.custom_address,stop.day_number,stop.order_index,stop.estimated_cost);
  END LOOP;
  FOR email IN SELECT DISTINCT lower(trim(value)) FROM jsonb_array_elements_text(p_emails) LOOP
    IF length(email) > 254 OR email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Invalid collaborator'; END IF;
    INSERT INTO public.trip_collaborators(trip_id,invited_email,role) VALUES(saved.id,email,'editor');
  END LOOP;
  RETURN jsonb_build_object('id',saved.id);
END;
$$;
REVOKE ALL ON FUNCTION public.create_trip_with_stops(text,integer,jsonb,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_trip_with_stops(text,integer,jsonb,jsonb,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
