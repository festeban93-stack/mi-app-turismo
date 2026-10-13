import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { prompt, destination } = await request.json();

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'El prompt es obligatorio.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, error: 'Configuración de base de datos no disponible.' }, { status: 500 });
    }

    // 1. Obtener spots de la base de datos para contextualizar la IA con gemas reales
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: dbSpots } = await supabase
      .from('spots')
      .select('id, title, category, description, address_text, latitude, longitude')
      .limit(60);

    const availableSpotsContext = (dbSpots || []).map(s => `- [ID: ${s.id}] ${s.title} (${s.category}): ${s.address_text}. ${s.description?.substring(0, 100)}`).join('\n');

    // 2. Prompt del sistema para Gemini
    const systemInstruction = `
Eres el Copiloto Experto en Turismo e Itinerarios de "MapAI Costa Rica".
Tu objetivo es diseñar un itinerario detallado, realista y altamente atractivo basado en la consulta del usuario.

REGLAS DE RESPUESTA:
1. Responde ÚNICAMENTE en formato JSON estricto sin markdown ni cercas de código.
2. Usa esta estructura JSON exacta:
{
  "title": "Título atractivo del itinerario",
  "destination": "Zona principal de Costa Rica",
  "estimated_budget": "Económico | Medio | Alto",
  "summary": "Resumen ejecutivo del viaje de 2 oraciones.",
  "days": [
    {
      "day": 1,
      "title": "Título del Día 1",
      "activities": [
        {
          "time": "8:00 AM",
          "activity": "Nombre de la actividad o gema",
          "description": "Descripción práctica y recomendación local.",
          "spot_id": "ID_SI_COINCIDE_CON_LA_LISTA_O_NULL"
        }
      ]
    }
  ],
  "recommended_spot_ids": ["array_de_ids_de_la_lista_proporcionada"]
}

BASE DE DATOS DE GEMAS REALES DISPONIBLES EN COSTA RICA:
${availableSpotsContext}
`;

    // 3. Consulta a Gemini REST API
    let itineraryJson = null;

    if (geminiApiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemInstruction}\n\nCONSULTA DEL USUARIO: "${prompt}"` }]
                }
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.4,
              }
            })
          }
        );

        const geminiData = await geminiRes.json();
        const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          itineraryJson = JSON.parse(rawText);
        }
      } catch (e) {
        console.warn('Error parseando respuesta de Gemini:', e);
      }
    }

    // Fallback inteligente si la API no está configurada o falló
    if (!itineraryJson) {
      const sampleSpots = (dbSpots || []).slice(0, 4);
      itineraryJson = {
        title: `Ruta Especial: ${prompt}`,
        destination: destination || 'Costa Rica',
        estimated_budget: 'Presupuesto Medio',
        summary: `Itinerario optimizado por MapAI con recomendaciones de gemas locales y paradas escénicas en ${destination || 'Costa Rica'}.`,
        days: [
          {
            day: 1,
            title: 'Día 1: Inmersión y Naturaleza Local',
            activities: [
              {
                time: '8:30 AM',
                activity: sampleSpots[0]?.title || 'Desayuno Típico y Salida',
                description: sampleSpots[0]?.description || 'Disfrutá un gallo pinto tradicional con café chorreado.',
                spot_id: sampleSpots[0]?.id || null
              },
              {
                time: '1:00 PM',
                activity: sampleSpots[1]?.title || 'Exploración de Sendero o Mirador',
                description: sampleSpots[1]?.description || 'Recorrido por senderos naturales y miradores fotográficos.',
                spot_id: sampleSpots[1]?.id || null
              }
            ]
          },
          {
            day: 2,
            title: 'Día 2: Gastronomía y Atardecer',
            activities: [
              {
                time: '11:30 AM',
                activity: sampleSpots[2]?.title || 'Almuerzo Criollo en Soda Tradicional',
                description: sampleSpots[2]?.description || 'Casados tradicionales y refrescos naturales de temporada.',
                spot_id: sampleSpots[2]?.id || null
              },
              {
                time: '4:30 PM',
                activity: sampleSpots[3]?.title || 'Atardecer en Punto Panorámico',
                description: sampleSpots[3]?.description || 'Punto estratégico para disfrutar la caída del sol con vista panorámica.',
                spot_id: sampleSpots[3]?.id || null
              }
            ]
          }
        ],
        recommended_spot_ids: sampleSpots.map(s => s.id)
      };
    }

    // Extraer los objetos completos de los spots recomendados
    const routeSpots = (dbSpots || []).filter(s => 
      itineraryJson.recommended_spot_ids?.includes(s.id)
    );

    return NextResponse.json({
      success: true,
      itinerary: itineraryJson,
      routeSpots: routeSpots
    }, { status: 200 });

  } catch (err: any) {
    console.error('Error en copilot route:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Error en el servidor' }, { status: 500 });
  }
}