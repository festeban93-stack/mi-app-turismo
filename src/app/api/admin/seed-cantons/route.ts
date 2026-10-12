import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const rawApiKey = process.env.GEMINI_API_KEY || '';
    const apiKey = rawApiKey.replace(/['"]/g, '').trim();

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'GEMINI_API_KEY no está configurada o está vacía en Vercel.',
      }, { status: 200 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl) {
      return NextResponse.json({
        success: false,
        error: 'NEXT_PUBLIC_SUPABASE_URL no está configurada.',
      }, { status: 200 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const body = await request.json().catch(() => ({}));
    const canton = body.canton || 'La Fortuna, San Carlos';

    const genAI = new GoogleGenerativeAI(apiKey);
    
    const candidateModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro'];
    let rawText = '';
    let lastError: any = null;

    const prompt = `Actúa como un mapa turístico de Costa Rica. Genera exactamente 5 puntos de interés, miradores, restaurantes tradicionales o cataratas en la zona de: "${canton}".

Devuelve ÚNICAMENTE un arreglo JSON válido sin formato Markdown ni texto extra. Formato requerido:
[
  {
    "title": "Nombre del lugar",
    "description": "Descripción de 2 frases enfocada en la experiencia.",
    "category": "gastronomia",
    "latitude": 10.4678,
    "longitude": -84.6427,
    "address_text": "Referencia local",
    "opening_hours": "Lunes a Domingo 8:00 AM - 5:00 PM",
    "entry_fee": "Entrada Gratuita"
  }
]
Valores permitidos para category: "gastronomia", "naturaleza", "aventura", "cultura", "hospedaje".`;

    // 1. Probar modelos candidatos principales
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const response = await model.generateContent(prompt);
        rawText = response.response.text();
        if (rawText) break;
      } catch (err: any) {
        lastError = err;
      }
    }

    // 2. Si fallan los nombres estáticos, ejecutar Auto-Descubrimiento Dinámico de Modelos
    if (!rawText) {
      try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const listData = await listRes.json();
        
        if (listData.models && Array.isArray(listData.models)) {
          const validModel = listData.models.find((m: any) => 
            m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
          );
          
          if (validModel) {
            const cleanModelName = validModel.name.replace('models/', '');
            const model = genAI.getGenerativeModel({ model: cleanModelName });
            const response = await model.generateContent(prompt);
            rawText = response.response.text();
          } else {
            return NextResponse.json({
              success: false,
              error: `Modelos no encontrados con generateContent. Respuesta API: ${JSON.stringify(listData)}`,
            }, { status: 200 });
          }
        } else if (listData.error) {
          return NextResponse.json({
            success: false,
            error: `Error de Google AI API: ${listData.error.message} (Código: ${listData.error.code})`,
          }, { status: 200 });
        }
      } catch (discoveryErr: any) {
        console.error('Error en auto-descubrimiento:', discoveryErr);
      }
    }

    if (!rawText) {
      return NextResponse.json({
        success: false,
        error: `Fallo en SDK Gemini. Último error: ${lastError?.message || 'Sin respuesta de modelos'}`,
      }, { status: 200 });
    }

    const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) {
      return NextResponse.json({
        success: false,
        error: 'La respuesta de Gemini no contenía un JSON válido.',
        rawText,
      }, { status: 200 });
    }

    const spotsData = JSON.parse(jsonMatch[0]);

    const rowsToInsert = spotsData.map((spot: any) => ({
      title: spot.title,
      description: spot.description,
      category: ['gastronomia', 'naturaleza', 'aventura', 'cultura', 'hospedaje'].includes(spot.category)
        ? spot.category
        : 'naturaleza',
      location: `SRID=4326;POINT(${spot.longitude} ${spot.latitude})`,
      address_text: spot.address_text || canton,
      opening_hours: spot.opening_hours || 'Lunes a Domingo: 8:00 AM - 5:00 PM',
      entry_fee: spot.entry_fee || 'Entrada Libre',
      source_type: 'ai_scraper',
      is_verified: true,
    }));

    const { data, error } = await supabaseAdmin
      .from('spots')
      .insert(rowsToInsert)
      .select();

    if (error) {
      return NextResponse.json({
        success: false,
        error: `Error Supabase Insert: ${error.message}`,
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      canton_processed: canton,
      inserted_count: data?.length || 0,
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `Excepción en servidor: ${error?.message || 'Error desconocido'}`,
    }, { status: 200 });
  }
}