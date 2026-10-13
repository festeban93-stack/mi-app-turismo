import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function normalize(str: string = ''): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, history = [] } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'El prompt es requerido.' }, { status: 400 });
    }

    // 1. Consultar Gemas Reales de Supabase
    const { data: allSpots, error: spotsError } = await supabase
      .from('spots')
      .select('id, title, description, category, latitude, longitude, address_text, entry_fee, opening_hours');

    if (spotsError) {
      console.error('Error al consultar gemas en Supabase:', spotsError);
    }

    const spotsList = allSpots || [];

    // 2. Extracción de Palabras Clave del Prompt
    const cleanPrompt = normalize(prompt);
    const keywords = cleanPrompt
      .split(/\s+/)
      .filter(w => w.length > 3 && !['quiero', 'ruta', 'cerca', 'donde', 'para', 'como', 'hacer'].includes(w));

    // Filtrar gemas por coincidencia de palabras clave (Lugar, Categoría, Descripción)
    let matchedSpots = spotsList.filter(spot => {
      const titleNorm = normalize(spot.title);
      const addressNorm = normalize(spot.address_text);
      const descNorm = normalize(spot.description);
      const catNorm = normalize(spot.category);

      return keywords.some(kw => 
        titleNorm.includes(kw) || 
        addressNorm.includes(kw) || 
        descNorm.includes(kw) || 
        catNorm.includes(kw)
      );
    });

    // Si no hay coincidencias exactas por palabra clave, sugerir gemas por zona/categoría general
    if (matchedSpots.length === 0) {
      if (cleanPrompt.includes('sarchi') || cleanPrompt.includes('bajos del toro') || cleanPrompt.includes('valverde')) {
        matchedSpots = spotsList.filter(s => normalize(s.address_text).includes('sarchi') || normalize(s.title).includes('silencio') || normalize(s.title).includes('catarata'));
      } else {
        matchedSpots = spotsList.slice(0, 4);
      }
    }

    // 3. Si hay OpenAI API Key configurada, llamar a GPT-4o-mini
    if (process.env.OPENAI_API_KEY) {
      const spotsContext = spotsList.map(s => `- ID: ${s.id} | Nombre: "${s.title}" | Cat: ${s.category} | Ubicación: ${s.address_text}`).join('\n');

      const systemInstruction = `
Eres el Copiloto Turístico de MapAI, un Guía Experto de Costa Rica.
Gemas reales disponibles:
${spotsContext}

Reglas:
1. Responde de forma amable y concisa como un guía local tico.
2. Si el usuario pide un cambio o ajuste, analiza el historial recibido y actualiza la lista.
3. Devuelve ÚNICAMENTE formato JSON estricto:
{
  "reply": "Tu explicación en español...",
  "suggestedSpotIds": ["id1", "id2"]
}`;

      const openAiMessages = [
        { role: 'system', content: systemInstruction },
        ...history.map((h: any) => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })),
        { role: 'user', content: prompt }
      ];

      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: openAiMessages,
          temperature: 0.7,
          response_format: { type: 'json_object' }
        })
      });

      const aiData = await aiRes.json();
      const rawContent = aiData.choices?.[0]?.message?.content;

      if (rawContent) {
        const parsed = JSON.parse(rawContent);
        const suggestedSpots = spotsList.filter(s => (parsed.suggestedSpotIds || []).includes(s.id));
        return NextResponse.json({
          reply: parsed.reply,
          suggestedSpots: suggestedSpots.length > 0 ? suggestedSpots : matchedSpots.slice(0, 4)
        });
      }
    }

    // 4. SMART RAG FALLBACK (Cuando no hay API Key activa o durante pruebas locales)
    const spotNames = matchedSpots.slice(0, 4).map(s => `• ${s.title} (${s.address_text || 'Costa Rica'})`).join('\n');

    let replyText = '';
    if (matchedSpots.length > 0) {
      replyText = `¡Encontré estas gemas perfectas para tu consulta sobre "${prompt}":\n\n${spotNames}\n\nLas podés ver marcadas y trazadas directamente en el mapa interactivo.`;
    } else {
      replyText = `No encontré gemas con ese término exacto, pero te he trazado las mejores opciones cercanas en el mapa para explorar.`;
    }

    return NextResponse.json({
      reply: replyText,
      suggestedSpots: matchedSpots.slice(0, 4)
    });

  } catch (error: any) {
    console.error('Error en /api/copilot:', error);
    return NextResponse.json(
      { error: 'Error interno en el Copiloto.', details: error?.message },
      { status: 500 }
    );
  }
}