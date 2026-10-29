import { NextResponse } from 'next/server';
import { requireAccess } from '@/lib/server/access';

export async function GET(request: Request) {
  const access = await requireAccess(request, true);
  if (access instanceof Response) return access;
  const { data, error } = await access.db.from('spots')
    .select('id,title,description,address_text,location,image_url,source_type,opening_hours,entry_fee')
    .eq('verification_status', 'pending').order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: 'No fue posible cargar la cola de revisión.' }, { status: 503 });
  return NextResponse.json({ spots: data }, { headers: { 'Cache-Control': 'no-store' } });
}
