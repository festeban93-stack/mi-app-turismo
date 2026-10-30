import { readJSON } from '@/lib/server/body';
import { requireAccess } from '@/lib/server/access';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const access = await requireAccess(req, true);
  if (access instanceof Response) return access;
  try {
    const { bbox, regionName } = await readJSON(req);

    if (!bbox || !Array.isArray(bbox) || bbox.length !== 4 || !bbox.every((value: unknown) => typeof value === 'number' && Number.isFinite(value)) || bbox[0] < -90 || bbox[2] > 90 || bbox[1] < -180 || bbox[3] > 180 || bbox[0] >= bbox[2] || bbox[1] >= bbox[3]) {
      return NextResponse.json({ error: 'BBox inválido' }, { status: 400 });
    }

    const [minLat, minLon, maxLat, maxLon] = bbox;

    const overpassQuery = `[out:json][timeout:20];(node["tourism"="viewpoint"](${minLat},${minLon},${maxLat},${maxLon});node["waterway"="waterfall"](${minLat},${minLon},${maxLat},${maxLon});node["amenity"="cafe"](${minLat},${minLon},${maxLat},${maxLon});node["tourism"="attraction"](${minLat},${minLon},${maxLat},${maxLon});node["leisure"="park"](${minLat},${minLon},${maxLat},${maxLon}););out body 80;`;

    const endpoint = 'https://overpass-api.de/api/interpreter';

    const response = await fetch(endpoint, {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'MapAICostaRica/2.0 (https://mapai-costarica.vercel.app)'
      }
    });

    if (!response.ok) {
      throw new Error(`Overpass servidor respondió con estatus: ${response.status}`);
    }

    const data = await response.json();
    const elements = data.elements || [];

    const formattedSpots = elements
      .filter((el: any) => el.tags && el.tags.name && el.lat && el.lon)
      .map((el: any) => {
        let category = 'naturaleza';
        const nameLower = (el.tags.name || '').toLowerCase();
        const amenity = (el.tags.amenity || '').toLowerCase();
        const tourism = (el.tags.tourism || '').toLowerCase();

        if (amenity === 'cafe' || amenity === 'restaurant' || nameLower.includes('café') || nameLower.includes('soda')) {
          category = 'gastronomia';
        } else if (tourism === 'attraction' || tourism === 'museum' || el.tags.historic) {
          category = 'cultura';
        } else if (nameLower.includes('canopy') || nameLower.includes('rafting') || nameLower.includes('surf') || nameLower.includes('tour')) {
          category = 'aventura';
        }

        const addressText = el.tags['addr:city'] || el.tags['addr:province'] || regionName;

        return {
          title: el.tags.name,
          description: el.tags.description || `Punto turístico importado de OpenStreetMap en ${addressText}, Costa Rica.`,
          category,
          latitude: el.lat,
          longitude: el.lon,
          address_text: addressText,
          opening_hours: el.tags.opening_hours || 'Sin confirmar',
          entry_fee: 'Sin confirmar',
          is_verified: false, verification_status: 'pending', source_type: 'crowdsourcing', metadata: { import_origin: 'osm' }
        };
      });

    return NextResponse.json({
      success: true,
      count: formattedSpots.length,
      spots: formattedSpots
    });

  } catch (err: any) {
    console.error('Error en proxy Overpass:', err.message);
    return NextResponse.json({ error: err.message || 'Error consultando Overpass' }, { status: 500 });
  }
}
