import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { pendingSpot } from '../src/lib/server/spots';
import { coordinatesForSpot } from '../src/lib/server/coordinates';
import { readJSON, BodyError } from '../src/lib/server/body';
import { requireAccess, requireCron } from '../src/lib/server/access';
import { POST as verifySpot } from '../src/app/api/admin/verify-spot/route';
import { POST as upload } from '../src/app/api/upload/route';
import { GET as getSpots } from '../src/app/api/spots/route';
import sharp from 'sharp';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-test-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-test-key';
const userId = '11111111-1111-4111-8111-111111111111';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; delete process.env.CRON_SECRET; });
function mockSupabase(role = 'user', userRole = 'user', extra?: (url: URL, init?: RequestInit) => Response | Promise<Response>) {
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push(url.toString());
    if (url.pathname === '/auth/v1/user') return Response.json({ id: userId, aud: 'authenticated',
      app_metadata: { role }, user_metadata: { role: userRole }, created_at: '2026-01-01T00:00:00Z' });
    if (url.pathname === '/rest/v1/rpc/consume_api_quota') return Response.json(true);
    if (extra) return extra(url,init);
    throw new Error(`Unexpected network request: ${url.pathname}`);
  };
  return calls;
}
const request = (body: unknown) => new Request('https://app.test/api/test', {
  method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('anonymous approval is rejected before any network request', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error('Unexpected network'); };
  const result = await verifySpot(new Request('https://app.test/api/admin/verify-spot',{method:'POST'}));
  assert.equal(result.status,401);
  assert.equal(called,false);
});

test('a self-assigned user_metadata admin role never grants administration', async () => {
  const calls = mockSupabase('user','admin');
  const result = await requireAccess(request({}),true);
  assert.ok(result instanceof Response);
  assert.equal(result.status,403);
  assert.equal(calls.length,1);
});

test('server-verified app_metadata admin role grants administration', async () => {
  mockSupabase('admin');
  const result = await requireAccess(request({}),true);
  assert.ok(!(result instanceof Response));
  assert.equal(result.user.id,userId);
});

test('cron is closed when secret is absent and rejects secrets in query strings', () => {
  assert.equal(requireCron(new Request('https://app.test/cron'))?.status,401);
  process.env.CRON_SECRET = 'test-secret';
  assert.equal(requireCron(new Request('https://app.test/cron?secret=test-secret'))?.status,401);
  assert.equal(requireCron(new Request('https://app.test/cron',{headers:{Authorization:'Bearer test-secret'}})),null);
});

test('untrusted import cannot override moderation and missing information remains unknown', () => {
  const result = pendingSpot({title:'Cahuita',latitude:9.7,longitude:-82.8,is_verified:true,verification_status:'approved',owner_id:'forged'});
  assert.equal(result.is_verified,false);
  assert.equal(result.verification_status,'pending');
  assert.equal(result.entry_fee,'Sin confirmar');
  assert.equal(result.opening_hours,'Sin confirmar');
  assert.ok(!('owner_id' in result));
  for (const latitude of [null,'',true,Infinity,91,'9.7junk']) assert.throws(()=>pendingSpot({title:'X',latitude,longitude:0}),BodyError);
  assert.doesNotThrow(()=>pendingSpot({title:'X',latitude:0,longitude:0}));
});

test('invalid or missing geometry never receives invented coordinates', () => {
  assert.equal(coordinatesForSpot({}),null);
  assert.equal(coordinatesForSpot({latitude:Infinity,longitude:0}),null);
  assert.equal(coordinatesForSpot({location:'garbage'}),null);
  assert.deepEqual(coordinatesForSpot({location:'SRID=4326;POINT(-82.8 9.7)'}),{lat:9.7,lng:-82.8});
});

test('body limit applies to chunked bodies without Content-Length', async () => {
  await assert.rejects(readJSON(new Request('https://app.test',{method:'POST',body:JSON.stringify({data:'x'.repeat(1000)})}),100),
    (error: unknown) => error instanceof BodyError && error.status === 413);
});

test('list query filters approvals and drops invalid geometry and private fields', async () => {
  let query: URL | undefined;
  mockSupabase('user','user',(url) => {
    query=url;
    return Response.json([{id:'approved',title:'Cahuita',location:'POINT(-82.8 9.7)'},{id:'broken',location:'invalid'}]);
  });
  const result = await getSpots();
  assert.equal(result.status,200);
  assert.equal(query?.searchParams.get('is_verified'),'eq.true');
  assert.equal(query?.searchParams.get('verification_status'),'eq.approved');
  assert.ok(!query?.searchParams.get('select')?.includes('*'));
  assert.equal((await result.json()).spots.length,1);
});

test('forged JPEG MIME cannot upload arbitrary bytes', async () => {
  const calls = mockSupabase();
  const form = new FormData();
  form.set('file',new File(['not-an-image'],'test.jpg',{type:'image/jpeg'}));
  const result = await upload(new Request('https://app.test/upload',{method:'POST',headers:{Authorization:'Bearer test-token'},body:form}));
  assert.equal(result.status,415);
  assert.ok(calls.every(url=>!url.includes('/storage/')));
});

test('real image is re-encoded into a user-owned WebP path', async () => {
  let objectPath = '';
  let imageBuffer: ArrayBuffer | undefined;
  mockSupabase('user','user',async (url,init) => {
    objectPath=url.pathname;
    imageBuffer=await new Response(init?.body).arrayBuffer();
    return Response.json({Key:'spot-images/test'});
  });
  const bytes=await sharp({create:{width:2,height:2,channels:3,background:'#00aa44'}}).png().toBuffer();
  const form=new FormData();
  form.set('file',new File([new Uint8Array(bytes)],'../../forged.jpg',{type:'image/png'}));
  const result=await upload(new Request('https://app.test/upload',{method:'POST',headers:{Authorization:'Bearer test-token'},body:form}));
  assert.equal(result.status,201);
  assert.match(objectPath,new RegExp(`/uploads/${userId}/[a-f0-9-]+\\.webp$`));
  assert.ok(imageBuffer);
  // SDK wraps the image in multipart; verify the returned URL uses the canonical extension.
  assert.match((await result.json()).imageUrl,/\.webp$/);
});

test('oversized uploads are rejected before parsing or storing the body', async () => {
  const calls=mockSupabase();
  const result=await upload(new Request('https://app.test/upload',{method:'POST',headers:{Authorization:'Bearer test-token','Content-Length':String(6*1024*1024)},body:'x'}));
  assert.equal(result.status,413);
  assert.ok(calls.every(url=>!url.includes('/storage/')));
});

test('quota exhaustion blocks storage and returns Retry-After', async () => {
  let storageCalled=false;
  globalThis.fetch=async (input) => {
    const path=new URL(String(input)).pathname;
    if(path==='/auth/v1/user') return Response.json({id:userId,app_metadata:{role:'user'}});
    if(path==='/rest/v1/rpc/consume_api_quota') return Response.json(false);
    storageCalled=true;throw new Error('Unexpected storage call');
  };
  const result=await upload(new Request('https://app.test/upload',{method:'POST',headers:{Authorization:'Bearer test-token'},body:'x'}));
  assert.equal(result.status,429);
  assert.equal(result.headers.get('Retry-After'),'3600');
  assert.equal(storageCalled,false);
});

test('all administrative routes reject anonymous access', async () => {
  const adminRoutes = await Promise.all([
    import('../src/app/api/admin/bulk-spots/route'),
    import('../src/app/api/admin/seed-cantons/route'),
    import('../src/app/api/admin/fetch-osm/route'),
    import('../src/app/api/admin/ingest-national/route'),
  ]);
  globalThis.fetch=async () => { throw new Error('No network is allowed for anonymous requests'); };
  for (const route of adminRoutes) {
    const response=await route.POST(new Request('https://app.test/admin',{method:'POST'}) as never);
    assert.equal(response.status,401);
  }
});

test('failed OpenStreetMap retrieval never manufactures or saves destinations', async () => {
  const {GET: scrape}=await import('../src/app/api/cron/scrape/route');
  process.env.CRON_SECRET='test-secret';
  const calls: string[]=[];
  globalThis.fetch=async (input) => { calls.push(String(input));return new Response('Unavailable',{status:503}); };
  const response=await scrape(new Request('https://app.test/cron',{headers:{Authorization:'Bearer test-secret'}}));
  assert.equal(response.status,502);
  assert.ok(calls.every(url=>!url.includes('supabase.test')));
});
