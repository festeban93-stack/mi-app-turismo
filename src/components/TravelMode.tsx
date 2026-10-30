'use client';
import { useLanguage } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import TravelDestinationCard from './TravelDestinationCard';
import { toggleStop, freshProgress, restoreProgress, travelSignature, stopKey, validPoint, navigationLink, type TravelStop } from '@/lib/travel-mode';
const Picker = dynamic(() => import('./TravelLocationPicker'), {ssr:false});
export default function TravelMode({ trip, stops, userId, onRoute, onExit }: { trip:any; stops:TravelStop[]; userId:string; onRoute:(spots:any[])=>void; onExit:()=>void }) {
  const { t } = useLanguage();
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
  const index = stops.findIndex((s,i) => !progress.checked.includes(stopKey(s,i)));
  const current = stops[index];
  const button='rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-40';
  return <section className="space-y-3" aria-label={t("Modo de viaje")}>
    <h4 className="text-lg font-extrabold">{trip.title}</h4>
    <p className="text-xs text-slate-500">{t("El avance y las ubicaciones elegidas se guardan en este navegador para tu cuenta. No se sincronizan entre dispositivos.")}</p>
    {storageError && <p role="alert" className="text-amber-700 text-sm">{t("El navegador no permite guardar el avance. Se perderá al cerrar la página.")}</p>}
    <progress aria-label={t("Progreso del viaje")} value={progress.completed} max={stops.length} className="w-full accent-emerald-600"/>
    <p className="text-sm">{progress.completed} {t(" de ")}{stops.length} {t(" paradas completadas · ")}{progress.finished ? t("Viaje finalizado") : progress.paused ? t("En pausa") : t("En curso")}</p>
    {current && !progress.finished && <div className="bg-emerald-50 dark:bg-emerald-950 rounded-2xl p-4 space-y-3">
      <p className="text-xs font-bold">{t("Tu próxima parada · Día ")}{current.day_number} · #{index+1}</p>
      <h5 className="font-bold text-lg">{current.custom_title || current.spots?.title}</h5>
      {current.notes && <p className="text-sm whitespace-pre-wrap">{current.notes}</p>}
      {points[index] ? <a className="block rounded-xl bg-emerald-600 p-3 text-white text-center font-bold" target="_blank" rel="noopener noreferrer" href={navigationLink(points[index]!)}>{t("Cómo llegar con Google Maps ↗")}</a> : <p className="text-sm">{t("Esta parada necesita una ubicación. Tocá «Ubicar» en la lista para elegir el punto exacto.")}</p>}
      <button className={button} disabled={progress.paused} onClick={()=>setProgress(p=>toggleStop(p,stops,index))}>{t("✓ Parada completada")}</button>
    </div>}
    {progress.finished && <p className="rounded-xl bg-emerald-50 p-3 text-emerald-800 font-bold">{t("Viaje finalizado. Tu itinerario sigue disponible para editarlo o volver a recorrerlo.")}</p>}
    <div className="flex flex-wrap gap-2">
      {!progress.finished && <button className={button} onClick={()=>setProgress(p=>({...p,paused:!p.paused}))}>{progress.paused ? t("Reanudar") : t("Pausar")}</button>}
      {progress.completed>0 && <button className={button} onClick={()=>setProgress(p=>({...p,checked:p.checked.slice(0,-1),completed:p.checked.length-1,finished:false}))}>{t("Deshacer última parada")}</button>}
      {!progress.finished && <button className={button} onClick={()=>{if(confirm(t("¿Finalizar el viaje aunque queden paradas pendientes?")))setProgress(p=>({...p,finished:true}));}}>{t("Finalizar viaje")}</button>}
      {progress.finished && <button className={button} onClick={()=>{if(confirm(t("¿Reiniciar el avance de este viaje?")))setProgress(p=>({...freshProgress(),locations:p.locations}));}}>{t("Volver a iniciar")}</button>}
      <button className={button} onClick={onExit}>{t("Volver al itinerario")}</button>
    </div>
    <p className="text-xs text-slate-500">{t("Las líneas del mapa conectan las paradas; no representan carreteras ni navegación. Google Maps calcula cómo llegar.")}</p>
    <div className="grid grid-cols-1 gap-4">{stops.map((s,i)=><TravelDestinationCard key={stopKey(s,i)} stop={s} index={i} current={i===index&&!progress.finished} completed={progress.checked.includes(stopKey(s,i))} paused={progress.paused} currency={trip.currency || 'USD'} point={points[i]} userId={userId} tripId={trip.id} onToggle={()=>setProgress(p=>toggleStop(p,stops,i))} onLocate={()=>{setPicking(i);setCandidate(points[i]||undefined);}}/>)}</div>
    {picking!==null && <div className="rounded-xl border p-3 space-y-2"><p className="text-sm font-bold">{t("Ubicación de ")}{stops[picking].custom_title || stops[picking].spots?.title}</p><p className="text-xs">{t("Acercá el mapa y tocá el lugar exacto. Confirmá antes de usarlo para navegar.")}</p><Picker key={picking} point={candidate} onPick={setCandidate}/>{candidate && <p className="text-xs">{candidate.latitude.toFixed(5)}, {candidate.longitude.toFixed(5)}</p>}<button className={button} disabled={!candidate} onClick={()=>{if(candidate)setProgress(p=>({...p,locations:{...p.locations,[stopKey(stops[picking],picking)]:candidate}}));setPicking(null);}}>{t("Confirmar ubicación")}</button><button className={button} onClick={()=>setPicking(null)}>{t("Cancelar")}</button></div>}
  </section>;
}
