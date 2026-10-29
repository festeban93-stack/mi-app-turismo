import { requireCron } from '@/lib/server/access';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const denied = requireCron(request);
  if (denied) return denied;
  return NextResponse.json({ error: 'Importador retirado: requiere fuentes reales y revisión editorial.' }, { status: 410 });
}
