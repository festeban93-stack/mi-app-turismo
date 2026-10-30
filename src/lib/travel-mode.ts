export interface TravelStop { id?: string; spot_id?: string; custom_title?: string; custom_address?: string; day_number: number; order_index?: number; notes?: string; spots?: any }
export interface TravelProgress { completed: number; paused: boolean; finished: boolean; locations: Record<string, { latitude: number; longitude: number }> }
export const freshProgress = (): TravelProgress => ({ completed: 0, paused: false, finished: false, locations: {} });
export function stopKey(stop: TravelStop, index: number) { return `${index}:${stop.day_number}:${stop.spot_id || stop.custom_title || ''}`; }
export function travelSignature(stops: TravelStop[]) { return JSON.stringify(stops.map((s,i) => stopKey(s,i))); }
export function validPoint(p: any): boolean { return p != null && Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)) && p.latitude !== null && p.longitude !== null && p.latitude !== '' && p.longitude !== '' && Math.abs(Number(p.latitude)) <= 90 && Math.abs(Number(p.longitude)) <= 180; }
export function navigationLink(point: { latitude: number; longitude: number }) { return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${point.latitude},${point.longitude}`)}&travelmode=driving`; }
export function restoreProgress(raw: string | null, stops: TravelStop[]): TravelProgress {
  try {
    const saved = JSON.parse(raw || 'null');
    if (saved?.signature !== travelSignature(stops)) return freshProgress();
    const p = saved.progress;
    if (!Number.isInteger(p?.completed) || p.completed < 0 || p.completed > stops.length) return freshProgress();
    return { completed: p.completed, paused: p.paused === true, finished: p.finished === true, locations: Object.fromEntries(Object.entries(p.locations || {}).filter(([,v]) => validPoint(v))) } as TravelProgress;
  } catch { return freshProgress(); }
}
