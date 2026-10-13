import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Variables de Supabase no configuradas en Vercel', 
        spots: [] 
      }, { status: 200 });
    }

    const supabase = createClient(supabaseUrl, anonKey);
    const { data, error } = await supabase
      .from('spots')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message, spots: [] }, { status: 200 });
    }

    return NextResponse.json({ success: true, spots: data || [] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Error de servidor', spots: [] }, { status: 200 });
  }
}