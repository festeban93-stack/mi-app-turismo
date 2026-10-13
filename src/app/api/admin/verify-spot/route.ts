import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, error: 'Acceso no autorizado' }, { status: 401 });
    }

    const { spot_id, action } = await request.json(); // action: 'approve' | 'reject'

    if (!spot_id || !['approve', 'reject'].includes(action)) {
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
      .select();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      action, 
      spot: data?.[0] 
    }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}