import { BodyError } from './body';

const categories = ['gastronomia', 'naturaleza', 'aventura', 'cultura', 'hospedaje'];
function text(value: unknown, fallback: string, max: number) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string' || value.length > max) throw new BodyError('Texto inválido o demasiado largo.');
  return value.trim() || fallback;
}
export function validCoordinates(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}
export function pendingSpot(body: Record<string, unknown>, source = 'crowdsource') {
  if (!body || typeof body !== 'object') throw new BodyError('Destino inválido.');
  const title = text(body.title, '', 200);
  const lat = typeof body.latitude === 'number' || typeof body.latitude === 'string' && body.latitude.trim() ? Number(body.latitude) : NaN;
  const lng = typeof body.longitude === 'number' || typeof body.longitude === 'string' && body.longitude.trim() ? Number(body.longitude) : NaN;
  if (!title || !validCoordinates(lat, lng)) throw new BodyError('Título o coordenadas inválidos.');
  const image = text(body.image_url, '', 2048);
  if (image) {
    try { if (new URL(image).protocol !== 'https:') throw new Error(); }
    catch { throw new BodyError('La imagen debe ser una dirección HTTPS válida.'); }
  }
  return {
    title, description: text(body.description, 'Destino pendiente de revisión.', 5000),
    category: categories.includes(String(body.category)) ? String(body.category) : 'naturaleza',
    location: `SRID=4326;POINT(${lng} ${lat})`,
    address_text: text(body.address_text, 'Costa Rica', 500),
    opening_hours: text(body.opening_hours, 'Sin confirmar', 500),
    entry_fee: text(body.entry_fee, 'Sin confirmar', 200),
    image_url: image || null,
    explorer_nickname: text(body.explorer_nickname, 'Explorador Anónimo', 100),
    source_type: source, is_verified: false, verification_status: 'pending',
  };
}
