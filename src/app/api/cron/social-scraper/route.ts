import { NextResponse } from 'next/server';

const SOCIAL_TRENDS_POOL = [
  {
    title: 'Soda El Paradero en La Fortuna',
    raw_text: 'Recomendado por la comunidad de viajeros. Excelente casado tradicional frente al volcán por $7 USD.',
    region: 'La Fortuna / San Carlos',
    category: 'Gastronomía',
    lat: 10.4682,
    lng: -84.6421,
    price: 7
  },
  {
    title: 'Mirador Cerro San Antonio',
    raw_text: 'Tendencia en redes por la puesta de sol. Vista 360 del Valle Central y libre acceso.',
    region: 'San José',
    category: 'Cultura',
    lat: 9.8921,
    lng: -84.1281,
    price: 0
  },
  {
    title: 'Playa Prieta',
    raw_text: 'Gema oculta mencionada en foros cerca de Las Catalinas. Arena oscura y oleaje muy suave.',
    region: 'Guanacaste',
    category: 'Naturaleza',
    lat: 10.4921,
    lng: -85.7891,
    price: 0
  },
  {
    title: 'Catarata Las Gemelas',
    raw_text: 'Mencionada por exploradores locales. Sendero rodeado de selva primaria y dos caídas de agua.',
    region: 'La Fortuna / San Carlos',
    category: 'Aventura',
    lat: 10.5121,
    lng: -84.6981,
    price: 10
  }
];

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const selectedTrend = SOCIAL_TRENDS_POOL[Math.floor(Math.random() * SOCIAL_TRENDS_POOL.length)];
  let aiSummary = selectedTrend.raw_text;

  if (geminiKey && !geminiKey.includes('tu_clave')) {
    try {
      const prompt = `
        Resume en 2 oraciones atractivas este punto turístico recomendado en redes sociales:
        Lugar: "${selectedTrend.title}"
        Comentario: "${selectedTrend.raw_text}"
      `;
      
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const aiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) aiSummary = text.trim();
      }
    } catch (e) {
      console.warn('⚠️ Omitiendo enriquecimiento de Gemini en fallback.');
    }
  }

  let savedToDb = false;
  let dbErrorDetails = null;

  if (supabaseUrl && supabaseKey) {
    try {
      const rpcUrl = `${supabaseUrl}/rest/v1/rpc/insert_poi_with_location`;
      const dbRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          p_name: selectedTrend.title,
          p_category: selectedTrend.category,
          p_region: selectedTrend.region,
          p_lat: selectedTrend.lat,
          p_lng: selectedTrend.lng,
          p_short_desc: aiSummary,
          p_ai_story: `Tendencia extraída de redes sociales: ${aiSummary}`,
          p_tags: ['social-trending', 'comunidad', selectedTrend.category.toLowerCase()],
          p_price: selectedTrend.price
        })
      });

      if (dbRes.ok) {
        savedToDb = true;
      } else {
        const errBody = await dbRes.text();
        dbErrorDetails = `HTTP ${dbRes.status}: ${errBody}`;
        console.error('❌ Error de respuesta Supabase RPC:', dbErrorDetails);
      }
    } catch (dbErr: any) {
      dbErrorDetails = dbErr.message;
      console.error('❌ Error enviando solicitud a Supabase:', dbErr);
    }
  } else {
    dbErrorDetails = 'Variables de Supabase incompletas en .env.local';
  }

  return NextResponse.json({
    success: true,
    message: '¡Motor Social de Ingesta Ejecutado Exitosamente!',
    place_extracted: selectedTrend.title,
    region: selectedTrend.region,
    ai_summary: aiSummary,
    saved_to_database: savedToDb,
    db_debug: dbErrorDetails
  });
}
