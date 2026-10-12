import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Extractor de respaldo para JSON estricto
function extractJSON(text: string) {
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }
  return JSON.parse(cleaned);
}

// Sanitizador de Coordenadas Geográficas PostGIS
function parseCoordinate(value: any, fallback: number): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

export async function POST(request: Request) {
  try {
    const rawApiKey = process.env.GEMINI_API_KEY || '';
    const apiKey = rawApiKey.replace(/['"]/g, '').trim();

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'GEMINI_API_KEY no está configurada en Vercel.',
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

    // 1. Descubrimiento Dinámico de Modelos activos
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const listData = await listRes.json().catch(() => ({}));

    if (listData.error) {
      return NextResponse.json({
        success: false,
        error: `Error de Google AI API Key: ${listData.error.message}`,
      }, { status: 200 });
    }

    let availableModels = listData?.models
      ?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      ?.map((m: any) => m.name.replace('models/', '')) || [];

    if (availableModels.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No se encontraron modelos habilitados para esta API Key.',
      }, { status: 200 });
    }

    availableModels.sort((a: string, b: string) => {
      if (a.includes('flash') && !b.includes('flash')) return -1;
      if (!a.includes('flash') && b.includes('flash')) return 1;
      return 0;
    });

    const promptText = `Genera exactamente 5 puntos de interés, miradores, restaurantes tradicionales o cataratas reales en la zona de: "${canton}", Costa Rica.`;

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

    let rawText = '';
    let usedModel = '';
    let lastErrorDetails = '';

    for (const modelName of availableModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      try {
        let res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              response_mime_type: 'application/json',
              response_schema: jsonSchema,
              temperature: 0.2
            }
          })
        });

        if (!res.ok) {
          res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText + " Devuelve únicamente un arreglo JSON." }] }],
              generationConfig: {
                response_mime_type: 'application/json',
                temperature: 0.2
              }
            })
          });
        }

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
        lastErrorDetails = `[${modelName}] Error conexión: ${err?.message}`;
      }
    }

    if (!rawText) {
      return NextResponse.json({
        success: false,
        error: `Ningún modelo respondió con éxito. Último error: ${lastErrorDetails}`,
      }, { status: 200 });
    }

    let spotsData: any[] = [];
    try {
      spotsData = extractJSON(rawText);
    } catch (parseErr: any) {
      return NextResponse.json({
        success: false,
        error: `Error parseando JSON (${parseErr.message}) en modelo [${usedModel}].`,
        rawText,
      }, { status: 200 });
    }

    // Sanitización y armado de registros
    const rowsToInsert = spotsData.map((spot: any) => {
      const lat = parseCoordinate(spot.latitude, 9.7489);
      const lng = parseCoordinate(spot.longitude, -83.7534);

      return {
        title: spot.title || 'Punto de Interés Local',
        description: spot.description || 'Atractivo turístico por explorar.',
        category: ['gastronomia', 'naturaleza', 'aventura', 'cultura', 'hospedaje'].includes(spot.category)
          ? spot.category
          : 'naturaleza',
        location: `SRID=4326;POINT(${lng} ${lat})`,
        address_text: spot.address_text || canton,
        opening_hours: spot.opening_hours || 'Lunes a Domingo: 8:00 AM - 5:00 PM',
        entry_fee: spot.entry_fee || 'Entrada Libre',
        source_type: 'ai_scraper',
        is_verified: true,
      };
    });

    const { data: insertedData, error: dbError } = await supabaseAdmin
      .from('spots')
      .insert(rowsToInsert)
      .select();

    if (dbError) {
      return NextResponse.json({
        success: false,
        error: `Error Supabase Insert: ${dbError.message}`,
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      canton_processed: canton,
      model_used: usedModel,
      inserted_count: insertedData?.length || 0,
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `Excepción en servidor: ${error?.message || 'Error desconocido'}`,
    }, { status: 200 });
  }
}