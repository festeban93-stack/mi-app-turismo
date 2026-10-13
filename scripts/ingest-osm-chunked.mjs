import dns from 'dns';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. FORZAR RESOLUCIÓN IPv4 (Resuelve el "fetch failed" de Node en Windows)
dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Leer credenciales desde .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;
    const key = trimmed.substring(0, eqIndex).trim();
    const val = trimmed.substring(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!supabaseUrl && (key === 'NEXT_PUBLIC_SUPABASE_URL' || key === 'SUPABASE_URL')) supabaseUrl = val;
    if (!supabaseKey && (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' || key === 'SUPABASE_ANON_KEY' || key === 'SUPABASE_SERVICE_ROLE_KEY')) supabaseKey = val;
  });
}

supabaseUrl = supabaseUrl.replace(/\/+$/, '');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Credenciales de Supabase no encontradas en .env.local');
  process.exit(1);
}

// 3. Regiones de Costa Rica (Bounding Boxes)
const REGIONS = [
  { name: 'Valle Central', bbox: [9.70, -84.40, 10.20, -83.70] },
  { name: 'Zona Norte & Arenal', bbox: [10.20, -84.80, 11.10, -84.10] },
  { name: 'Guanacaste', bbox: [9.80, -85.90, 11.20, -85.10] },
  { name: 'Pacífico Central', bbox: [9.20, -84.80, 9.90, -84.30] },
  { name: 'Pacífico Sur & Osa', bbox: [8.20, -83.90, 9.30, -82.80] },
  { name: 'Caribe', bbox: [9.50, -83.60, 10.90, -82.50] }
];

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchRegionOSM(region) {
  const [minLat, minLon, maxLat, maxLon] = region.bbox;
  const rawQuery = `[out:json][timeout:25];(node["tourism"="viewpoint"](${minLat},${minLon},${maxLat},${maxLon});node["waterway"="waterfall"](${minLat},${minLon},${maxLat},${maxLon});node["amenity"="cafe"](${minLat},${minLon},${maxLat},${maxLon});node["tourism"="attraction"](${minLat},${minLon},${maxLat},${maxLon});node["leisure"="park"](${minLat},${minLon},${maxLat},${maxLon}););out body 80;`;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(rawQuery)}`;

  console.log(`📡 Consultando ${region.name} vía GET IPv4...`);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MapAICostaRica/1.0'
      }
    });

    if (res.ok) {
      const data = await res.json();
      return data.elements || [];
    } else {
      console.warn(`  ⚠️ HTTP Status ${res.status} en ${region.name}`);
    }
  } catch (err) {
    console.error(`  ❌ Error de conexión en ${region.name}:`, err.message);
  }
  return [];
}

async function run() {
  console.log(`\n🚀 INICIANDO INGESTA AUTOMÁTICA EN COSTA RICA (FORZADO IPv4)`);
  console.log(`🔗 Supabase: ${supabaseUrl}\n`);

  let grandTotal = 0;

  for (const region of REGIONS) {
    const elements = await fetchRegionOSM(region);
    console.log(`   📦 Nodos recuperados en ${region.name}: ${elements.length}`);

    if (elements.length > 0) {
      const spots = elements
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

          const addressText = el.tags['addr:city'] || el.tags['addr:province'] || region.name;

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

      // Insertar en Supabase REST API
      const dbRes = await fetch(`${supabaseUrl}/rest/v1/spots`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=ignore-duplicates'
        },
        body: JSON.stringify(spots)
      });

      if (dbRes.ok) {
        grandTotal += spots.length;
        console.log(`   ✅ Insertadas ${spots.length} gemas de ${region.name} en Supabase.`);
      } else {
        const errTxt = await dbRes.text();
        console.warn(`   ⚠️ Error insertando en Supabase: ${errTxt}`);
      }
    }

    await sleep(2000);
  }

  console.log(`\n🎉 PROCESO COMPLETADO: ${grandTotal} gemas ingresadas en la base de datos.`);
}

run();