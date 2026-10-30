export interface EditableStop {
  spot_id: string | null;
  custom_title: string;
  custom_address: string;
  day_number: number;
  estimated_cost: number;
  notes: string;
  spots?: { id: string; title: string; [key: string]: unknown } | null;
}

export function orderedStops<T extends { day_number: number }>(stops: T[]): T[] {
  // Stable sort preserves the user-selected order within each day.
  return [...stops].sort((a, b) => a.day_number - b.day_number);
}
export function validateTripDraft(duration: number, stops: EditableStop[]): string | null {
  if (!Number.isInteger(duration) || duration < 1 || duration > 30) return 'Elegí una duración de 1 a 30 días.';
  if (stops.length < 1 || stops.length > 100) return 'Agregá entre 1 y 100 paradas.';
  if (stops.some(s => !Number.isInteger(s.day_number) || s.day_number < 1 || s.day_number > duration))
    return 'Hay paradas fuera de la duración elegida. Cambiá su día antes de guardar.';
  if (stops.some(s => !s.custom_title.trim() || s.custom_title.trim().length > 200)) return 'Cada parada necesita un nombre de hasta 200 caracteres.';
  if (stops.some(s => !Number.isFinite(s.estimated_cost) || s.estimated_cost < 0 || s.estimated_cost > 100000000))
    return 'Los costos deben ser números entre 0 y 100.000.000.';
  if (stops.some(s => s.notes.length > 5000 || s.custom_address.length > 500)) return 'Revisá la longitud de las notas o direcciones.';
  return null;
}
export function moveStop<T extends { day_number: number }>(stops: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (!stops[target] || stops[target].day_number !== stops[index].day_number) return stops;
  const next = [...stops];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
