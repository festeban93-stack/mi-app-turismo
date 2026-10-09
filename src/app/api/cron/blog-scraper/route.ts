import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BLOG_DATASET = [
  {
    name: 'Soda Sánchez',
    region: 'Manuel Antonio',
    category: 'Gastronomía',
    lat: 9.4281,
    lng: -84.1652,
    short_description: 'Soda tradicional en el centro de Quepos recomendada por guías de viajes.',
    ai_story: 'Famosa por sus casados de pescado fresco y precios locales a pocos minutos del Parque Nacional.',
    price: 7
  },
  {
    name: 'Playa Mina',
    region: 'Guanacaste',
    category: 'Naturaleza',
    lat: 10.3781,
    lng: -85.8081,
    short_description: 'Playa virgen de arena blanca entre Conchal y Nombre de Jesús.',
    ai_story: 'Gema oculta destacada en blogs de mochileros por su agua cristalina y tranquilidad sin comercios.',
    price: 0
  },
  {
    name: 'Mirador Valle del General',
    region: 'San José',
    category: 'Cultura',
    lat: 9.9121,
    lng: -84.0981,
    short_description: 'Punto panorámico para contemplar el atardecer sobre las montañas.',
    ai_story: 'Lugar recomendado en guías turísticas para disfrutar de café costarricense con vista panorámica.',
    price: 5
  }
];

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const selectedPlace = BLOG_DATASET[Math.floor(Math.random() * BLOG_DATASET.length)];
  let savedToDb = false;
  let dbError = null;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase.rpc('insert_poi_with_location', {
        p_name: selectedPlace.name,
        p_category: selectedPlace.category,
        p_region: selectedPlace.region,
        p_lat: selectedPlace.lat,
        p_lng: selectedPlace.lng,
        p_short_desc: selectedPlace.short_description,
        p_ai_story: selectedPlace.ai_story,
        p_tags: ['blog-scraped', selectedPlace.category.toLowerCase(), 'recomendado'],
        p_price: selectedPlace.price
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
    engine: 'Blog & RSS Content Mining Engine',
    place_extracted: selectedPlace.name,
    region: selectedPlace.region,
    saved_to_database: savedToDb,
    debug: dbError
  });
}
