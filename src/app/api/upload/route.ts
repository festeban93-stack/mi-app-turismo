import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, error: 'Configuración de Supabase no encontrada.' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No se recibió ninguna imagen.' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Formatear nombre único para la imagen
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `spot_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Subir archivo al bucket 'spot-images'
    const { data, error } = await supabaseAdmin
      .storage
      .from('spot-images')
      .upload(filePath, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('Error al subir a Supabase Storage:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Obtener la URL pública de la imagen guardada
    const { data: publicUrlData } = supabaseAdmin
      .storage
      .from('spot-images')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      imageUrl: publicUrlData.publicUrl
    }, { status: 200 });

  } catch (err: any) {
    console.error('Excepción en /api/upload:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Error al procesar la imagen' }, { status: 500 });
  }
}