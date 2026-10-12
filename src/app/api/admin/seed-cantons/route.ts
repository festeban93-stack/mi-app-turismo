import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const rawApiKey = process.env.GEMINI_API_KEY || '';
    const apiKey = rawApiKey.replace(/['"]/g, '').trim();

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'GEMINI_API_KEY no está configurada o está vacía en Vercel.',
      }, { status: 200 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl) {
      return NextResponse.json({
        success: false,
        error: 'NEXT_PUBLIC_SUPABASE_URL no está configurada.',
      }, { status: 200 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const body = await request.json().catch(() => ({}));
    const canton = body.canton || 'La Fortuna, San Carlos';

    const promptText = `Genera exactamente 5 puntos de interés, miradores, restaurantes tradicionales o cataratas reales en la zona o cantón de: "${canton}", Costa Rica.`;

    // Definicion de Esquema Estructurado (Structured Output)
    const jsonSchema = {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          category: {
            type: "STRING",
            enum: ["gastronomia", "naturaleza", "aventura", "cultura", "hospedaje"]
          },
          latitude: { type: "NUMBER" },
          longitude: { type: "NUMBER" },
          address_text: { type: "STRING" },
          opening_hours: { type: "STRING" },
          entry_fee: { type: "STRING" }
        },
        required: ["title", "description", "category", "latitude", "longitude", "address_text", "opening_hours", "entry_fee"]
      }
    };

    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];

    let rawText = '';
    let usedModel = '';
    let lastErrorDetails = '';

    // Probar modelos candidatos forzando Structured Outputs
    for (const modelName of candidateModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              response_mime_type: 'application/json',
              response_schema: jsonSchema,
              temperature: 0.1
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            rawText = text;
            usedModel = modelName;
            break;
          }
        } else {
          const errJson = await res.json().catch(() => ({}));
          lastErrorDetails = `[${modelName}] Status ${res.status}: ${JSON.stringify(errJson)}`;
        }
      } catch (err: any) {
        lastErrorDetails = err?.message || 'Error de conexión HTTP';
      }
    }

    if (!rawText) {
      return NextResponse.json({
        success: false,
        error: `No se obtuvo respuesta de la IA. Detalle: ${lastErrorDetails}`,
      }, { status: 200 });
    }

    let spotsData: any[] = [];
    try {
      spotsData = JSON.parse(rawText);
    } catch (parseErr: any) {
      return NextResponse.json({
        success: false,
        error: `Error parseando JSON estructurado: ${parseErr.message}`,
        usedModel,
        rawText,
      }, { status: 200 });
    }

    const rowsToInsert = spotsData.map((spot: any) => ({
      title: spot.title,
      description: spot.description,
      category: ['gastronomia', 'naturaleza', 'aventura', 'cultura', 'hospedaje'].includes(spot.category)
        ? spot.category
        : 'naturaleza',
      location: `SRID=4326;POINT(${spot.longitude} ${spot.latitude})`,
      address_text: spot.address_text || canton,
      opening_hours: spot.opening_hours || 'Lunes a Domingo: 8:00 AM - 5:00 PM',
      entry_fee: spot.entry_fee || 'Entrada Libre',
      source_type: 'ai_scraper',
      is_verified: true,
    }));

    const { data, error } = await supabaseAdmin
      .from('spots')
      .insert(rowsToInsert)
      .select();

    if (error) {
      return NextResponse.json({
        success: false,
        error: `Error Supabase Insert: ${error.message}`,
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      canton_processed: canton,
      model_used: usedModel,
      inserted_count: data?.length || 0,
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `Excepción en servidor: ${error?.message || 'Error desconocido'}`,
    }, { status: 200 });
  }
}