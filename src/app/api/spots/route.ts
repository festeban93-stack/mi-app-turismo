import { coordinatesForSpot } from '@/lib/server/coordinates';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Variables de entorno no configuradas', 
        spots: [] 
      }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false }
    });

    const { data, error } = await supabase
      .from('spots')
      .select('id,title,description,category,location,address_text,opening_hours,entry_fee,image_url,is_verified,verification_status,source_type')
      .eq('is_verified', true)
      .eq('verification_status', 'approved')
      .order('created_at', { ascending: false }).limit(1000);

    if (error) {
      return NextResponse.json({ success: false, error: 'No fue posible cargar destinos.', spots: [] }, { status: 503 });
    }

    // Transformar registros para garantizar latitud y longitud numéricas
    const processedSpots = (data || []).map((spot: any) => {
      const coords = coordinatesForSpot(spot);
      if (!coords) return null;
      return {
        ...spot,
        latitude: coords.lat,
        longitude: coords.lng,
      };
    }).filter(Boolean);

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
  } catch {
    return NextResponse.json({ success: false, error: 'No fue posible cargar destinos.', spots: [] }, { status: 503 });
  }
}
