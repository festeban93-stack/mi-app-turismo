import { validCoordinates } from '@/lib/server/spots';
import { requireCron } from '@/lib/server/access';
import { NextResponse } from 'next/server';

const ZONES = [
  { name: 'Guanacaste Norte', bbox: '10.20,-85.90,10.50,-85.70' },
  { name: 'La Fortuna / San Carlos', bbox: '10.40,-84.78,10.55,-84.58' },
  { name: 'Manuel Antonio', bbox: '9.35,-84.20,9.45,-84.10' },
  { name: 'San José', bbox: '9.88,-84.18,10.02,-84.00' }
];

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

export async function GET(request: Request) {
  const denied = requireCron(request);
  if (denied) return denied;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: 'Servicio no configurado.' }, { status: 503 });
  let failed = false;
  const randomZone = ZONES[Math.floor(Math.random() * ZONES.length)];
  let addedCount = 0;
  const logResults: string[] = [];

  const query = `
    [out:json][timeout:15];
    (
      node["tourism"~"attraction|museum|viewpoint"](${randomZone.bbox});
      node["amenity"~"restaurant|cafe"](${randomZone.bbox});
    );
    out body 10;
  `;

  let elements: any[] = [];
  let fetchSuccessful = false;

  // Intentar con espejos alternativos de Overpass API
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const osmRes = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'MapAICostaRicaBot/1.0' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (osmRes.ok) {
        const osmData = await osmRes.json();
        elements = osmData.elements || [];
        fetchSuccessful = true;
        break;
      }
    } catch (e) {
      console.warn(`⚠️ Intento fallido con ${endpoint}, intentando siguiente espejo...`);
    }
  }

  if (!fetchSuccessful) return NextResponse.json({ error: 'OpenStreetMap no disponible.' }, { status: 502 });

  for (const el of elements) {
    if (el.tags && el.tags.name && validCoordinates(el.lat, el.lon)) {
      const name = el.tags.name;
      const lat = el.lat;
      const lng = el.lon;
      
      let category = 'Naturaleza';
      if (el.tags.amenity === 'restaurant' || el.tags.amenity === 'cafe') category = 'Gastronomía';
      else if (el.tags.tourism === 'museum') category = 'Cultura';

      if (supabaseUrl && supabaseKey) {
        try {
          const rpcUrl = `${supabaseUrl}/rest/v1/spots?on_conflict=title`;
          const dbRes = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Prefer': 'resolution=ignore-duplicates,return=representation',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              title: name, category: category === 'Gastronomía' ? 'gastronomia' : category.toLowerCase(),
              location: `SRID=4326;POINT(${lng} ${lat})`,
              address_text: randomZone.name, description: 'Importado de OpenStreetMap; pendiente de revisión.',
              opening_hours: 'Sin confirmar', entry_fee: 'Sin confirmar',
              source_type: 'osm', is_verified: false, verification_status: 'pending'
            })
          });

          if (dbRes.ok) {
            const inserted = await dbRes.json();
            addedCount += Array.isArray(inserted) ? inserted.length : 0;
            logResults.push(`Añadido: ${name} (${randomZone.name})`);
          } else { failed = true; }
        } catch (err) {
          failed = true;
          console.error('Error insertando en DB');
        }
      }
    }
  }

  return NextResponse.json({
    success: !failed,
    message: `¡Auto-scraping ejecutado para ${randomZone.name}!`,
    source: 'OpenStreetMap Live',
    places_processed: elements.length,
    new_places_added: addedCount,
    details: logResults
  }, { status: failed ? 503 : 200 });
}
