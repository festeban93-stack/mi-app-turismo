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

// Diccionario Geográfico Costarricense para expansión inteligente de regiones
const REGION_KEYWORDS: Record<string, string[]> = {
  guanacaste: ['guanacaste', 'tamarindo', 'liberia', 'flamingo', 'conchal', 'nosara', 'samara', 'santa cruz', 'papagayo', 'herradura', 'avellanas', 'playa'],
  fortuna: ['fortuna', 'arenal', 'san carlos', 'volcan', 'aguas termales', 'terp', 'la fortuna', 'venado'],
  cartago: ['cartago', 'orosi', 'turrialba', 'irazu', 'prusia', 'paraiso', 'guayabo'],
  sanjose: ['san jose', 'escalante', 'sabana', 'amon', 'central', 'pavas', 'santa ana', 'escazu'],
  limon: ['limon', 'puerto viejo', 'cahuita', 'manzanillo', 'cocles', 'punta uva', 'talamanca', 'caribe'],
  puntarenas: ['puntarenas', 'jaco', 'manuel antonio', 'quepos', 'uvita', 'montezuma', 'santa teresa', 'drake', 'dominical']
};

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
      return NextResponse.json({ success: false, error: 'Configuración de Supabase no disponible.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Cargar todas las gemas de la base de datos
    const { data: allSpotsRaw } = await supabase
      .from('spots')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Limpiar y parsear coordenadas
    const cleanSpots = (allSpotsRaw || []).map((spot: any) => {
      let lat = parseFloat(spot.latitude);
      let lng = parseFloat(spot.longitude);

      if ((isNaN(lat) || isNaN(lng)) && spot.location) {
        const match = String(spot.location).match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
        if (match) {
          lng = parseFloat(match[1]);
          lat = parseFloat(match[2]);
        }
      }

      return {
        ...spot,
        latitude: lat,
        longitude: lng,
      };
    }).filter((s: any) => !isNaN(s.latitude) && !isNaN(s.longitude));

    // 3. Analizar intenciones y región del prompt
    const promptNorm = normalizeText(prompt);
    let matchedRegionKeywords: string[] = [];
    let detectedRegionName = 'Costa Rica';

    for (const [regionKey, keywords] of Object.entries(REGION_KEYWORDS)) {
      if (keywords.some(kw => promptNorm.includes(kw))) {
        matchedRegionKeywords = keywords;
        if (regionKey === 'guanacaste') detectedRegionName = 'Guanacaste';
        else if (regionKey === 'fortuna') detectedRegionName = 'La Fortuna & Arenal';
        else if (regionKey === 'cartago') detectedRegionName = 'Cartago';
        else if (regionKey === 'limon') detectedRegionName = 'Caribe Sur & Limón';
        else if (regionKey === 'sanjose') detectedRegionName = 'San José';
        else if (regionKey === 'puntarenas') detectedRegionName = 'Pacífico Central & Sur';
        break;
      }
    }

    // 4. Puntuación de relevancia por gema
    const scoredSpots = cleanSpots.map(spot => {
      let score = 0;
      const titleNorm = normalizeText(spot.title);
      const descNorm = normalizeText(spot.description);
      const addrNorm = normalizeText(spot.address_text);

      if (matchedRegionKeywords.length > 0) {
        for (const kw of matchedRegionKeywords) {
          if (titleNorm.includes(kw)) score += 10;
          if (addrNorm.includes(kw)) score += 8;
          if (descNorm.includes(kw)) score += 5;
        }
      }

      if (promptNorm.includes('atardecer') && (descNorm.includes('atardecer') || titleNorm.includes('mirador') || titleNorm.includes('playa'))) score += 5;
      if (promptNorm.includes('playa') && (titleNorm.includes('playa') || descNorm.includes('playa'))) score += 5;
      if (promptNorm.includes('cafe') && (titleNorm.includes('cafe') || titleNorm.includes('brunch'))) score += 5;
      if (promptNorm.includes('soda') && (titleNorm.includes('soda') || descNorm.includes('casado'))) score += 5;

      return { spot, score };
    });

    scoredSpots.sort((a, b) => b.score - a.score);

    let selectedSpots = scoredSpots.filter(item => item.score > 0).map(item => item.spot);
    if (selectedSpots.length < 3) {
      selectedSpots = cleanSpots.slice(0, 5);
    } else {
      selectedSpots = selectedSpots.slice(0, 6);
    }

    // 5. Consulta a Gemini API (Si existe la API Key)
    let itineraryJson: any = null;

    if (geminiApiKey) {
      const spotsContextText = selectedSpots
        .map(s => `[ID: ${s.id}] Título: "${s.title}" \vert{} Categoría: ${s.category} | Ubicación: ${s.address_text \vert{}\vert{} 'Costa Rica'} \vert{} Descripción: ${s.description}`)
        .join('\n');

      const systemPrompt = `
Eres el Copiloto Experto de Turismo e Itinerarios de "MapAI Costa Rica".
Crea un itinerario diario detallado en JSON estricto usando ÚNICAMENTE las gemas reales de la lista.

REGLAS STRICTAS:
1. Responde SOLAMENTE un objeto JSON válido, sin delimitadores \`\`\`json ni texto libre.
2. Cada actividad DEBE referenciar un spot real de la lista con su "spot_id" e indicar su título real en "activity".
3. Formato JSON:
{
  "title": "Nombre del itinerario",
  "destination": "${detectedRegionName}",
  "estimated_budget": "Económico | Presupuesto Medio | Premium",
  "summary": "Resumen atractivo de 2 frases sobre la experiencia.",
  "days": [
    {
      "day": 1,
      "title": "Título del Día 1",
      "activities": [
        {
          "time": "8:00 AM",
          "activity": "Nombre real del lugar",
          "description": "Recomendación práctica basada en la descripción real.",
          "spot_id": "ID_EXACTO_DE_LA_LISTA"
        }
      ]
    }
  ],
  "recommended_spot_ids": ["ID_1", "ID_2", "ID_3"]
}

LISTA DE GEMAS REALES DISPONIBLES:
${spotsContextText}
`;

      const geminiEndpoints = [
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`
      ];

      for (const endpoint of geminiEndpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nCONSULTA: "${prompt}"` }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
            })
          });

          if (res.ok) {
            const data = await res.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
              itineraryJson = JSON.parse(cleanedText);
              break;
            }
          }
        } catch (e) {
          console.warn('Gemini error, pasando a motor interno:', e);
        }
      }
    }

    // 6. MOTOR LOCAL INTELIGENTE (100% Datos Reales sin Texto Genérico)
    if (!itineraryJson) {
      const day1Spots = selectedSpots.slice(0, 2);
      const day2Spots = selectedSpots.slice(2, 4);

      itineraryJson = {
        title: `Ruta de Exploración: ${prompt}`,
        destination: detectedRegionName,
        estimated_budget: 'Presupuesto Medio',
        summary: `Itinerario optimizado con gemas auténticas y miradores destacados en ${detectedRegionName}.`,
        days: [
          {
            day: 1,
            title: `Día 1: Inmersión y Naturaleza en ${detectedRegionName}`,
            activities: day1Spots.map((spot, idx) => ({
              time: idx === 0 ? '8:30 AM' : '2:00 PM',
              activity: spot.title,
              description: spot.description || `Visita recomendada en ${spot.address_text || detectedRegionName}.`,
              spot_id: spot.id
            }))
          },
          {
            day: 2,
            title: `Día 2: Sabores Locales y Puntos Escénicos`,
            activities: (day2Spots.length > 0 ? day2Spots : day1Spots).map((spot, idx) => ({
              time: idx === 0 ? '11:00 AM' : '4:30 PM',
              activity: spot.title,
              description: spot.description || `Disfrutá de la oferta local en ${spot.address_text || detectedRegionName}.`,
              spot_id: spot.id
            }))
          }
        ],
        recommended_spot_ids: selectedSpots.map(s => s.id)
      };
    }

    // 7. Extraer las gemas exactas para el mapa
    const routeIds = itineraryJson.recommended_spot_ids || [];
    let finalRouteSpots = selectedSpots.filter(s => routeIds.includes(s.id));
    if (finalRouteSpots.length === 0) {
      finalRouteSpots = selectedSpots.slice(0, 4);
    }

    return NextResponse.json({
      success: true,
      itinerary: itineraryJson,
      routeSpots: finalRouteSpots
    }, { status: 200 });

  } catch (err: any) {
    console.error('Error crítico en copilot route:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Error interno de servidor' }, { status: 500 });
  }
}