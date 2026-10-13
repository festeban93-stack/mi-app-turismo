import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Las variables de entorno de Supabase no están configuradas correctamente.');
}

// Única instancia compartida para evitar memory leaks y bucles en Auth State
export const supabase = createClient(supabaseUrl, supabaseAnonKey);