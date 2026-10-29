import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const spot = '33333333-3333-4333-8333-333333333333';
async function database() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
      $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    INSERT INTO auth.users VALUES ('${owner}'),('${other}');
    CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text);
    CREATE TABLE public.spots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text,source_type text,is_verified boolean,verification_status text);
    INSERT INTO public.spots VALUES ('${spot}','Cahuita','editorial',true,'approved');
    INSERT INTO public.spots(title,source_type,is_verified,verification_status) VALUES
      ('AI pending','ai_scraper',true,'approved'), ('Rejected','crowdsource',false,'rejected');
    CREATE TABLE public.trips(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES auth.users,
      title text NOT NULL, duration_days integer NOT NULL,is_ai_generated boolean,ai_prompt text);
    CREATE TABLE public.trip_spots(id uuid DEFAULT gen_random_uuid(),trip_id uuid REFERENCES public.trips NOT NULL,
      spot_id uuid REFERENCES public.spots,custom_title text,custom_address text,day_number integer,
      order_index integer,estimated_cost numeric);
    CREATE TABLE public.trip_collaborators(trip_id uuid REFERENCES public.trips NOT NULL,invited_email text,
      role text, CHECK (invited_email <> 'blocked@example.com'));
    -- Simulate an existing overly broad policy: restrictive guards must still work.
    ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
    CREATE POLICY legacy_open ON public.spots FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
    GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated,service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public,storage TO anon,authenticated,service_role;
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/202610290001_security_and_atomic_trips.sql', import.meta.url),'utf8'));
  return db;
}
async function signIn(db: PGlite, id = owner) {
  await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub = '${id}'; SET request.jwt.claims = '{"app_metadata":{"role":"user"}}';`);
}
const stops = JSON.stringify([{ spot_id: spot, day_number: 1, order_index: 0, estimated_cost: 1000 }]);
async function save(db: PGlite, emails: string[] = [], stopList = stops) {
  return db.query<{ create_trip_with_stops: { id: string } }>(
    'SELECT public.create_trip_with_stops($1,$2,$3::jsonb,$4::jsonb)', ['Escapada',3,stopList,JSON.stringify(emails)]);
}

test('atomic save persists trip, stops and unique collaborators', async () => {
  const db = await database();
  try {
    await signIn(db);
    const result = await save(db,['Friend@example.com','friend@example.com']);
    assert.ok(result.rows[0].create_trip_with_stops.id);
    assert.equal((await db.query('SELECT * FROM public.trips')).rows.length,1);
    assert.equal((await db.query('SELECT * FROM public.trip_spots')).rows.length,1);
    assert.equal((await db.query('SELECT * FROM public.trip_collaborators')).rows.length,1);
  } finally { await db.close(); }
});

test('failure in collaborator insert rolls back the whole trip', async () => {
  const db = await database();
  try {
    await signIn(db);
    await assert.rejects(save(db,['blocked@example.com']));
    assert.equal((await db.query('SELECT * FROM public.trips')).rows.length,0);
    assert.equal((await db.query('SELECT * FROM public.trip_spots')).rows.length,0);
  } finally { await db.close(); }
});

test('invalid day and unpublished destination cannot create a partial trip', async () => {
  const db = await database();
  try {
    await signIn(db);
    await assert.rejects(save(db,[], JSON.stringify([{spot_id:spot,day_number:4,order_index:0,estimated_cost:0}])));
    await assert.rejects(save(db,[], JSON.stringify([{spot_id:other,day_number:1,order_index:0,estimated_cost:0}])));
    assert.equal((await db.query('SELECT * FROM public.trips')).rows.length,0);
  } finally { await db.close(); }
});

test('public sees approved destinations only; authenticated users cannot approve themselves', async () => {
  const db = await database();
  try {
    await db.exec('SET ROLE anon');
    assert.deepEqual((await db.query<{title:string}>('SELECT title FROM public.spots')).rows.map(r=>r.title),['Cahuita']);
    await assert.rejects(db.exec("INSERT INTO public.spots(title,is_verified,verification_status) VALUES('Fake',true,'approved')"));
    await signIn(db);
    const changed = await db.query('UPDATE public.spots SET verification_status = \'rejected\' RETURNING id');
    assert.equal(changed.rows.length,0);
    await assert.rejects(saveAfterSignOut(db));
  } finally { await db.close(); }
});
async function saveAfterSignOut(db:PGlite) { await db.exec('SET ROLE anon'); return save(db); }

test('quota is enforced and only service_role can consume it', async () => {
  const db = await database();
  try {
    await signIn(db);
    await assert.rejects(db.query('SELECT public.consume_api_quota($1,\'upload\')',[owner]));
    await db.exec('SET ROLE service_role');
    for(let i=0;i<11;i++) {
      const {rows}=await db.query<{allowed:boolean}>('SELECT public.consume_api_quota($1,\'upload\') AS allowed',[owner]);
      assert.equal(rows[0].allowed,i<10);
    }
  } finally { await db.close(); }
});

test('one user cannot add stops to another user trip', async () => {
  const db = await database();
  try {
    await signIn(db);
    const saved = await save(db);
    const tripId = saved.rows[0].create_trip_with_stops.id;
    await signIn(db,other);
    await assert.rejects(db.query('INSERT INTO public.trip_spots(trip_id,day_number,order_index,estimated_cost) VALUES($1,1,0,0)',[tripId]));
  } finally { await db.close(); }
});
