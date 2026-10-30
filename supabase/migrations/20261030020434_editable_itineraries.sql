BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS budget_limit numeric;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS edit_version integer NOT NULL DEFAULT 0;
ALTER TABLE public.trip_spots ADD COLUMN IF NOT EXISTS notes text;

-- One transaction: a failed stop validation never leaves a partially edited route.
-- Existing RLS remains in force; only the owner can change trip metadata.
CREATE OR REPLACE FUNCTION public.update_trip_with_stops(
  p_trip_id uuid, p_expected_version integer, p_title text, p_duration_days integer,
  p_notes text, p_budget_limit numeric, p_currency text, p_stops jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE saved public.trips%ROWTYPE; item jsonb; stop public.trip_spots%ROWTYPE; position integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO saved FROM public.trips
    WHERE id = p_trip_id AND owner_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trip unavailable or not owned'; END IF;
  IF saved.edit_version IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION 'TRIP_CONFLICT: reload before editing';
  END IF;
  IF p_title IS NULL OR length(trim(p_title)) NOT BETWEEN 1 AND 200
    OR p_duration_days IS NULL OR p_duration_days NOT BETWEEN 1 AND 30
    OR length(coalesce(p_notes,'')) > 5000
    OR p_currency IS NULL OR p_currency NOT IN ('USD','CRC')
    OR (p_budget_limit IS NOT NULL AND (p_budget_limit < 0 OR p_budget_limit > 100000000 OR p_budget_limit::text = 'NaN'))
    OR jsonb_typeof(p_stops) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid trip'; END IF;
  IF jsonb_array_length(p_stops) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid stops'; END IF;
  UPDATE public.trips SET title=trim(p_title),duration_days=p_duration_days,
    notes=coalesce(p_notes,''),budget_limit=p_budget_limit,currency=p_currency,
    edit_version=edit_version+1 WHERE id=p_trip_id RETURNING * INTO saved;
  DELETE FROM public.trip_spots WHERE trip_id=p_trip_id;
  FOR item IN SELECT value FROM jsonb_array_elements(p_stops) LOOP
    SELECT * INTO stop FROM jsonb_populate_record(NULL::public.trip_spots,item);
    IF stop.day_number IS NULL OR stop.day_number NOT BETWEEN 1 AND p_duration_days
      OR stop.estimated_cost IS NULL OR stop.estimated_cost < 0 OR stop.estimated_cost > 100000000
      OR stop.estimated_cost::text = 'NaN'
      OR coalesce(length(trim(stop.custom_title)),0) NOT BETWEEN 1 AND 200
      OR length(stop.custom_address) > 500 OR length(stop.notes) > 5000 THEN
      RAISE EXCEPTION 'Invalid stop';
    END IF;
    IF stop.spot_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.spots WHERE id=stop.spot_id AND is_verified IS TRUE AND verification_status='approved'
    ) THEN RAISE EXCEPTION 'Destination unavailable'; END IF;
    INSERT INTO public.trip_spots(trip_id,spot_id,custom_title,custom_address,day_number,order_index,estimated_cost,notes)
    VALUES(p_trip_id,stop.spot_id,trim(stop.custom_title),stop.custom_address,stop.day_number,position,stop.estimated_cost,stop.notes);
    position := position+1;
  END LOOP;
  RETURN jsonb_build_object('id',saved.id,'edit_version',saved.edit_version);
END;
$$;
REVOKE ALL ON FUNCTION public.update_trip_with_stops(uuid,integer,text,integer,text,numeric,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_trip_with_stops(uuid,integer,text,integer,text,numeric,text,jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
