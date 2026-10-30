import { GET as getSpots } from '../spots/route';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const response = await getSpots();
  if (!response.ok) return response;
  const { spots } = await response.json();
  const params = new URL(request.url).searchParams;
  const category = params.get('category');
  const region = params.get('region');
  const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const places = spots.filter((spot: Record<string, string>) =>
    (!category || category === 'Todas' || normalized(spot.category) === normalized(category)) &&
    (!region || region === 'Todas' || normalized(spot.address_text || '').includes(normalized(region)))
  ).map((spot: Record<string, unknown>) => ({
    id: spot.id, name: spot.title, region: spot.address_text, category: spot.category,
    short_description: spot.description, tags: [], estimated_price_usd: null, rating: null,
    location: { type: 'Point', coordinates: [spot.longitude, spot.latitude] },
  }));
  return NextResponse.json(places, { headers: { 'Cache-Control': 'no-store' } });
}
