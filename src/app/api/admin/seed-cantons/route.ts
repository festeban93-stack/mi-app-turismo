import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY no definida en Vercel.' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const canton = body.canton || 'La Fortuna, San Carlos';

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Actúa como un mapa turístico de Costa Rica. Genera exactamente 6 puntos de interés, miradores, restaurantes tradicionales, cataratas o gemas ocultas en la zona de: "${canton}".

Devuelve ÚNICAMENTE un arreglo JSON válido sin formato Markdown ni texto extra. Formato requerido:
[
  {
    "title": "Nombre del lugar",
    "description": "Descripción atractiva de 2 frases enfocada en la experiencia.",
    "category": "gastronomia",
    "latitude": 10.4678,
    "longitude": -84.6427,
    "address_text": "Referencia local",
    "opening_hours": "Lunes a Domingo 8:00 AM - 5:00 PM",
    "entry_fee": "Entrada Gratuita"
  }
]
Valores permitidos para category: "gastronomia", "naturaleza", "aventura", "cultura", "hospedaje".`;

    const response = await model.generateContent(prompt);
    const rawText = response.response.text();
    
    // Extracción limpia mediante Regex para evitar fallos de Markdown
    const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { success: false, error: 'La respuesta de la IA no contenía un JSON válido.', rawText },
        { status: 500 }
      );
    }

    const spotsData = JSON.parse(jsonMatch[0]);

    // Formato GeoJSON compatible con PostGIS/PostgREST en Supabase
    const rowsToInsert = spotsData.map((spot: any) => ({
      title: spot.title,
      description: spot.description,
      category: ['gastronomia', 'naturaleza', 'aventura', 'cultura', 'hospedaje'].includes(spot.category) 
        ? spot.category 
        : 'naturaleza',
      location: {
        type: 'Point',
        coordinates: [Number(spot.longitude), Number(spot.latitude)],
      },
      address_text: spot.address_text || canton,
      opening_hours: spot.opening_hours || 'Lunes a Domingo: 8:00 AM - 5:00 PM',
      entry_fee: spot.entry_fee || 'Entrada Libre',
      source_type: 'ai_scraper',
      is_verified: true,
    }));

    const { data, error } = await supabase
      .from('spots')
      .insert(rowsToInsert)
      .select();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      canton_processed: canton,
      inserted_count: data?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}