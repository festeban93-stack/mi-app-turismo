import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const maxDuration = 30;

function cleanText(str: string = ''): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Cálculo de distancia Haversine (km)
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Ordenamiento de la ruta por cercanía geográfica
function optimizeRouteSequence(spots: any[]): any[] {
  if (spots.length <= 1) return spots;
  const unvisited = [...spots];
  const optimized = [unvisited.shift()!];

  while (unvisited.length > 0) {
    const current = optimized[optimized.length - 1];
    let closestIdx = 0;
    let minDistance = Infinity;

    unvisited.forEach((spot, idx) => {
      const dist = calculateHaversineDistance(
        parseFloat(current.latitude),
        parseFloat(current.longitude),
        parseFloat(spot.latitude),
        parseFloat(spot.longitude)
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });

    optimized.push(unvisited.splice(closestIdx, 1)[0]);
  }

  return optimized;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, history = [] } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'El prompt es requerido.' }, { status: 400 });
    }

    // 1. Obtener gemas de Supabase
    const { data: allSpots, error: spotsError } = await supabase
      .from('spots')
      .select('id, title, description, category, latitude, longitude, address_text, entry_fee, opening_hours, typical_dishes, local_tips');

    if (spotsError) {
      console.error('Error consultando Supabase:', spotsError);
    }

    const spotsList = (allSpots || []).filter(s => s.latitude && s.longitude);
    const cleanPrompt = cleanText(prompt);

    // 2. Filtrado y ponderación de candidatos
    const tokens = cleanPrompt.split(/\s+/).filter(t => t.length > 2 && !['quiero', 'dame', 'plan', 'dias', 'para', 'como', 'hacer'].includes(t));
    
    let candidateSpots = spotsList.filter(spot => {
      const spotText = cleanText(`${spot.title} ${spot.address_text} ${spot.description} ${spot.category}`);
      return tokens.some(token => spotText.includes(token));
    });

    if (candidateSpots.length < 3) {
      candidateSpots = spotsList.slice(0, 30);
    } else {
      candidateSpots = candidateSpots.slice(0, 30);
    }

    // 3. Verificación de la API Key de Google Gemini
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY no detectada.');
      return NextResponse.json({
        reply: `¡Pura vida! Tengo ${candidateSpots.length} gemas listas para mostrarte, pero falta configurar la variable **GEMINI_API_KEY** en \`.env.local\` o Vercel.`,
        suggestedSpots: candidateSpots.slice(0, 4)
      });
    }

    // 4. Invocación a Google Gemini 2.5 Flash con modo JSON estructurado
    const spotsContext = candidateSpots.map(s => 
      `[ID: ${s.id}] "${s.title}" | Ubicación: ${s.address_text} | Categoría: ${s.category} | Descripción: ${s.description}`
    ).join('\n');

    const systemInstructionText = `
Eres "MapAI Copilot", un Agente de Viajes experto de Costa Rica, apasionado, servicial, cercano y natural (usa modismos ticos con equilibrio: "Pura vida", "Con mucho gusto", "Te recomiendo").

TU TAREA:
Responder la consulta del usuario armando una recomendación o itinerario detallado, atractivo y con formato Markdown (encabezados, viñetas, emojis).

REGLAS STRICTAS:
1. Si te piden un plan de varios días o varias paradas, organízalo por bloques (ej: "### 🗓️ Día 1: ..." o "### 📍 Paradas Recomendadas").
2. Recomienda únicamente gemas del inventario disponible abajo.
3. Para cada gema que menciones o recomiendes, DEBES incluir su "ID" exacto dentro del arreglo JSON "selectedSpotIds".
4. Devuelve ÚNICAMENTE un objeto JSON con las claves "reply" y "selectedSpotIds".

INVENTARIO DE GEMAS DISPONIBLES:
${spotsContext}
`;

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        ...history.slice(-4).map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        })),
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemInstructionText }]
      },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7
      }
    };

    const response = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Error de Gemini API (${response.status}):`, errText);
      throw new Error(`Gemini API respondió con código ${response.status}`);
    }

    const aiData = await response.json();
    const rawContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawContent) {
      throw new Error('Respuesta vacía recibida de Gemini');
    }

    const parsedData = JSON.parse(rawContent);
    const selectedIds: string[] = parsedData.selectedSpotIds || [];

    // Mapear los IDs devueltos por Gemini
    let rawSuggestedSpots = candidateSpots.filter(s => selectedIds.includes(s.id));
    
    if (rawSuggestedSpots.length === 0) {
      rawSuggestedSpots = candidateSpots.slice(0, 4);
    }

    // Reordenar las gemas por optimización geográfica
    const suggestedSpots = optimizeRouteSequence(rawSuggestedSpots);

    return NextResponse.json({
      reply: parsedData.reply || '¡Pura vida! Aquí tienes las mejores recomendaciones.',
      suggestedSpots
    });

  } catch (error: any) {
    console.error('Error en /api/copilot:', error);
    return NextResponse.json({
      reply: `Inconveniente con el motor Gemini: **${error.message || 'Error de conexión'}**. Por favor verifica la API Key.`,
      suggestedSpots: []
    }, { status: 200 });
  }
}