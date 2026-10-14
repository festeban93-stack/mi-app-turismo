import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { spots } = await req.json();

    if (!Array.isArray(spots) || spots.length === 0) {
      return NextResponse.json({ error: 'Se requiere un arreglo de spots válido.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    // Usar SERVICE_ROLE_KEY si existe (ignora RLS), o fallback a ANON_KEY
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Configuración de Supabase incompleta.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // Inserción masiva ignorando duplicados por título
    const { data, error } = await supabaseAdmin
      .from('spots')
      .upsert(spots, { onConflict: 'title', ignoreDuplicates: true });

    if (error) {
      console.error('Error insertando spots en Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      insertedCount: spots.length,
      message: `Se procesaron e insertaron ${spots.length} gemas.`
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno en el servidor.' }, { status: 500 });
  }
}