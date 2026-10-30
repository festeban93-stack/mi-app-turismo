'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { appendDestination, type DestinationInput } from '@/lib/add-destination';
export default function AddDestinationToTrip({userId,destination,excludeTripId}:{userId:string;destination:DestinationInput;excludeTripId?:string}) {
  const [open,setOpen]=useState(false);
  const [trips,setTrips]=useState<any[]>([]);
  const [tripId,setTripId]=useState('');
  const [day,setDay]=useState(1);
  const [cost,setCost]=useState('0');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const selected=trips.find(t=>t.id===tripId);
  async function show() {
    setOpen(true);setBusy(true);setMessage('');
    try {
      const {data,error}=await supabase.from('trips').select('*').eq('owner_id',userId).order('created_at',{ascending:false});
      if(error)throw Error('No se pudieron cargar tus viajes.');
      setTrips((data || []).filter(t=>t.id!==excludeTripId));setTripId('');
    }catch(e){setMessage(e instanceof Error?e.message:'No se pudieron cargar tus viajes.');}finally{setBusy(false);}
  }
  async function add() {
    if(!selected||busy)return;
    setBusy(true);setMessage('');
    try {
      const tripResult=await supabase.from('trips').select('*').eq('id',tripId).eq('owner_id',userId).single();
      if(tripResult.error)throw Error('No se pudo cargar el viaje. Reintentá.');
      const stopResult=await supabase.from('trip_spots').select('*,spots(title,address_text)').eq('trip_id',tripId).order('day_number').order('order_index');
      if(stopResult.error)throw Error('No se pudo cargar el viaje. Reintentá.');
      const trip=tripResult.data;
      const stops=appendDestination(stopResult.data || [],destination,day,Number(cost),trip.duration_days);
      const {data,error}=await supabase.rpc('update_trip_with_stops',{
        p_trip_id:trip.id,p_expected_version:trip.edit_version ?? 0,p_title:trip.title,p_duration_days:trip.duration_days,
        p_notes:trip.notes || '',p_budget_limit:trip.budget_limit,p_currency:trip.currency || 'USD',p_stops:stops,
      });
      if(error)throw Error(error.message.includes('TRIP_CONFLICT')?'El viaje cambió durante el guardado. Intentá de nuevo.':'No se pudo agregar el destino. El viaje anterior se conserva.');
      if(!data?.id)throw Error('No se confirmó el guardado.');
      setOpen(false);setMessage(`Agregado a «${trip.title}», día ${day}.`);
    }catch(e){setMessage(e instanceof Error?e.message:'No se pudo agregar.');}finally{setBusy(false);}
  }
  return <div className="space-y-2">
    {!open && <button type="button" className="min-h-11 w-full rounded-xl border border-emerald-600 px-3 py-2 text-sm font-bold text-emerald-700 dark:text-emerald-300" onClick={()=>void show()}>＋ {excludeTripId?'Agregar a otro viaje':'Agregar a un viaje'}</button>}
    {open && <div className="rounded-xl border p-3 space-y-3">
      <p className="text-sm font-bold">¿A qué viaje querés agregarlo?</p>
      {busy && !trips.length && <p role="status">Cargando…</p>}
      {!busy&&!trips.length&&<p className="text-sm">No hay viajes propios disponibles. Creá uno desde «Crear Viaje».</p>}
      <label className="block text-xs">Viaje<select disabled={busy} value={tripId} onChange={e=>{setTripId(e.target.value);setDay(1);setMessage('');}} className="w-full rounded-lg border bg-white p-2 text-slate-900"><option value="">Elegí un viaje</option>{trips.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
      {selected&&<><label className="block text-xs">Día<select disabled={busy} className="w-full rounded-lg border bg-white p-2 text-slate-900" value={day} onChange={e=>setDay(Number(e.target.value))}>{Array.from({length:selected.duration_days},(_,i)=><option key={i} value={i+1}>Día {i+1}</option>)}</select></label><label className="block text-xs">Costo estimado ({selected.currency || 'USD'})<input disabled={busy} type="number" min={0} max={100000000} step="0.01" value={cost} onChange={e=>setCost(e.target.value)} className="w-full rounded-lg border bg-white p-2 text-slate-900"/></label><p className="text-xs text-slate-500">Se agrega al final del día elegido. Podés cambiar el orden en «Editar viaje». No se elimina de otros viajes.</p></>}
      <div className="flex gap-2"><button disabled={busy||!selected} className="min-h-11 rounded-lg bg-emerald-600 p-2 text-sm font-bold text-white disabled:opacity-40" onClick={()=>void add()}>{busy?'Guardando…':'Agregar destino'}</button><button disabled={busy} className="min-h-11 p-2 text-sm" onClick={()=>{setOpen(false);setMessage('');}}>Cancelar</button></div>
    </div>}
    {message&&<p role="status" className="text-sm">{message}</p>}
  </div>;
}
