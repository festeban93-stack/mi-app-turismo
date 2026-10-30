'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { freshProgress, restoreProgress, travelSignature, stopKey, validPoint, navigationLink, type TravelStop } from '@/lib/travel-mode';
const Picker = dynamic(() => import('./TravelLocationPicker'), {ssr:false});
export default function TravelMode({ trip, stops, userId, onRoute, onExit }: { trip:any; stops:TravelStop[]; userId:string; onRoute:(spots:any[])=>void; onExit:()=>void }) {
  const key = `mapai:travel:${userId}:${trip.id}`;
  const [progress,setProgress] = useState(() => { try { return restoreProgress(localStorage.getItem(key),stops); } catch { return freshProgress(); } });
  const [storageError,setStorageError] = useState(false);
  const [picking,setPicking] = useState<number|null>(null);
  const [candidate,setCandidate] = useState<{latitude:number;longitude:number}|undefined>();
  const points = stops.map((s,i) => progress.locations[stopKey(s,i)] || (validPoint(s.spots) ? {latitude:Number(s.spots.latitude),longitude:Number(s.spots.longitude)} : null));
  const signature = travelSignature(stops);
  useEffect(() => {
    try { localStorage.setItem(key,JSON.stringify({signature,progress})); } catch { queueMicrotask(() => setStorageError(true)); }
  },[key,signature,progress]);
  useEffect(() => {
    onRoute(stops.flatMap((s,i) => points[i] ? [{ ...points[i], id:`travel-${i}`,title:s.custom_title || s.spots?.title || 'Parada', address_text:s.custom_address, routeNumber:i+1 }] : []));
    // Route changes only when the selected trip or its pinned locations change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[stops,progress.locations]);
  const index = progress.completed;
  const current = stops[index];
  const button='rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-40';
  return <section className="space-y-3" aria-label="Modo de viaje">
    <h4 className="text-lg font-extrabold">{trip.title}</h4>
    <p className="text-xs text-slate-500">El avance y las ubicaciones elegidas se guardan en este navegador para tu cuenta. No se sincronizan entre dispositivos.</p>
    {storageError && <p role="alert" className="text-amber-700 text-sm">El navegador no permite guardar el avance. Se perderá al cerrar la página.</p>}
    <progress aria-label="Progreso del viaje" value={index} max={stops.length} className="w-full accent-emerald-600"/>
    <p className="text-sm">{index} de {stops.length} paradas completadas · {progress.finished ? 'Viaje finalizado' : progress.paused ? 'En pausa' : 'En curso'}</p>
    {current && !progress.finished && <div className="bg-emerald-50 dark:bg-emerald-950 rounded-2xl p-4 space-y-3">
      <p className="text-xs font-bold">Tu próxima parada · Día {current.day_number} · #{index+1}</p>
      <h5 className="font-bold text-lg">{current.custom_title || current.spots?.title}</h5>
      {current.notes && <p className="text-sm whitespace-pre-wrap">{current.notes}</p>}
      {points[index] ? <a className="block rounded-xl bg-emerald-600 p-3 text-white text-center font-bold" target="_blank" rel="noopener noreferrer" href={navigationLink(points[index]!)}>Cómo llegar con Google Maps ↗</a> : <p className="text-sm">Esta parada necesita una ubicación. Tocá «Ubicar» en la lista para elegir el punto exacto.</p>}
      <button className={button} disabled={progress.paused} onClick={()=>setProgress(p=>({...p,completed:p.completed+1,finished:p.completed+1===stops.length}))}>✓ Parada completada</button>
    </div>}
    {progress.finished && <p className="rounded-xl bg-emerald-50 p-3 text-emerald-800 font-bold">Viaje finalizado. Tu itinerario sigue disponible para editarlo o volver a recorrerlo.</p>}
    <div className="flex flex-wrap gap-2">
      {!progress.finished && <button className={button} onClick={()=>setProgress(p=>({...p,paused:!p.paused}))}>{progress.paused ? 'Reanudar' : 'Pausar'}</button>}
      {index>0 && <button className={button} onClick={()=>setProgress(p=>({...p,completed:p.completed-1,finished:false}))}>Deshacer última parada</button>}
      {!progress.finished && <button className={button} onClick={()=>{if(confirm('¿Finalizar el viaje aunque queden paradas pendientes?'))setProgress(p=>({...p,finished:true}));}}>Finalizar viaje</button>}
      {progress.finished && <button className={button} onClick={()=>{if(confirm('¿Reiniciar el avance de este viaje?'))setProgress(p=>({...freshProgress(),locations:p.locations}));}}>Volver a iniciar</button>}
      <button className={button} onClick={onExit}>Volver al itinerario</button>
    </div>
    <p className="text-xs text-slate-500">Las líneas del mapa conectan las paradas; no representan carreteras ni navegación. Google Maps calcula cómo llegar.</p>
    <ol className="space-y-2">{stops.map((s,i)=><li key={stopKey(s,i)} className={`rounded-xl border p-3 text-sm ${i===index&&!progress.finished?'border-emerald-600 bg-emerald-50 dark:bg-emerald-950':''}`}><strong>{i<index?'✓ ':''}{i+1}. {s.custom_title || s.spots?.title}</strong><p>Día {s.day_number}{!points[i]?' · Sin ubicación':''}</p><button className="text-emerald-700 underline" onClick={()=>{setPicking(i);setCandidate(points[i]||undefined);}}>{points[i]?'Ajustar ubicación':'Ubicar en el mapa'}</button></li>)}</ol>
    {picking!==null && <div className="rounded-xl border p-3 space-y-2"><p className="text-sm font-bold">Ubicación de {stops[picking].custom_title || stops[picking].spots?.title}</p><p className="text-xs">Acercá el mapa y tocá el lugar exacto. Confirmá antes de usarlo para navegar.</p><Picker key={picking} point={candidate} onPick={setCandidate}/>{candidate && <p className="text-xs">{candidate.latitude.toFixed(5)}, {candidate.longitude.toFixed(5)}</p>}<button className={button} disabled={!candidate} onClick={()=>{if(candidate)setProgress(p=>({...p,locations:{...p.locations,[stopKey(stops[picking],picking)]:candidate}}));setPicking(null);}}>Confirmar ubicación</button><button className={button} onClick={()=>setPicking(null)}>Cancelar</button></div>}
  </section>;
}
