import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({
        success: false,
        error: 'Variables de Supabase no configuradas.',
      }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const body = await request.json().catch(() => ({}));
    const {
      title,
      description,
      category,
      latitude,
      longitude,
      address_text,
      opening_hours,
      entry_fee,
      explorer_nickname
    } = body;

    if (!title || !latitude || !longitude) {
      return NextResponse.json({
        success: false,
        error: 'El título y las coordenadas GPS son obligatorios.',
      }, { status: 400 });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({
        success: false,
        error: 'Coordenadas GPS inválidas.',
      }, { status: 400 });
    }

    const newSpot = {
      title: title.trim(),
      description: description ? description.trim() : 'Gema oculta compartida por la comunidad de exploradores.',
      category: ['gastronomia', 'naturaleza', 'aventura', 'cultura', 'hospedaje'].includes(category)
        ? category
        : 'naturaleza',
      location: `SRID=4326;POINT(${lng} ${lat})`,
      address_text: address_text ? address_text.trim() : 'Costa Rica',
      opening_hours: opening_hours ? opening_hours.trim() : 'Consultar en el lugar',
      entry_fee: entry_fee ? entry_fee.trim() : 'Entrada Libre',
      source_type: 'crowdsource',
      is_verified: true,
    };

    const { data, error } = await supabaseAdmin
      .from('spots')
      .insert([newSpot])
      .select()
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        error: `Error al guardar en base de datos: ${error.message}`,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      spot: {
        ...data,
        latitude: lat,
        longitude: lng,
      },
      points_awarded: 50,
      badge_unlocked: 'Pionero Local 🏅',
      explorer_nickname: explorer_nickname || 'Explorador Anónimo',
    }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: `Excepción en servidor: ${err?.message || 'Error desconocido'}`,
    }, { status: 500 });
  }
}