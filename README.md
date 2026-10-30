# MapAI Costa Rica

Aplicación de destinos e itinerarios con Next.js, React, Leaflet y Supabase.

## Instalación

Usá Node.js 22 o 24 y npm. El proyecto usa Next.js 16 y conserva sus versiones resueltas en `package-lock.json`.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Completá las variables con los valores de tu proyecto Supabase. Nunca publiques `.env.local`, la clave `service_role`, las claves de IA ni el secreto de cron. Las variables `NEXT_PUBLIC_*` de Supabase deben estar disponibles al compilar. Los proveedores de IA son opcionales.

## Activar la actualización en Supabase

1. Respaldá la base de datos y probá primero en un proyecto de desarrollo con el mismo esquema.
2. Ejecutá **una vez**, como administrador desde SQL Editor, `supabase/migrations/202610290001_security_and_atomic_trips.sql`.
3. Ejecutá la consulta de solo lectura `supabase/verification/security_and_trips.sql` y revisá las ocho comprobaciones. Si alguna devuelve `false`, resolvé ese punto antes de desplegar.
4. Confirmá que el bucket `spot-images` existe y permite lectura pública de sus imágenes. Las escrituras pasan exclusivamente por la API autenticada, que valida las imágenes y las convierte a WebP.
5. Configurá las variables del servidor y desplegá esta versión de la aplicación después de aplicar la migración.
6. Iniciá sesión y comprobá un aporte, una aprobación y un itinerario completo.

La migración asume las tablas que ya usa la aplicación: `spots` (incluye `source_type`, `location` y `created_at`), `trips` (`owner_id`, `title`, `duration_days`, `is_ai_generated`, `ai_prompt`), `trip_spots` (`trip_id`, `spot_id`, `custom_title`, `custom_address`, `day_number`, `order_index`, `estimated_cost`) y `trip_collaborators` (`trip_id`, `invited_email`, `role`). No crea el esquema inicial de una aplicación vacía. Los tipos de IDs se toman de las tablas existentes. Si el esquema difiere, revisá la migración antes de ejecutarla; una falla revierte toda la migración.

La migración reemplaza las políticas de las cuatro tablas revisadas (`spots`, `trips`, `trip_spots`, `trip_collaborators`), porque la exportación real incluía escritura pública y acceso global de usuarios autenticados. Se mantienen los viajes y sus relaciones: el propietario administra el viaje y sus invitaciones, un editor invitado puede modificar paradas y un invitado de lectura solo puede leer. El esquema interno `app_private` evita recursión entre políticas y NO debe exponerse en Data API. Revisá por separado perfiles, reclamos, vistas y RPC anteriores; no se modifican en esta migración.

Los destinos generados por los antiguos importadores de IA se ponen pendientes de revisión una sola vez; una marca en `metadata` permite repetir el archivo sin volver a ocultar registros revisados después. Los registros sin aprobación explícita dejan de aparecer públicamente. No se eliminan destinos. Revisá además cualquier dato histórico importado desde otras fuentes que no tenga un `source_type` identificable.

La adaptación usa los valores reales de `public.data_source`: `crowdsourcing`, `ai_scraper` y `b2b_verified`. Las importaciones OSM y administrativas usan `crowdsourcing` y guardan su procedencia en `metadata.import_origin`; nunca crean etiquetas de enum inexistentes. Los nuevos horarios y tarifas quedan sin confirmar por defecto, y no se asigna una calificación de cinco estrellas por defecto. Los valores históricos existentes no se sustituyen indiscriminadamente.

La prueba de regresión carga las políticas exportadas del proyecto y el enum real antes de ejecutar la migración. Comprueba la privacidad entre cuentas, la edición por invitación, la lectura sin edición, el rechazo de auto-invitaciones y la repetición del archivo sin pérdida de viajes.

## Cuenta administradora y moderación

Los permisos dependen de `app_metadata.role = "admin"`, administrado por Supabase. **No** uses `user_metadata` ni el campo editable de un perfil como autorización.

Para dar el rol a una cuenta conocida, obtené su UUID en Supabase Authentication y ejecutá en SQL Editor (reemplazando el UUID):

```sql
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
WHERE id = 'UUID_DE_LA_CUENTA_ADMINISTRADORA'::uuid;
```

Cerrá e iniciá sesión de nuevo para renovar el JWT. Entrá a `/admin/ingest`: podés importar destinos pendientes, consultar la cola, contrastar la información con fuentes reales y aprobar o rechazar cada registro. Las rutas administrativas verifican la sesión en el servidor antes de usar permisos privilegiados.

Los aportes de usuarios requieren una fotografía subida desde su cuenta. El servidor admite JPEG, PNG y WebP de hasta 5 MB y 25 megapíxeles; elimina metadatos al convertirlos a WebP, con un máximo de 2400 × 2400 píxeles. Hay un límite compartido por cuenta y hora de 10 subidas, 20 aportes y 30 solicitudes de IA. Si el control de cuotas falla, la operación se bloquea.

## Itinerarios

Los dos formularios de guardado usan `create_trip_with_stops`. El viaje, sus paradas y sus colaboradores se guardan en una sola transacción: si falla cualquiera, se revierte todo. El propietario se toma de la sesión, nunca del navegador. Se validan días (1–30), paradas (1–100), costos y correos.

Las colaboraciones se registran en la base; esta actualización no envía correos de invitación. Los costos ingresados siguen siendo estimaciones del usuario. No se extraen automáticamente precios de textos ambiguos en las rutas generadas por IA.

## Fuentes y tareas programadas

El mapa público y la API de compatibilidad `/api/places` usan destinos aprobados de `spots`. No se generan calificaciones ni coordenadas de respaldo. Horarios y tarifas desconocidos se muestran como “Sin confirmar”. Los enlaces a Google Maps permiten consultar información; no representan una integración con Google Places API.

Las tareas de cron requieren `Authorization: Bearer <CRON_SECRET>` y rechazan la solicitud si falta el secreto configurado. No envíes el secreto en una URL. `/api/cron/scrape` solo importa resultados reales de OpenStreetMap, pendientes de revisión. Los antiguos importadores de blogs, redes y destinos virales devuelven `410 Gone` porque simulaban la extracción de fuentes. `/api/places/add` fue retirado: usá el formulario actual con fotografía y moderación.

Para importar a nivel nacional usá `POST /api/admin/ingest-national` con la sesión de una cuenta administradora; un GET ya no modifica datos.

## Verificación

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Las pruebas no usan credenciales reales ni llaman a servicios de producción. Cubren autenticación, autorización, moderación, geometrías inválidas, límites de archivos y cuotas, y transacciones/RLS en PostgreSQL local mediante PGlite. `npm run lint` conserva advertencias sobre tipos `any`, dependencias de hooks y otros aspectos heredados; los errores sí hacen fallar el comando. `typecheck` y la compilación verifican TypeScript sin omitir errores.
