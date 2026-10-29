import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://unconfigured.invalid';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'unconfigured';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Las variables de entorno de Supabase no están configuradas correctamente.');
}

// Única instancia compartida para evitar memory leaks y bucles en Auth State
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
