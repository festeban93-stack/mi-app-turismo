import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { spots } = await req.json();

    if (!Array.isArray(spots) || spots.length === 0) {
      return NextResponse.json({ error: 'Se requiere un arreglo de spots válido.' }, { status: 400 });
    }

    // Inserción en Supabase ignorando duplicados por título
    const { data, error } = await supabase
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