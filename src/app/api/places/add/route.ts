import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { name, region, raw_description, price, lat, lng } = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!name || !lat || !lng) {
      return NextResponse.json({ error: 'Faltan datos obligatorios (nombre, lat, lng)' }, { status: 400 });
    }

    const shortDesc = raw_description || 'Gema oculta descubierta por la comunidad exploradora de Costa Rica.';
    const aiStory = `Descubierto en ${region || 'Costa Rica'}: ${raw_description || 'Un rincón especial fuera de la ruta comercial habitual.'}`;
    const category = 'Gema Oculta';
    const tags = ['gema-oculta', 'comunidad', 'crowdsourced'];

    let savedToDb = false;

    // Persistencia real en Supabase mediante el procedimiento almacenado
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
            p_name: name,
            p_category: category,
            p_region: region || 'Costa Rica',
            p_lat: parseFloat(lat),
            p_lng: parseFloat(lng),
            p_short_desc: shortDesc,
            p_ai_story: aiStory,
            p_tags: tags,
            p_price: parseFloat(price) || 0
          })
        });

        if (dbRes.ok) {
          savedToDb = true;
        }
      } catch (err) {
        console.error('⚠️ Error al insertar la gema en Supabase:', err);
      }
    }

    const newPlace = {
      id: Date.now().toString(),
      name,
      region: region || 'Costa Rica',
      category,
      short_description: shortDesc,
      ai_story: aiStory,
      tags,
      estimated_price_usd: parseFloat(price) || 0,
      rating: 5.0,
      location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] }
    };

    return NextResponse.json({
      success: true,
      message: '¡Gema oculta guardada exitosamente!',
      saved_to_supabase: savedToDb,
      newPlace
    });

  } catch (error: any) {
    return NextResponse.json({ error: 'Error al procesar la gema oculta' }, { status: 500 });
  }
}
