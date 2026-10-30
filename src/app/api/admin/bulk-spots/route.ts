import { BodyError, readJSON } from '@/lib/server/body';
import { pendingSpot } from '@/lib/server/spots';
import { requireAccess } from '@/lib/server/access';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const access = await requireAccess(req, true);
  if (access instanceof Response) return access;
  try {
    const { spots } = await readJSON(req, 512 * 1024);

    if (!Array.isArray(spots) || spots.length === 0 || spots.length > 100) {
      return NextResponse.json({ error: 'Se requiere un arreglo de spots válido.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    // Privileged client is created only after server-side administrator authorization.
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Configuración de Supabase incompleta.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Inserción masiva ignorando duplicados por título
    const { data, error } = await supabaseAdmin
      .from('spots')
      .upsert(spots.map((spot) => pendingSpot(spot, spot?.metadata?.import_origin === 'osm' ? 'osm' : 'admin_import')), { onConflict: 'title', ignoreDuplicates: true }).select('id');

    if (error) {
      console.error('Error insertando spots en Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      insertedCount: data?.length || 0,
      message: `Se procesaron ${spots.length} destinos; nuevos: ${data?.length || 0}.`
    });

  } catch (err: any) {
    return NextResponse.json({ error: err instanceof BodyError ? err.message : 'Error interno en el servidor.' }, { status: err instanceof BodyError ? err.status : 500 });
  }
}
