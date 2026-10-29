import { validCoordinates } from './spots';

// Decodificador Universal de Geometrías PostGIS (WKB Hex, WKT, EWKT, GeoJSON)
export function coordinatesForSpot(spot: { latitude?: unknown; longitude?: unknown; location?: unknown }): { lat: number; lng: number } | null {
  // 1. Si ya existen como números
  const number = (value: unknown) => typeof value === 'number' || typeof value === 'string' && value.trim() ? Number(value) : NaN;
  const rawLat = number(spot.latitude);
  const rawLng = number(spot.longitude);
  if (validCoordinates(rawLat, rawLng)) {
    return { lat: rawLat, lng: rawLng };
  }

  const loc = spot.location;
  if (!loc) return null;

  // 2. Si es objeto GeoJSON { type: 'Point', coordinates: [lng, lat] }
  if (typeof loc === 'object' && loc !== null && 'coordinates' in loc && Array.isArray(loc.coordinates)) {
    const lng = number(loc.coordinates[0]);
    const lat = number(loc.coordinates[1]);
    if (validCoordinates(lat, lng)) return { lat, lng };
  }

  if (typeof loc === 'string') {
    // 3. Cadena WKT / EWKT: POINT(-83.7 9.7)
    if (/SRID=/i.test(loc) && !/^SRID=4326;/i.test(loc)) return null;
    const wktMatch = loc.match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (wktMatch) {
      const lng = parseFloat(wktMatch[1]);
      const lat = parseFloat(wktMatch[2]);
      if (validCoordinates(lat, lng)) return { lat, lng };
    }

    // 4. Cadena Hexadecimal WKB de PostGIS (0101000020E6100000...)
    if (/^[0-9a-fA-F]+$/.test(loc) && loc.length >= 42) {
      try {
        const buf = Buffer.from(loc, 'hex');
        if (buf[0] !== 0 && buf[0] !== 1) return null;
        const isLittle = buf[0] === 1;
        const rawType = isLittle ? buf.readUInt32LE(1) : buf.readUInt32BE(1);
        if ((rawType & 0xffff) !== 1) return null;
        const hasSRID = (rawType & 0x20000000) !== 0;
        if (hasSRID && (isLittle ? buf.readUInt32LE(5) : buf.readUInt32BE(5)) !== 4326) return null;
        const offset = 1 + 4 + (hasSRID ? 4 : 0);

        const lng = isLittle ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset);
        const lat = isLittle ? buf.readDoubleLE(offset + 8) : buf.readDoubleBE(offset + 8);
        if (validCoordinates(lat, lng)) return { lat, lng };
      } catch {
        // Unreadable geometry is omitted instead of inventing coordinates.
      }
    }
  }

  return null;
}
