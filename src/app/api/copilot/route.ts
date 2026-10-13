import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function cleanText(str: string = ''): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, history = [] } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'El prompt es requerido.' }, { status: 400 });
    }

    // 1. Cargar todas las gemas desde Supabase
    const { data: allSpots, error: spotsError } = await supabase
      .from('spots')
      .select('id, title, description, category, latitude, longitude, address_text, entry_fee, opening_hours');

    if (spotsError) console.error('Error consultando Supabase:', spotsError);

    const spotsList = (allSpots || []).filter(s => s.latitude && s.longitude);
    const cleanPrompt = cleanText(prompt);

    // 2. Extracción de palabras clave descartando conectores
    const keywords = cleanPrompt
      .split(/\s+/)
      .filter(w => w.length > 2 && !['quiero', 'ruta', 'cerca', 'donde', 'para', 'como', 'hacer', 'unas', 'unos', 'esta', 'este'].includes(w));

    // 3. Sistema de Puntaje de Relevancia (Scoring)
    const scoredSpots = spotsList.map(spot => {
      const titleNorm = cleanText(spot.title);
      const addressNorm = cleanText(spot.address_text);
      const descNorm = cleanText(spot.description);
      const catNorm = cleanText(spot.category);

      let score = 0;

      keywords.forEach(kw => {
        if (titleNorm.includes(kw)) score += 10;
        if (addressNorm.includes(kw)) score += 8;
        if (descNorm.includes(kw)) score += 4;
        if (catNorm.includes(kw)) score += 5;
      });

      return { spot, score };
    });

    // Ordenar por relevancia
    scoredSpots.sort((a, b) => b.score - a.score);

    // Seleccionar entre 3 y 5 gemas relevantes
    let matchedSpots = scoredSpots.filter(s => s.score > 0).map(s => s.spot);

    // Si no hay coincidencia exacta con palabras clave, seleccionar por categoría o muestra aleatoria para no dejar vacíos
    if (matchedSpots.length === 0) {
      if (cleanPrompt.includes('cafe') || cleanPrompt.includes('comida') || cleanPrompt.includes('restaurante')) {
        matchedSpots = spotsList.filter(s => s.category === 'gastronomia').slice(0, 4);
      } else if (cleanPrompt.includes('catarata') || cleanPrompt.includes('mirador') || cleanPrompt.includes('playa')) {
        matchedSpots = spotsList.filter(s => s.category === 'naturaleza').slice(0, 4);
      } else {
        matchedSpots = spotsList.slice(0, 4);
      }
    } else {
      matchedSpots = matchedSpots.slice(0, 5);
    }

    // 4. Si hay API Key de OpenAI, generar respuesta natural conversacional
    if (process.env.OPENAI_API_KEY) {
      const spotsContext = matchedSpots.map(s => `- ID: ${s.id} | Nombre: "${s.title}" | Dirección: ${s.address_text}`).join('\n');

      const systemInstruction = `
Eres el Copiloto Turístico de MapAI Costa Rica.
Has seleccionado las siguientes gemas de la base de datos para la consulta del usuario:
${spotsContext}

Responde de forma amable, clara y directa (estilo costarricense). Explica brevemente la ruta recomendada.
Devuelve ÚNICAMENTE este formato JSON estricto:
{
  "reply": "Tu mensaje explicativo..."
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

    // 5. Respuesta directa estructurada
    const spotListFormatted = matchedSpots.map((s, i) => `${i + 1}. ${s.title} (${s.address_text})`).join('\n');
    const replyText = `¡Te preparé esta ruta optimizada con gemas en Costa Rica:\n\n${spotListFormatted}\n\nLos puntos están trazados y numerados en el mapa.`;

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