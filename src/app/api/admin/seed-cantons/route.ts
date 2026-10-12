import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const canton = body.canton || 'La Fortuna, San Carlos';

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY no configurada en Vercel' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Actúa como guía turístico experto en Costa Rica. Genera exactamente 6 puntos de interés, miradores, restaurantes locales o gemas ocultas en la zona de: "${canton}".

Devuelve ÚNICAMENTE un arreglo JSON válido (sin markdown ```json) con el siguiente formato:
[
  {
    "title": "Nombre del lugar",
    "description": "Descripción de 2 frases enfocada en el atractivo.",
    "category": "gastronomia",
    "latitude": 10.4678,
    "longitude": -84.6427,
    "address_text": "Referencia local",
    "opening_hours": "Lunes a Domingo 8:00 AM - 5:00 PM",
    "entry_fee": "Entrada Gratuita"
  }
]
Nota para category: usa solo uno de estos valores: "gastronomia", "naturaleza", "aventura", "cultura", "hospedaje".`;

    const response = await model.generateContent(prompt);
    const rawText = response.response.text();
    const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const spotsData = JSON.parse(cleanText);

    // Mapear datos a formato PostGIS y preparar insercion en lote
    const rowsToInsert = spotsData.map((spot: any) => ({
      title: spot.title,
      description: spot.description,
      category: ['gastronomia', 'naturaleza', 'aventura', 'cultura', 'hospedaje'].includes(spot.category) 
        ? spot.category 
        : 'naturaleza',
      location: `POINT(${spot.longitude} ${spot.latitude})`,
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      canton_processed: canton,
      inserted_count: data?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}