-- Apply in Supabase SQL Editor as postgres, before deploying the application.
-- Existing tables trips, trip_spots, trip_collaborators and spots are prerequisites.
BEGIN;

ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending';
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
-- Importers historically labelled generated data verified. Quarantine, do not delete.
UPDATE public.spots SET is_verified = false, verification_status = 'pending'
WHERE source_type IN ('ai_scraper', 'ai', 'blog-scraped', 'viral', 'social');
UPDATE public.spots SET verification_status = 'pending' WHERE verification_status IS NULL;

ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
-- Restrictive policies also constrain any older, overly broad permissive policies.
CREATE POLICY spots_public_guard ON public.spots AS RESTRICTIVE FOR SELECT TO anon, authenticated
USING ((is_verified IS TRUE AND verification_status = 'approved') OR (auth.jwt()->'app_metadata'->>'role' = 'admin'));
CREATE POLICY spots_public_read ON public.spots FOR SELECT TO anon, authenticated
USING (is_verified IS TRUE AND verification_status = 'approved');
CREATE POLICY spots_admin_read ON public.spots FOR SELECT TO authenticated
USING (auth.jwt()->'app_metadata'->>'role' = 'admin');
CREATE POLICY spots_insert_guard ON public.spots AS RESTRICTIVE FOR INSERT TO anon, authenticated
WITH CHECK (auth.jwt()->'app_metadata'->>'role' = 'admin');
CREATE POLICY spots_update_guard ON public.spots AS RESTRICTIVE FOR UPDATE TO anon, authenticated
USING (auth.jwt()->'app_metadata'->>'role' = 'admin') WITH CHECK (auth.jwt()->'app_metadata'->>'role' = 'admin');
CREATE POLICY spots_delete_guard ON public.spots AS RESTRICTIVE FOR DELETE TO anon, authenticated
USING (auth.jwt()->'app_metadata'->>'role' = 'admin');

-- Quotas are server-only and shared across all application instances.
CREATE TABLE public.api_usage (
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

-- Browser uploads are forbidden: the authenticated server validates and re-encodes images.
CREATE POLICY spot_images_insert_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id <> 'spot-images');
CREATE POLICY spot_images_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon, authenticated
USING (bucket_id <> 'spot-images') WITH CHECK (bucket_id <> 'spot-images');
CREATE POLICY spot_images_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO anon, authenticated
USING (bucket_id <> 'spot-images');

-- Parent ownership guards secure trip writes, including direct calls to Supabase.
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY trips_owner_read ON public.trips FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY trips_owner_insert ON public.trips FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY trips_insert_guard ON public.trips AS RESTRICTIVE FOR INSERT TO anon, authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY trips_update_guard ON public.trips AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY trips_delete_guard ON public.trips AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (owner_id = auth.uid());
CREATE POLICY trip_spots_owner_access ON public.trip_spots FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = trip_spots.trip_id AND owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = trip_spots.trip_id AND owner_id = auth.uid()));
CREATE POLICY trip_spots_write_guard ON public.trip_spots AS RESTRICTIVE FOR INSERT TO anon, authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = trip_spots.trip_id AND owner_id = auth.uid()));
CREATE POLICY trip_spots_update_guard ON public.trip_spots AS RESTRICTIVE FOR UPDATE TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = trip_spots.trip_id AND owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = trip_spots.trip_id AND owner_id = auth.uid()));
CREATE POLICY trip_spots_delete_guard ON public.trip_spots AS RESTRICTIVE FOR DELETE TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = trip_spots.trip_id AND owner_id = auth.uid()));
CREATE POLICY collaborators_owner_access ON public.trip_collaborators FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = trip_collaborators.trip_id AND owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = trip_collaborators.trip_id AND owner_id = auth.uid()));
CREATE POLICY collaborators_write_guard ON public.trip_collaborators AS RESTRICTIVE FOR INSERT TO anon, authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = trip_collaborators.trip_id AND owner_id = auth.uid()));
CREATE POLICY collaborators_update_guard ON public.trip_collaborators AS RESTRICTIVE FOR UPDATE TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = trip_collaborators.trip_id AND owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = trip_collaborators.trip_id AND owner_id = auth.uid()));
CREATE POLICY collaborators_delete_guard ON public.trip_collaborators AS RESTRICTIVE FOR DELETE TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.trips WHERE trips.id = trip_collaborators.trip_id AND owner_id = auth.uid()));

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
COMMIT;
