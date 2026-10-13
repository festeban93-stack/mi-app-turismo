import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// FORZAR RUTA DINÁMICA: Evita que Vercel guarde en caché un [ ] vacío generado en build time
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    // Priorizar Service Role Key para saltarse RLS en servidor, fallback a Anon Key
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Variables de entorno de Supabase no configuradas en Vercel', 
        spots: [] 
      }, { status: 200 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false }
    });

    const { data, error } = await supabase
      .from('spots')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al consultar Supabase spots:', error);
      return NextResponse.json({ success: false, error: error.message, spots: [] }, { status: 200 });
    }

    return NextResponse.json({ 
      success: true, 
      count: data?.length || 0,
      spots: data || [] 
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (err: any) {
    console.error('Excepción en /api/spots:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Error interno de servidor', spots: [] }, { status: 200 });
  }
}