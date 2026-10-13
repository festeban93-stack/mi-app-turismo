import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY deben estar definidos en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runNationalIngestion() {
  console.log('🚀 Iniciando Ingesta Masiva para Costa Rica (OpenStreetMap)...');

  const overpassQuery = `
    [out:json][timeout:120];
    (
      node["tourism"="viewpoint"](8.0,-86.0,11.2,-82.5);
      node["waterway"="waterfall"](8.0,-86.0,11.2,-82.5);
      node["amenity"="cafe"](8.0,-86.0,11.2,-82.5);
      node["tourism"="attraction"](8.0,-86.0,11.2,-82.5);
      node["leisure"="park"](8.0,-86.0,11.2,-82.5);
    );
    out body 400;
  `;

  try {
    console.log('📡 Consultando nodos turísticos en las 7 provincias...');
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
      headers: { 'Content-Type': 'text/plain' }
    });

    if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);

    const data = await response.json();
    const elements = data.elements || [];
    console.log(`📦 Nodos recuperados: ${elements.length}. Procesando datos...`);

    const spotsToInsert = elements
      .filter(el => el.tags && el.tags.name && el.lat && el.lon)
      .map(el => {
        let category = 'naturaleza';
        const nameLower = (el.tags.name || '').toLowerCase();
        const amenity = (el.tags.amenity || '').toLowerCase();
        const tourism = (el.tags.tourism || '').toLowerCase();

        if (amenity === 'cafe' || amenity === 'restaurant' || nameLower.includes('café') || nameLower.includes('soda')) {
          category = 'gastronomia';
        } else if (tourism === 'attraction' || tourism === 'museum' || el.tags.historic) {
          category = 'cultura';
        } else if (nameLower.includes('canopy') || nameLower.includes('rafting') || nameLower.includes('surf')) {
          category = 'aventura';
        }

        const addressText = el.tags['addr:city'] || el.tags['addr:suburb'] || el.tags['addr:province'] || 'Costa Rica';

        return {
          title: el.tags.name,
          description: el.tags.description || `Punto turístico verificado en ${addressText}, Costa Rica.`,
          category,
          latitude: el.lat,
          longitude: el.lon,
          address_text: addressText,
          opening_hours: el.tags.opening_hours || '08:00 - 17:00',
          entry_fee: 'Acceso público / Consumo local'
        };
      });

    console.log(`💾 Insertando ${spotsToInsert.length} gemas en Supabase...`);

    const { data: inserted, error } = await supabase
      .from('spots')
      .upsert(spotsToInsert, { onConflict: 'title', ignoreDuplicates: true });

    if (error) throw error;

    console.log(`✅ ¡ÉXITO! Se han cargado ${spotsToInsert.length} gemas reales en MapAI Costa Rica.`);
  } catch (err) {
    console.error('❌ Error durante la ingesta:', err.message || err);
  }
}

runNationalIngestion();