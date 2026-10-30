import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/** Only server-verified users and app_metadata (never user_metadata) grant access. */
export async function requireAccess(request: Request, admin = false) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: 'Iniciá sesión para continuar.' }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Servicio no configurado.' }, { status: 503 });
  try {
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: 'Sesión inválida o vencida.' }, { status: 401 });
    if (admin && user.app_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Se requieren permisos de administrador.' }, { status: 403 });
    }
    return { user, db };
  } catch {
    return NextResponse.json({ error: 'No fue posible validar la sesión.' }, { status: 503 });
  }
}

export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Configuración del servidor incompleta.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function requireCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  return null;
}

/** Atomic, shared across serverless instances; unavailable quotas fail closed. */
export async function consumeQuota(userId: string, scope: 'upload' | 'spot' | 'ai') {
  const { data, error } = await serviceClient().rpc('consume_api_quota', {
    p_user_id: userId, p_scope: scope,
  });
  if (error) return NextResponse.json({ error: 'No fue posible comprobar el límite de uso.' }, { status: 503 });
  if (!data) return NextResponse.json({ error: 'Alcanzaste el límite por hora. Intentá más tarde.' }, { status: 429, headers: { 'Retry-After': '3600' } });
  return null;
}

export async function requireAI(request: Request) {
  const access = await requireAccess(request);
  if (access instanceof Response) return access;
  try { return await consumeQuota(access.user.id, 'ai'); }
  catch { return NextResponse.json({ error: 'Servicio temporalmente no disponible.' }, { status: 503 }); }
}
