import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { prompt, history = [] } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'El prompt es requerido.' }, { status: 400 });
    }

    // 1. RAG: Obtener las Gemas reales de Supabase para alimentar el contexto de la IA
    const { data: realSpots, error: spotsError } = await supabase
      .from('spots')
      .select('id, title, description, category, latitude, longitude, address_text, entry_fee, opening_hours')
      .limit(50);

    if (spotsError) {
      console.error('Error al consultar gemas en Supabase:', spotsError);
    }

    // Formatear las gemas para el contexto del System Prompt
    const spotsContext = (realSpots || []).map(s => `- ID: ${s.id} | Nombre: "${s.title}" | Cat: ${s.category} | Ubicación: ${s.address_text || 'Costa Rica'} (Lat: ${s.latitude}, Lon: ${s.longitude}) | Tarifa: ${s.entry_fee || 'Libre'}`).join('\n');

    // 2. Definición del Prompt de Agente Experto
    const systemInstruction = `
Eres el Copiloto Turístico de MapAI, un Guía de Viajes y Agente Local experto en Costa Rica.
Tu objetivo es ayudar a los usuarios a descubrir y planificar itinerarios increíbles en Costa Rica.

A CONTINUACIÓN TIENES LA LISTA DE GEMAS Y LUGARES REALES REGISTRADOS EN NUESTRA BASE DE DATOS:
${spotsContext}

REGLAS DE ACTUACIÓN DEL AGENTE:
1. Responde de forma amable, entusiasta y directa como un costarricense experto.
2. Si el usuario solicita un itinerario nuevo o modificar uno existente (ej: "cambiá la catarata por mariscos", "agregale un día más"), analiza el historial y ajusta la lista de gemas.
3. Prioriza SIEMPRE sugerir lugares de la lista de GEMAS REALES provista arriba. Usa sus IDs exactos.
4. Si el lugar mencionado no existe en la lista, puedes sugerir un punto de interés conocido de Costa Rica pero aclarándolo amablemente.
5. NUNCA sugieras traslados imposibles (ej. ir de Limón a Guanacaste en 1 hora). Ten en cuenta la geografía de Costa Rica.

FORMATO DE SALIDA OBLIGATORIO:
Debes responder ÚNICAMENTE en formato JSON estricto sin bloques de markdown adicionales.
{
  "reply": "Tu respuesta conversacional explicativa en español...",
  "suggestedSpotIds": ["id-gema-1", "id-gema-2"]
}
`;

    // 3. Preparar los mensajes con historial conversacional
    const openAiMessages = [
      { role: 'system', content: systemInstruction },
      ...history.map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: typeof h.content === 'string' ? h.content : JSON.stringify(h.content)
      })),
      { role: 'user', content: prompt }
    ];

    const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;

    if (!process.env.OPENAI_API_KEY) {
      // Fallback simulado de Agente Inteligente si no hay API Key configurada aún
      const matchedSpots = (realSpots || []).slice(0, 3);
      return NextResponse.json({
        reply: `¡Con gusto! He procesado tu solicitud "${prompt}". Basado en nuestras gemas verificadas en Costa Rica, te recomiendo esta ruta optimizada. Podés ver los puntos trazados en el mapa interactivo.`,
        suggestedSpots: matchedSpots
      });
    }

    // 4. Llamada al Modelo de Lenguaje (OpenAI API / App Router)
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error('Respuesta vacía del modelo de IA.');
    }

    const parsedOutput = JSON.parse(rawContent);

    // 5. Vincular los IDs devueltos por la IA con los objetos Spot completos de Supabase
    const suggestedSpotIds = parsedOutput.suggestedSpotIds || [];
    const suggestedSpots = (realSpots || []).filter(s => suggestedSpotIds.includes(s.id));

    return NextResponse.json({
      reply: parsedOutput.reply,
      suggestedSpots: suggestedSpots.length > 0 ? suggestedSpots : (realSpots || []).slice(0, 3)
    });

  } catch (error: any) {
    console.error('Error en /api/copilot:', error);
    return NextResponse.json(
      { error: 'Error interno en el Copiloto de IA.', details: error?.message },
      { status: 500 }
    );
  }
}