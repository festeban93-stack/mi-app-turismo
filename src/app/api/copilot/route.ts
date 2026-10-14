import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function cleanText(str: string = ''): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Cálculo de distancia en kilómetros entre dos coordenadas
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Algoritmo del Vecino Más Cercano (Nearest Neighbor) para optimizar la secuencia de viaje
function optimizeRouteSequence(spots: any[]): any[] {
  if (spots.length <= 1) return spots;

  const unvisited = [...spots];
  const optimizedRoute = [unvisited.shift()!];

  while (unvisited.length > 0) {
    const currentSpot = optimizedRoute[optimizedRoute.length - 1];
    let closestIndex = 0;
    let minDistance = Infinity;

    unvisited.forEach((spot, index) => {
      const dist = calculateHaversineDistance(
        parseFloat(currentSpot.latitude),
        parseFloat(currentSpot.longitude),
        parseFloat(spot.latitude),
        parseFloat(spot.longitude)
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = index;
      }
    });

    optimizedRoute.push(unvisited.splice(closestIndex, 1)[0]);
  }

  return optimizedRoute;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, history = [] } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'El prompt es requerido.' }, { status: 400 });
    }

    const { data: allSpots, error: spotsError } = await supabase
      .from('spots')
      .select('id, title, description, category, latitude, longitude, address_text, entry_fee, opening_hours, typical_dishes, local_tips');

    if (spotsError) console.error('Error consultando Supabase:', spotsError);

    const spotsList = (allSpots || []).filter(s => s.latitude && s.longitude);
    const cleanPrompt = cleanText(prompt);

    const keywords = cleanPrompt
      .split(/\s+/)
      .filter(w => w.length > 2 && !['quiero', 'ruta', 'cerca', 'donde', 'para', 'como', 'hacer', 'unas', 'unos', 'esta', 'este'].includes(w));

    const scoredSpots = spotsList.map(spot => {
      const titleNorm = cleanText(spot.title);
      const addressNorm = cleanText(spot.address_text);
      const descNorm = cleanText(spot.description);
      const catNorm = cleanText(spot.category);

      let score = 0;
      keywords.forEach(kw => {
        if (titleNorm.includes(kw)) score += 10;
        if (addressNorm.includes(kw)) score += 8;
        if (catNorm.includes(kw)) score += 5;
        if (descNorm.includes(kw)) score += 3;
      });

      return { spot, score };
    });

    scoredSpots.sort((a, b) => b.score - a.score);

    let rawMatchedSpots = scoredSpots.filter(s => s.score > 0).map(s => s.spot);

    if (rawMatchedSpots.length === 0) {
      if (cleanPrompt.includes('cafe') || cleanPrompt.includes('comida') || cleanPrompt.includes('restaurante')) {
        rawMatchedSpots = spotsList.filter(s => s.category === 'gastronomia').slice(0, 4);
      } else if (cleanPrompt.includes('catarata') || cleanPrompt.includes('mirador') || cleanPrompt.includes('playa')) {
        rawMatchedSpots = spotsList.filter(s => s.category === 'naturaleza').slice(0, 4);
      } else {
        rawMatchedSpots = spotsList.slice(0, 4);
      }
    } else {
      rawMatchedSpots = rawMatchedSpots.slice(0, 5);
    }

    // APLICAR OPTIMIZACIÓN GEOGRÁFICA DE LA RUTA
    const matchedSpots = optimizeRouteSequence(rawMatchedSpots);

    if (process.env.OPENAI_API_KEY) {
      const spotsContext = matchedSpots.map((s, idx) => 
        `- Parada ${idx + 1}: "${s.title}" (${s.address_text}) | Platos: ${Array.isArray(s.typical_dishes) ? s.typical_dishes.join(', ') : 'N/A'}`
      ).join('\n');

      const systemInstruction = `
Eres el Copiloto Turístico de MapAI Costa Rica.
Has trazado una ruta en orden geográfico óptimo con las siguientes paradas consecutivas:
${spotsContext}

Responde con tono tico cálido y directo. Explica brevemente la ruta siguiendo el orden de las paradas numeradas (1 a ${matchedSpots.length}).
Devuelve ÚNICAMENTE este formato JSON estricto:
{
  "reply": "Tu respuesta explicativa..."
}`;

      try {
        const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' }
          })
        });

        const aiData = await aiRes.json();
        const rawContent = aiData.choices?.[0]?.message?.content;

        if (rawContent) {
          const parsed = JSON.parse(rawContent);
          return NextResponse.json({
            reply: parsed.reply,
            suggestedSpots: matchedSpots
          });
        }
      } catch (e) {
        console.error('Fallback por error en OpenAI API:', e);
      }
    }

    const spotListFormatted = matchedSpots.map((s, i) => `${i + 1}. ${s.title} (${s.address_text})`).join('\n');
    const replyText = `¡Listo! Trazé esta ruta optimizada en secuencia geográfica:\n\n${spotListFormatted}\n\nRevisá los puntos numerados del 1 al ${matchedSpots.length} en el mapa.`;

    return NextResponse.json({
      reply: replyText,
      suggestedSpots: matchedSpots
    });

  } catch (error: any) {
    console.error('Error en /api/copilot:', error);
    return NextResponse.json(
      { error: 'Error en el servidor.', details: error?.message },
      { status: 500 }
    );
  }
}