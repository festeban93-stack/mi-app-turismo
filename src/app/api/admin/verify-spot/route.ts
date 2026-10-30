import { BodyError, readJSON } from '@/lib/server/body';
import { requireAccess } from '@/lib/server/access';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const access = await requireAccess(request, true);
  if (access instanceof Response) return access;
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, error: 'Acceso no autorizado' }, { status: 401 });
    }

    const { spot_id, action } = await readJSON(request); // action: 'approve' | 'reject'

    if ((typeof spot_id !== 'string' && typeof spot_id !== 'number') || String(spot_id).length > 128 || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Parámetros inválidos' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const isApproved = action === 'approve';

    const { data, error } = await supabaseAdmin
      .from('spots')
      .update({
        is_verified: isApproved,
        verification_status: isApproved ? 'approved' : 'rejected'
      })
      .eq('id', spot_id)
      .select('id,title,is_verified,verification_status');

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data?.length) return NextResponse.json({ error: 'Destino no encontrado.' }, { status: 404 });
    return NextResponse.json({ 
      success: true, 
      action, 
      spot: data?.[0] 
    }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err instanceof BodyError ? err.message : 'No fue posible revisar el destino.' }, { status: err instanceof BodyError ? err.status : 503 });
  }
}
