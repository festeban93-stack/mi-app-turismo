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

    const promptText = `Actúa como un mapa turístico de Costa Rica. Genera exactamente 5 puntos de interés, miradores, restaurantes tradicionales o cataratas en la zona de: "${canton}".

Devuelve ÚNICAMENTE un arreglo JSON válido sin formato Markdown ni texto extra. Formato requerido:
[
  {
    "title": "Nombre del lugar",
    "description": "Descripción de 2 frases enfocada en la experiencia.",
    "category": "gastronomia",
    "latitude": 10.4678,
    "longitude": -84.6427,
    "address_text": "Referencia local",
    "opening_hours": "Lunes a Domingo 8:00 AM - 5:00 PM",
    "entry_fee": "Entrada Gratuita"
  }
]
Valores permitidos para category: "gastronomia", "naturaleza", "aventura", "cultura", "hospedaje".`;

    // Lista de modelos exactos para probar directamente vía REST
    const candidateModels = [
      'gemini-2.0-flash',
      'gemini-1.5-flash-002',
      'gemini-1.5-flash-001',
      'gemini-1.5-flash',
      'gemini-1.5-pro-002',
      'gemini-1.5-pro'
    ];

    let rawText = '';
    let usedModel = '';
    let lastErrorDetails = '';

    // 1. Probar modelos conocidos vía HTTP REST
    for (const modelName of candidateModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
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

    // 2. Si fallan los nombres estáticos, consultar la lista viva de modelos permitidos para esta API Key
    if (!rawText) {
      try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const listData = await listRes.json().catch(() => ({}));
        
        const availableModels = listData?.models
          ?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          ?.map((m: any) => m.name.replace('models/', '')) || [];

        if (availableModels.length > 0) {
          for (const modelName of availableModels) {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
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
            }
          }
        }

        if (!rawText) {
          return NextResponse.json({
            success: false,
            error: `Modelos disponibles en tu API Key: [${availableModels.join(', ')}]. Detalle del error: ${lastErrorDetails}`,
          }, { status: 200 });
        }
      } catch (discoveryErr: any) {
        console.error('Error en auto-descubrimiento:', discoveryErr);
      }
    }

    if (!rawText) {
      return NextResponse.json({
        success: false,
        error: `No se pudo obtener respuesta de Gemini. Detalle: ${lastErrorDetails}`,
      }, { status: 200 });
    }

    const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) {
      return NextResponse.json({
        success: false,
        error: 'La respuesta de Gemini no contenía un JSON válido.',
        usedModel,
        rawText,
      }, { status: 200 });
    }

    const spotsData = JSON.parse(jsonMatch[0]);

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