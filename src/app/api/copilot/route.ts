import { NextResponse } from 'next/server';

function filterLocally(query: string, places: any[]) {
  const q = (query || '').toLowerCase();
  const priceMatch = q.match(/\$?(\d+)/);
  const maxPrice = priceMatch ? parseInt(priceMatch[1], 10) : null;

  const matched = places.filter((p) => {
    const matchRegion = q.includes((p.region || '').toLowerCase());
    const matchCategory = q.includes((p.category || '').toLowerCase());
    const matchName = (p.name || '').toLowerCase().includes(q);
    const matchPrice = maxPrice !== null ? p.estimated_price_usd <= maxPrice : true;
    const matchTags = p.tags && p.tags.some((t: string) => q.includes(t.toLowerCase()));

    return (matchRegion || matchCategory || matchName || matchTags) && matchPrice;
  });

  const finalPlaces = matched.length > 0 ? matched : places;
  const matchedIds = finalPlaces.map((p) => p.id);

  return {
    response_text: `¡Pura vida! Filtré ${finalPlaces.length} opciones en el mapa que se ajustan a tu presupuesto y búsqueda sobre "${query}".`,
    matched_ids: matchedIds
  };
}

export async function POST(request: Request) {
  let userMessage = '';
  let availablePlaces: any[] = [];

  try {
    const body = await request.json();
    userMessage = body.message || '';
    availablePlaces = body.places || [];

    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey || geminiKey.includes('tu_clave')) {
      return NextResponse.json(filterLocally(userMessage, availablePlaces));
    }

    const placesContext = availablePlaces.map((p: any) => ({
      id: p.id,
      name: p.name,
      region: p.region,
      category: p.category,
      price: p.estimated_price_usd,
      description: p.short_description
    }));

    const prompt = `
      Eres "Copiloto MapAI", un guía de viajes experto de Costa Rica.
      Consulta del turista: "${userMessage}"

      Lugares disponibles en el mapa:
      ${JSON.stringify(placesContext)}

      Instrucciones:
      Responde de forma amigable en 2 oraciones breves recomendando los mejores lugares.
      Devuelve ÚNICAMENTE un JSON estricto sin bloques markdown triples comillas:
      {"response_text": "Tu recomendación aquí...", "matched_ids": ["id1", "id2"]}
    `;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

    const aiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!aiRes.ok) {
      throw new Error(`Gemini API Http ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJson = rawText.replace(/```json|```/gi, '').trim();
    const parsed = JSON.parse(cleanJson);

    return NextResponse.json({
      response_text: parsed.response_text || '¡Pura vida! Aquí tienes las mejores opciones recomendadas.',
      matched_ids: Array.isArray(parsed.matched_ids) ? parsed.matched_ids : []
    });

  } catch (err: any) {
    console.warn('⚠️ [Copilot Engine] Ejecutando algoritmo de respaldo semántico:', err?.message);
    return NextResponse.json(filterLocally(userMessage, availablePlaces));
  }
}
