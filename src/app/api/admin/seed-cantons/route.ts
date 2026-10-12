import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Cantones clave de Costa Rica organizados por regiones turísticas
const CANTONES_COSTA_RICA = [
  'San Carlos (La Fortuna, Ciudad Quesada)',
  'Garabito (Jacó, Tarcoles)',
  'Quepos (Manuel Antonio)',
  'Pococí (Tortuguero)',
  'Talamanca (Puerto Viejo, Cahuita)',
  'Santa Cruz (Tamarindo, Conchal)',
  'Nicoya (Nosara, Samara)',
  'Monteverde',
  'Osa (Drake, Puerto Jiménez)',
  'Pérez Zeledón (San Gerardo, Chirripó)',
  'Sarapiquí',
  'Paraíso (Orosi, Ujarrás)',
  'Zarcero',
  'Poás',
  'Escazú y Santa Ana'
];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const cantonesToProcess = body.cantones || CANTONES_COSTA_RICA.slice(0, 3);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    let totalInserted = 0;
    const resultsSummary: Record<string, number> = {};

    for (const canton of cantonesToProcess) {
      const prompt = `Actúa como un guía turístico experto en Costa Rica. Genera exactamente 6 puntos de interés únicos, miradores, restaurantes tradicionales, cataratas o gemas poco conocidas en la zona de: "${canton}".

Devuelve ÚNICAMENTE un arreglo JSON válido (sin sintaxis markdown \`\`\`json) con el siguiente formato estricto:
[
  {
    "title": "Nombre del lugar",
    "description": "Descripción atractiva de 2 a 3 frases resaltando por qué visitarlo.",
    "category": "gastronomia" | "naturaleza" | "aventura" | "cultura" | "hospedaje",
    "latitude": 9.9999,
    "longitude": -84.9999,
    "address_text": "Dirección exacta o referencia local",
    "opening_hours": "Horario estimado (ej. Lunes a Domingo 8:00 AM - 5:00 PM)",
    "entry_fee": "Costo estimado (ej. Entrada Gratuita o ₡3,000 / $10 USD)"
  }
]`;

      const response = await model.generateContent(prompt);
      const text = response.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const spotsData = JSON.parse(text);

      let insertedCount = 0;
      for (const spot of spotsData) {
        // Formato WKT geográfico para PostGIS
        const wktPoint = `POINT(${spot.longitude} ${spot.latitude})`;

        const { error } = await supabase.from('spots').insert({
          title: spot.title,
          description: spot.description,
          category: spot.category,
          location: wktPoint,
          address_text: spot.address_text,
          opening_hours: spot.opening_hours,
          entry_fee: spot.entry_fee,
          source_type: 'ai_scraper',
          is_verified: true,
        });

        if (!error) {
          insertedCount++;
          totalInserted++;
        }
      }

      resultsSummary[canton] = insertedCount;
    }

    return NextResponse.json({
      success: true,
      total_inserted: totalInserted,
      summary: resultsSummary,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}