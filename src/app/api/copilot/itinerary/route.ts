import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function normalizeText(text: string = ''): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ success: false, error: 'El prompt es obligatorio.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, error: 'Configuración de base de datos no disponible.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Extraer palabras clave geograficas del prompt
    const promptNorm = normalizeText(prompt);
    let destinationFilter = '';
    
    if (promptNorm.includes('fortuna') || promptNorm.includes('arenal') || promptNorm.includes('san carlos')) {
      destinationFilter = 'Fortuna';
    } else if (promptNorm.includes('guanacaste') || promptNorm.includes('playa') || promptNorm.includes('tamarindo') || promptNorm.includes('papagayo')) {
      destinationFilter = 'Guanacaste';
    } else if (promptNorm.includes('cartago') || promptNorm.includes('irazu') || promptNorm.includes('orosi')) {
      destinationFilter = 'Cartago';
    } else if (promptNorm.includes('san jose') || promptNorm.includes('chepe')) {
      destinationFilter = 'San José';
    } else if (promptNorm.includes('limon') || promptNorm.includes('puerto viejo') || promptNorm.includes('caribe')) {
      destinationFilter = 'Limón';
    }

    // 2. Consultar spots reales filtrados por zona
    let dbQuery = supabase
      .from('spots')
      .select('id, title, category, description, address_text, latitude, longitude');

    if (destinationFilter) {
      dbQuery = dbQuery.or(`title.ilike.%${destinationFilter}%,address_text.ilike.%${destinationFilter}%,description.ilike.%${destinationFilter}%`);
    }

    const { data: matchedSpots } = await dbQuery.limit(30);

    // Fallback de spots generales si la consulta especifica devuelve pocos registros
    let spotsToUse = matchedSpots || [];
    if (spotsToUse.length < 3) {
      const { data: allSpots } = await supabase
        .from('spots')
        .select('id, title, category, description, address_text, latitude, longitude')
        .limit(20);
      spotsToUse = allSpots || [];
    }

    // Parsear coordenadas para asegurar que el mapa las pueda dibujar
    spotsToUse = spotsToUse.map(s => {
      let lat = parseFloat(s.latitude);
      let lng = parseFloat(s.longitude);
      if ((isNaN(lat) || isNaN(lng)) && s.location) {
        const match = String(s.location).match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
        if (match) {
          lng = parseFloat(match[1]);
          lat = parseFloat(match[2]);
        }
      }
      return { ...s, latitude: lat, longitude: lng };
    }).filter(s => !isNaN(s.latitude) && !isNaN(s.longitude));

    // 3. Preparar contexto para la IA
    const availableSpotsContext = spotsToUse
      .map(s => `- [ID: ${s.id}] ${s.title} (${s.category}): ${s.address_text || 'Costa Rica'}. ${s.description?.substring(0, 120)}`)
      .join('\n');

    let itineraryJson: any = null;

    // 4. Intento con Gemini API
    if (geminiApiKey) {
      const systemInstruction = `
Eres el Copiloto Experto en Turismo e Itinerarios de "MapAI Costa Rica".
Crea un itinerario personalizado en JSON estricto basado en la solicitud del usuario y las gemas reales disponibles.

REGLAS:
1. Responde UNICAMENTE en formato JSON valido sin bloques markdown.
2. Formato esperado:
{
  "title": "Nombre del itinerario",
  "destination": "${destinationFilter || 'Costa Rica'}",
  "estimated_budget": "Económico | Medio | Alto",
  "summary": "Resumen conciso del viaje",
  "days": [
    {
      "day": 1,
      "title": "Título del Día 1",
      "activities": [
        {
          "time": "8:30 AM",
          "activity": "Nombre de la gema o lugar real",
          "description": "Descripción práctica",
          "spot_id": "ID_DE_LA_LISTA_O_NULL"
        }
      ]
    }
  ],
  "recommended_spot_ids": ["array_de_ids_utilizados"]
}

GEMAS DISPONIBLES EN ESTA ZONA:
${availableSpotsContext}
`;

      const endpoints = [
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`
      ];

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\nSOLICITUD: "${prompt}"` }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.3 }
            })
          });

          if (res.ok) {
            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              itineraryJson = JSON.parse(text);
              break;
            }
          }
        } catch (e) {
          console.warn('Error llamando Gemini:', e);
        }
      }
    }

    // 5. GENERADOR DINÁMICO DE FALLBACK (Basado en datos reales de Supabase)
    if (!itineraryJson) {
      const selectedForRoute = spotsToUse.slice(0, 4);
      const destName = destinationFilter || 'Costa Rica';

      itineraryJson = {
        title: `Ruta Especial: ${prompt}`,
        destination: destName,
        estimated_budget: 'Presupuesto Medio',
        summary: `Itinerario de exploración local para ${destName} utilizando gemas reales geolocalizadas.`,
        days: [
          {
            day: 1,
            title: `Día 1: Exploración en ${destName}`,
            activities: [
              {
                time: '8:30 AM',
                activity: selectedForRoute[0]?.title || `Desayuno y salida en ${destName}`,
                description: selectedForRoute[0]?.description || `Punto de inicio en ${destName}.`,
                spot_id: selectedForRoute[0]?.id || null
              },
              {
                time: '1:30 PM',
                activity: selectedForRoute[1]?.title || `Parada escénica en ${destName}`,
                description: selectedForRoute[1]?.description || `Disfrutá del entorno natural y gastronomía local.`,
                spot_id: selectedForRoute[1]?.id || null
              }
            ]
          },
          {
            day: 2,
            title: `Día 2: Atardeceres y Sabores Locales`,
            activities: [
              {
                time: '11:00 AM',
                activity: selectedForRoute[2]?.title || `Aventura y cultura local`,
                description: selectedForRoute[2]?.description || `Experiencia recomendada en la zona.`,
                spot_id: selectedForRoute[2]?.id || null
              },
              {
                time: '4:30 PM',
                activity: selectedForRoute[3]?.title || `Cierre de jornada con vista panorámica`,
                description: selectedForRoute[3]?.description || `Punto estratégico para disfrutar el atardecer.`,
                spot_id: selectedForRoute[3]?.id || null
              }
            ]
          }
        ],
        recommended_spot_ids: selectedForRoute.map(s => s.id)
      };
    }

    // 6. Obtener los objetos completos de los spots para trazar en el mapa
    const routeSpotIds = itineraryJson.recommended_spot_ids || [];
    let routeSpots = spotsToUse.filter(s => routeSpotIds.includes(s.id));

    if (routeSpots.length === 0 && spotsToUse.length > 0) {
      routeSpots = spotsToUse.slice(0, 4);
    }

    return NextResponse.json({
      success: true,
      itinerary: itineraryJson,
      routeSpots: routeSpots
    }, { status: 200 });

  } catch (err: any) {
    console.error('Excepción en /api/copilot/itinerary:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Error de servidor' }, { status: 500 });
  }
}