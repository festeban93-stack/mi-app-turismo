import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60; // Extender timeout en Next.js / Vercel

export async function GET(req: NextRequest) {
  try {
    const overpassQuery = `
      [out:json][timeout:60];
      (
        node["tourism"="viewpoint"](8.0,-86.0,11.2,-82.5);
        node["waterway"="waterfall"](8.0,-86.0,11.2,-82.5);
        node["amenity"="cafe"](8.0,-86.0,11.2,-82.5);
        node["tourism"="attraction"](8.0,-86.0,11.2,-82.5);
        node["leisure"="park"](8.0,-86.0,11.2,-82.5);
      );
      out body 300;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
      headers: { 'Content-Type': 'text/plain' }
    });

    if (!response.ok) throw new Error(`Overpass API HTTP ${response.status}`);

    const data = await response.json();
    const elements = data.elements || [];

    const spotsToInsert = elements
      .filter((el: any) => el.tags && el.tags.name && el.lat && el.lon)
      .map((el: any) => {
        let category = 'naturaleza';
        const nameLower = (el.tags.name || '').toLowerCase();
        const amenity = (el.tags.amenity || '').toLowerCase();

        if (amenity === 'cafe' || amenity === 'restaurant' || nameLower.includes('café')) {
          category = 'gastronomia';
        } else if (el.tags.tourism === 'attraction' || el.tags.historic) {
          category = 'cultura';
        }

        return {
          title: el.tags.name,
          description: el.tags.description || `Punto turístico en ${el.tags['addr:city'] || 'Costa Rica'}.`,
          category,
          latitude: el.lat,
          longitude: el.lon,
          address_text: el.tags['addr:city'] || el.tags['addr:province'] || 'Costa Rica',
          opening_hours: el.tags.opening_hours || '08:00 - 17:00',
          entry_fee: 'Acceso público / Consumo local'
        };
      });

    if (spotsToInsert.length > 0) {
      const { error } = await supabase
        .from('spots')
        .upsert(spotsToInsert, { onConflict: 'title', ignoreDuplicates: true });

      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      insertedCount: spotsToInsert.length,
      message: `Se insertaron ${spotsToInsert.length} gemas en todo Costa Rica.`
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}