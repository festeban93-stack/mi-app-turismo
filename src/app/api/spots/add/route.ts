import { NextResponse } from 'next/server';
import { requireAccess, consumeQuota, serviceClient } from '@/lib/server/access';
import { BodyError, readJSON } from '@/lib/server/body';
import { pendingSpot } from '@/lib/server/spots';

export async function POST(request: Request) {
  const access = await requireAccess(request);
  if (access instanceof Response) return access;
  try {
    const body = await readJSON(request);
    const spot = pendingSpot(body);
    const imagePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/spot-images/uploads/${access.user.id}/`;
    if (!spot.image_url?.startsWith(imagePrefix)) throw new BodyError('Subí una fotografía desde tu cuenta.');
    const denied = await consumeQuota(access.user.id, 'spot');
    if (denied) return denied;
    const { data, error } = await serviceClient().from('spots').insert(spot).select('id,title,verification_status').single();
    if (error) throw error;
    return NextResponse.json({ success: true, spot: data, message: 'Destino enviado a revisión. Aparecerá en el mapa cuando sea aprobado.' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof BodyError ? error.message : 'No fue posible guardar el destino.' }, { status: error instanceof BodyError ? error.status : 503 });
  }
}
