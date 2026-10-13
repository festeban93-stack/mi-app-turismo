import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Decodificador Universal de Geometrías PostGIS (WKB Hex, WKT, EWKT, GeoJSON)
function parseCoordinates(spot: any): { lat: number; lng: number } {
  // 1. Si ya existen como números
  const rawLat = parseFloat(spot.latitude);
  const rawLng = parseFloat(spot.longitude);
  if (!isNaN(rawLat) && !isNaN(rawLng) && rawLat !== 0 && rawLng !== 0) {
    return { lat: rawLat, lng: rawLng };
  }

  const loc = spot.location;
  if (!loc) return { lat: 9.7489, lng: -83.7534 };

  // 2. Si es objeto GeoJSON { type: 'Point', coordinates: [lng, lat] }
  if (typeof loc === 'object' && Array.isArray(loc.coordinates)) {
    const lng = parseFloat(loc.coordinates[0]);
    const lat = parseFloat(loc.coordinates[1]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  if (typeof loc === 'string') {
    // 3. Cadena WKT / EWKT: POINT(-83.7 9.7)
    const wktMatch = loc.match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (wktMatch) {
      const lng = parseFloat(wktMatch[1]);
      const lat = parseFloat(wktMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }

    // 4. Cadena Hexadecimal WKB de PostGIS (0101000020E6100000...)
    if (/^[0-9a-fA-F]+$/.test(loc) && loc.length >= 42) {
      try {
        const buf = Buffer.from(loc, 'hex');
        const isLittle = buf[0] === 1;
        const rawType = isLittle ? buf.readUInt32LE(1) : buf.readUInt32BE(1);
        const hasSRID = (rawType & 0x20000000) !== 0;
        const offset = 1 + 4 + (hasSRID ? 4 : 0);

        const lng = isLittle ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset);
        const lat = isLittle ? buf.readDoubleLE(offset + 8) : buf.readDoubleBE(offset + 8);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      } catch (e) {
        // Fallback a coordenadas por defecto si el buffer falla
      }
    }
  }

  return { lat: 9.7489, lng: -83.7534 };
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Variables de entorno no configuradas', 
        spots: [] 
      }, { status: 200 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false }
    });

    const { data, error } = await supabase
      .from('spots')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message, spots: [] }, { status: 200 });
    }

    // Transformar registros para garantizar latitud y longitud numéricas
    const processedSpots = (data || []).map((spot: any) => {
      const coords = parseCoordinates(spot);
      return {
        ...spot,
        latitude: coords.lat,
        longitude: coords.lng,
      };
    });

    return NextResponse.json({ 
      success: true, 
      count: processedSpots.length,
      spots: processedSpots 
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Error de servidor', spots: [] }, { status: 200 });
  }
}