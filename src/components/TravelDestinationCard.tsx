'use client';
import {useState} from 'react';
import {MapPin,Check} from 'lucide-react';
import AddDestinationToTrip from './AddDestinationToTrip';
import {navigationLink,type TravelStop} from '@/lib/travel-mode';
export default function TravelDestinationCard({stop,index,current,completed,paused,currency,point,onToggle,onLocate,userId,tripId}:{stop:TravelStop;index:number;current:boolean;completed:boolean;paused:boolean;currency:string;point:{latitude:number;longitude:number}|null;onToggle:()=>void;onLocate:()=>void;userId:string;tripId:string}) {
 const [failed,setFailed]=useState(false);
 const title=stop.custom_title || stop.spots?.title || 'Parada';
 const photo=stop.spots?.image_url;
 const image=typeof photo==='string'&&/^https?:\/\//.test(photo)?photo:null;
 return <article className={`overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-900 ${current?'border-emerald-600 ring-2 ring-emerald-600/15':'border-slate-200 dark:border-slate-700'}`}>
   <div className="relative h-40 bg-emerald-50 dark:bg-slate-800">
    {image&&!failed?<img src={image} alt={title} loading="lazy" className="h-full w-full object-cover" onError={()=>setFailed(true)}/>:<div className="flex h-full items-center justify-center gap-2 text-emerald-800 dark:text-emerald-200"><MapPin aria-hidden size={28}/><span className="text-xs">Fotografía no disponible</span></div>}
    <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-3 py-1 text-xs font-extrabold text-emerald-900">Día {stop.day_number} · Destino {index+1}</span>
    <button type="button" role="checkbox" aria-checked={completed} aria-label={`${completed?'Desmarcar':'Completar'} ${title}`} disabled={paused} onClick={onToggle} className={`absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white shadow-md disabled:opacity-40 ${completed?'bg-emerald-600 text-white':'bg-white/95 text-slate-500'}`}><Check size={25}/></button>
    {current&&<span className="absolute bottom-3 left-3 rounded-lg bg-emerald-700 px-2 py-1 text-xs font-bold text-white">Tu próxima parada</span>}
   </div>
   <div className="space-y-3 p-4">
    <div><p className="text-[10px] uppercase tracking-wider text-slate-500">{stop.spots?.category || 'Parada personalizada'}{completed?' · Completada':''}</p><h5 className="text-lg font-bold">{title}</h5></div>
    <p className="text-sm text-slate-500">{stop.custom_address || stop.spots?.address_text || 'Sin dirección confirmada'}</p>
    {stop.spots?.description&&<p className="line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{stop.spots.description}</p>}
    {stop.notes&&<p className="whitespace-pre-wrap text-sm">{stop.notes}</p>}
    <p className="border-t pt-3 text-sm font-bold">{Number(stop.estimated_cost)>0?`Estimado: ${new Intl.NumberFormat('es-CR',{style:'currency',currency}).format(Number(stop.estimated_cost))}`:'Sin costo estimado'}</p>
    {point?<a href={navigationLink(point)} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white">Cómo llegar · Maps ↗</a>:<p className="text-xs text-amber-700">Confirmá la ubicación para ver cómo llegar.</p>}
    <button className="min-h-11 w-full text-sm font-bold text-emerald-700 dark:text-emerald-300" onClick={onLocate}>{point?'Ajustar ubicación':'Ubicar en el mapa'}</button>
    <AddDestinationToTrip userId={userId} excludeTripId={tripId} destination={{spot_id:stop.spot_id,custom_title:title,custom_address:stop.custom_address,notes:stop.notes}}/>
   </div>
 </article>;
}
