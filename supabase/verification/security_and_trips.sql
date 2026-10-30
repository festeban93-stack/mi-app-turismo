-- Read-only checks after running the complete migration successfully.
SELECT 'rls_en_las_cuatro_tablas' AS comprobacion,
  (SELECT count(*) = 4 AND bool_and(c.relrowsecurity)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN ('spots','trips','trip_spots','trip_collaborators')) AS correcto
UNION ALL
SELECT 'visitantes_no_escriben_destinos',
  NOT has_table_privilege('anon','public.spots','INSERT,UPDATE,DELETE,TRUNCATE')
UNION ALL
SELECT 'usuarios_no_aprueban_destinos_directamente',
  NOT has_table_privilege('authenticated','public.spots','INSERT,UPDATE,DELETE,TRUNCATE')
UNION ALL
SELECT 'usuarios_no_pueden_vaciar_tablas_de_viajes',
  NOT has_table_privilege('authenticated','public.trips','TRUNCATE')
  AND NOT has_table_privilege('authenticated','public.trip_spots','TRUNCATE')
  AND NOT has_table_privilege('authenticated','public.trip_collaborators','TRUNCATE')
UNION ALL
SELECT 'sin_politicas_de_acceso_global', NOT EXISTS (
  SELECT 1 FROM pg_policies WHERE schemaname='public'
  AND tablename IN ('spots','trips','trip_spots','trip_collaborators')
  AND (qual='true' OR with_check='true')
)
UNION ALL
SELECT 'guardado_atomico_autenticado',
  has_function_privilege('authenticated','public.create_trip_with_stops(text,integer,jsonb,jsonb,text)','EXECUTE')
  AND NOT has_function_privilege('anon','public.create_trip_with_stops(text,integer,jsonb,jsonb,text)','EXECUTE')
UNION ALL
SELECT 'cuotas_exclusivas_del_servidor',
  has_function_privilege('service_role','public.consume_api_quota(uuid,text)','EXECUTE')
  AND NOT has_function_privilege('anon','public.consume_api_quota(uuid,text)','EXECUTE')
  AND NOT has_function_privilege('authenticated','public.consume_api_quota(uuid,text)','EXECUTE')
UNION ALL
SELECT 'bucket_de_imagenes_disponible', EXISTS (
  SELECT 1 FROM storage.buckets WHERE id='spot-images' AND public IS TRUE
);
