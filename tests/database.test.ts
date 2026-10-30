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
    CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean);
    INSERT INTO storage.buckets VALUES('spot-images',true);
    CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text);
    CREATE TYPE public.data_source AS ENUM ('crowdsourcing','ai_scraper','b2b_verified');
    CREATE TABLE public.spots(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text,
      source_type public.data_source DEFAULT 'crowdsourcing', is_verified boolean,verification_status text,
      opening_hours text DEFAULT 'Lunes a Domingo: 8:00 AM - 5:00 PM',entry_fee text DEFAULT 'Entrada Gratuita',
      rating_avg numeric DEFAULT 5.00,metadata jsonb DEFAULT '{}');
    INSERT INTO public.spots(id,title,source_type,is_verified,verification_status) VALUES ('${spot}','Cahuita','b2b_verified',true,'approved');
    INSERT INTO public.spots(title,source_type,is_verified,verification_status) VALUES
      ('AI pending','ai_scraper',true,'approved'), ('Rejected','crowdsourcing',false,'rejected');
    CREATE TABLE public.trips(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES auth.users,
      title text NOT NULL, duration_days integer NOT NULL,is_ai_generated boolean,ai_prompt text);
    CREATE TABLE public.trip_spots(id uuid DEFAULT gen_random_uuid(),trip_id uuid REFERENCES public.trips NOT NULL,
      spot_id uuid REFERENCES public.spots,custom_title text,custom_address text,day_number integer,
      order_index integer,estimated_cost numeric);
    CREATE TABLE public.trip_collaborators(trip_id uuid REFERENCES public.trips NOT NULL,invited_email text,
      user_id uuid REFERENCES auth.users, role text, UNIQUE(trip_id,invited_email), CHECK (invited_email <> 'blocked@example.com'));
    GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated,service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public,storage TO anon,authenticated,service_role;
  `);
  const fixture=JSON.parse(await readFile(new URL('./fixtures/exported-access.json',import.meta.url),'utf8'));
  for(const table of ['spots','trips','trip_spots','trip_collaborators']) await db.exec(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
  for(const policy of fixture.politicas_acceso) {
    if(policy.schemaname!=='public') continue;
    const roles=policy.roles.map((role:string)=>role==='public'?'PUBLIC':`"${role}"`).join(',');
    await db.exec(`CREATE POLICY "${policy.policyname}" ON public.${policy.tablename} AS ${policy.permissive} FOR ${policy.cmd} TO ${roles} ${policy.qual?`USING (${policy.qual})`:''} ${policy.with_check?`WITH CHECK (${policy.with_check})`:''}`);
  }
  await db.exec(await readFile(new URL('../supabase/migrations/202610290001_security_and_atomic_trips.sql', import.meta.url),'utf8'));
  return db;
}
async function signIn(db: PGlite, id = owner, email = 'owner@example.com') {
  await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub = '${id}'; SET request.jwt.claims = '{"app_metadata":{"role":"user"},"email":"${email}"}';`);
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
    await assert.rejects(db.query("UPDATE public.spots SET verification_status = 'rejected' RETURNING id"));
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

test('outsiders cannot read stops/invitations or invite themselves into someone else trip', async () => {
  const db=await database();
  try {
    await signIn(db);
    const saved=await save(db,['friend@example.com']);
    const tripId=saved.rows[0].create_trip_with_stops.id;
    await signIn(db,other,'outsider@example.com');
    for(const table of ['trips','trip_spots','trip_collaborators']) {
      assert.equal((await db.query(`SELECT * FROM public.${table}`)).rows.length,0);
    }
    await assert.rejects(db.query('INSERT INTO public.trip_collaborators(trip_id,invited_email,role) VALUES($1,$2,\'editor\')',[tripId,'outsider@example.com']));
    await assert.rejects(db.exec('TRUNCATE public.trip_spots'));
  } finally { await db.close(); }
});

test('invited editor can read trip and edit stops without recursive RLS or managing invitations', async () => {
  const db=await database();
  try {
    await signIn(db);
    await save(db,['friend@example.com','another@example.com']);
    await signIn(db,other,'FRIEND@example.com');
    assert.equal((await db.query('SELECT * FROM public.trips')).rows.length,1);
    assert.equal((await db.query('SELECT * FROM public.trip_spots')).rows.length,1);
    assert.equal((await db.query('SELECT * FROM public.trip_collaborators')).rows.length,1);
    assert.equal((await db.query('UPDATE public.trip_spots SET estimated_cost=2000 RETURNING id')).rows.length,1);
    assert.equal((await db.query("UPDATE public.trip_collaborators SET role='owner' RETURNING trip_id")).rows.length,0);
    assert.equal((await db.query('DELETE FROM public.trips RETURNING id')).rows.length,0);
  } finally { await db.close(); }
});

test('viewer can read but cannot modify stops or take ownership of a trip', async () => {
  const db=await database();
  try {
    await signIn(db);
    await save(db,['viewer@example.com']);
    await db.exec("UPDATE public.trip_collaborators SET role='viewer'");
    await signIn(db,other,'viewer@example.com');
    assert.equal((await db.query('SELECT * FROM public.trips')).rows.length,1);
    assert.equal((await db.query('SELECT * FROM public.trip_spots')).rows.length,1);
    assert.equal((await db.query('UPDATE public.trip_spots SET estimated_cost=2000 RETURNING id')).rows.length,0);
    assert.equal((await db.query('UPDATE public.trips SET owner_id=$1 RETURNING id',[other])).rows.length,0);
  } finally { await db.close(); }
});

test('migration can run twice without deleting trips or re-quarantining already reviewed AI spots', async () => {
  const db=await database();
  try {
    await signIn(db);
    await save(db,['friend@example.com']);
    await db.exec("RESET ROLE; UPDATE public.spots SET is_verified=true,verification_status='approved' WHERE title='AI pending'");
    await db.exec(await readFile(new URL('../supabase/migrations/202610290001_security_and_atomic_trips.sql',import.meta.url),'utf8'));
    assert.equal((await db.query('SELECT * FROM public.trips')).rows.length,1);
    assert.equal((await db.query('SELECT * FROM public.trip_spots')).rows.length,1);
    assert.equal((await db.query("SELECT * FROM public.spots WHERE title='AI pending' AND verification_status='approved'")).rows.length,1);
    await db.exec('SET ROLE anon');
    await assert.rejects(db.exec('TRUNCATE public.spots'));
  } finally { await db.close(); }
});

test('manual verification query passes against the migrated database', async () => {
  const db=await database();
  try {
    const query=await readFile(new URL('../supabase/verification/security_and_trips.sql',import.meta.url),'utf8');
    const {rows}=await db.query<{comprobacion:string;correcto:boolean}>(query);
    assert.equal(rows.length,8);
    for(const row of rows) assert.equal(row.correcto,true,row.comprobacion);
  } finally { await db.close(); }
});
