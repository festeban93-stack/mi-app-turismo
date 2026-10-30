import { supabase } from './supabase';

export interface TripStop {
  spot_id?: string | number | null;
  custom_title?: string | null;
  custom_address?: string | null;
  day_number: number;
  order_index: number;
  estimated_cost: number;
}
export async function saveTrip(input: {
  title: string;
  durationDays: number;
  stops: TripStop[];
  emails?: string[];
  aiPrompt?: string;
}) {
  const { data, error } = await supabase.rpc('create_trip_with_stops', {
    p_title: input.title, p_duration_days: input.durationDays,
    p_stops: input.stops, p_emails: input.emails || [],
    p_ai_prompt: input.aiPrompt || null,
  });
  if (error) throw new Error('No fue posible guardar el viaje completo. Intentá nuevamente; si persiste, contactá soporte.');
  if (!data?.id) throw new Error('El servidor no confirmó el guardado del viaje.');
  return data;
}
