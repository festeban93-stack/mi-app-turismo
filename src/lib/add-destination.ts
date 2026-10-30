import { orderedStops } from './trip-editor';
export interface DestinationInput { spot_id?: string | null; custom_title: string; custom_address?: string; notes?: string }
export function appendDestination(existing: any[], destination: DestinationInput, day: number, cost: number, duration: number) {
  if (!Number.isInteger(day) || day < 1 || day > duration) throw new Error('Elegí un día dentro de la duración del viaje.');
  if (!Number.isFinite(cost) || cost < 0 || cost > 100000000) throw new Error('Revisá el costo estimado.');
  if (existing.length >= 100) throw new Error('El viaje ya tiene 100 paradas.');
  if (destination.spot_id && existing.some(s => s.spot_id === destination.spot_id && s.day_number === day)) throw new Error('Este destino ya está agregado a ese día.');
  const stops = existing.map(s => ({spot_id:s.spot_id || null,custom_title:s.custom_title || s.spots?.title || 'Parada',custom_address:s.custom_address || s.spots?.address_text || '',notes:s.notes || '',day_number:s.day_number,estimated_cost:Number(s.estimated_cost || 0)}));
  return orderedStops([...stops,{spot_id:destination.spot_id || null,custom_title:destination.custom_title,custom_address:destination.custom_address || '',notes:destination.notes || '',day_number:day,estimated_cost:cost}]);
}
