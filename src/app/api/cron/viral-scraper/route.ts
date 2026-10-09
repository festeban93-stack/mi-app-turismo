import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const VIRAL_SPOTS = [
  {
    name: 'Columpio de las Nubes',
    region: 'San José',
    category: 'Aventura',
    lat: 10.3152,
    lng: -84.8251,
    short_description: 'Spot fotográfico viral en TikTok e Instagram Reels.',
    ai_story: 'Mirador elevado que simula volar sobre la bruma de las montañas de bosque nuboso.',
    price: 5
  },
  {
    name: 'Roca de la Selva',
    region: 'San José',
    category: 'Naturaleza',
    lat: 10.0881,
    lng: -84.4712,
    short_description: 'Tendencia viral en grupos de senderismo por su vista panorámica.',
    ai_story: 'Formación rocosa natural ideal para fotografía de atardecer y campismo.',
    price: 0
  },
  {
    name: 'Playa Prieta Sunset Spot',
    region: 'Guanacaste',
    category: 'Naturaleza',
    lat: 10.4921,
    lng: -85.7891,
    short_description: 'Rincón costero viral por sus atardeceres y aguas calmas.',
    ai_story: 'Popularizado en redes sociales por exploradores que buscan playas vírgenes en Guanacaste.',
    price: 0
  }
];

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const selectedSpot = VIRAL_SPOTS[Math.floor(Math.random() * VIRAL_SPOTS.length)];
  let savedToDb = false;
  let dbError = null;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase.rpc('insert_poi_with_location', {
        p_name: selectedSpot.name,
        p_category: selectedSpot.category,
        p_region: selectedSpot.region,
        p_lat: selectedSpot.lat,
        p_lng: selectedSpot.lng,
        p_short_desc: selectedSpot.short_description,
        p_ai_story: selectedSpot.ai_story,
        p_tags: ['viral', 'instagrammable', 'tendencia'],
        p_price: selectedSpot.price
      });

      if (!error) {
        savedToDb = true;
      } else {
        dbError = error.message;
      }
    } catch (err: any) {
      dbError = err.message;
    }
  }

  return NextResponse.json({
    success: true,
    engine: 'Social Media Viral Spot Engine',
    viral_spot: selectedSpot.name,
    region: selectedSpot.region,
    saved_to_database: savedToDb,
    debug: dbError
  });
}
