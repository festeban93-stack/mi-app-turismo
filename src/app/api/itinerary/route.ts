import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { region, days, budget, travel_style } = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!region || !days || !budget) {
      return NextResponse.json({ error: 'Faltan parámetros de viaje obligatorios.' }, { status: 400 });
    }

    let availablePlaces: any[] = [];

    if (supabaseUrl && supabaseKey) {
      try {
        const rpcUrl = `${supabaseUrl}/rest/v1/rpc/get_places_geojson`;
        const dbRes = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });

        if (dbRes.ok) {
          const data = await dbRes.json();
          if (Array.isArray(data)) {
            availablePlaces = data.filter((p: any) =>
              region === 'Todas' || !p.region || p.region.toLowerCase().includes(region.toLowerCase())
            );
          }
        }
      } catch (err) {
        console.warn('⚠️ Consulta a Supabase en fallback local.');
      }
    }

    let itineraryPlan: any[] = [];

    if (geminiKey && !geminiKey.includes('tu_clave') && availablePlaces.length > 0) {
      const placesContext = availablePlaces.slice(0, 10).map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.estimated_price_usd,
        description: p.short_description
      }));

      const prompt = `
        Crea un itinerario de ${days} días en la región "${region}" en Costa Rica con presupuesto de $${budget} USD y estilo "${travel_style || 'Aventura'}".
        Lugares disponibles: ${JSON.stringify(placesContext)}

        Devuelve ÚNICAMENTE un JSON estricto sin bloques markdown:
        [
          {
            "day": 1,
            "theme": "Exploración de la zona",
            "estimated_daily_cost_usd": 40,
            "activities": [
              {
                "time": "08:30 AM",
                "place_name": "Nombre del lugar",
                "recommendation": "Detalle de la actividad..."
              }
            ]
          }
        ]
      `;

      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const aiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleanJson = rawText.replace(/```json|```/gi, '').trim();
          itineraryPlan = JSON.parse(cleanJson);
        }
      } catch (aiErr) {
        console.warn('⚠️ Fallback a generador estructural de rutas.');
      }
    }

    if (!itineraryPlan || itineraryPlan.length === 0) {
      const numDays = parseInt(days, 10) || 2;
      const dailyBudget = Math.round(budget / numDays);

      itineraryPlan = Array.from({ length: numDays }).map((_, idx) => ({
        day: idx + 1,
        theme: `Día ${idx + 1}: Descubriendo ${region}`,
        estimated_daily_cost_usd: dailyBudget,
        activities: [
          {
            time: '08:30 AM',
            place_name: `Desayuno tradicional y mirador en ${region}`,
            recommendation: 'Comienza el día con comida típica local y vistas panorámicas de la zona.'
          },
          {
            time: '01:30 PM',
            place_name: `Aventura o caminata natural en ${region}`,
            recommendation: 'Explora senderos, cataratas o rincones locales recomendados por la comunidad.'
          }
        ]
      }));
    }

    return NextResponse.json({
      success: true,
      region,
      days,
      budget_usd: budget,
      itinerary: itineraryPlan
    });

  } catch (error: any) {
    return NextResponse.json({ error: 'Error al generar el itinerario' }, { status: 500 });
  }
}
