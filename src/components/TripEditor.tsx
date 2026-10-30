'use client';
import { useLanguage } from '@/lib/i18n';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { EditableStop, moveStop, orderedStops, validateTripDraft } from '@/lib/trip-editor';

interface TripEditorProps {
  trip: any;
  initialStops: any[];
  onCancel: () => void;
  onSaved: (trip: any, stops: any[]) => void;
}
const field = 'w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:bg-slate-900 dark:text-white dark:border-slate-600';
const button = 'rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold disabled:opacity-40';

export default function TripEditor({ trip, initialStops, onCancel, onSaved }: TripEditorProps) {
  const { t, language } = useLanguage();
  const [title, setTitle] = useState(trip.title || '');
  const [duration, setDuration] = useState(trip.duration_days || 2);
  const [notes, setNotes] = useState(trip.notes || '');
  const [budget, setBudget] = useState(trip.budget_limit == null ? '' : String(trip.budget_limit));
  const [currency, setCurrency] = useState(trip.currency || 'USD');
  const [stops, setStops] = useState<EditableStop[]>(() => initialStops.map(s => ({
    spot_id: s.spot_id || null, custom_title: s.custom_title || s.spots?.title || '',
    custom_address: s.custom_address || s.spots?.address_text || '',
    day_number: s.day_number, estimated_cost: Number(s.estimated_cost || 0), notes: s.notes || '', spots: s.spots,
  })));
  const [catalog, setCatalog] = useState<any[]>([]);
  const [catalogError, setCatalogError] = useState('');
  const [query, setQuery] = useState('');
  const [addDay, setAddDay] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/spots', { signal: controller.signal }).then(async r => {
      if (!r.ok) throw new Error();
      const data = await r.json();
      setCatalog(data.spots || []);
    }).catch(() => { if (!controller.signal.aborted) setCatalogError('No se pudo cargar el catálogo. Podés agregar una parada personalizada.'); });
    return () => controller.abort();
  }, []);
  const total = stops.reduce((sum, s) => sum + (Number.isFinite(s.estimated_cost) ? s.estimated_cost : 0), 0);
  const money = (value: number) => new Intl.NumberFormat(language === 'en' ? 'en-US' : 'es-CR', { style: 'currency', currency }).format(value);
  const updateStop = (index: number, patch: Partial<EditableStop>) => setStops(prev => orderedStops(prev.map((s, i) => i === index ? { ...s, ...patch } : s)));
  const append = (spot?: any) => setStops(prev => orderedStops([...prev, {
    spot_id: spot?.id || null, custom_title: spot?.title || '', custom_address: spot?.address_text || '',
    day_number: Math.max(1, Math.min(addDay, duration || 1)), estimated_cost: 0, notes: '', spots: spot || null,
  }]));
  async function save() {
    const invalid = validateTripDraft(duration, stops);
    if (invalid) { setError(invalid); return; }
    if (!title.trim() || title.trim().length > 200) { setError(t("Ingresá un nombre de hasta 200 caracteres.")); return; }
    if (budget !== '' && (!Number.isFinite(Number(budget)) || Number(budget) < 0 || Number(budget) > 100000000)) {
      setError(t("Revisá el presupuesto disponible.")); return;
    }
    setSaving(true); setError('');
    try {
      const { data, error: saveError } = await supabase.rpc('update_trip_with_stops', {
        p_trip_id: trip.id, p_expected_version: trip.edit_version ?? 0,
        p_title: title.trim(), p_duration_days: duration, p_notes: notes,
        p_budget_limit: budget === '' ? null : Number(budget), p_currency: currency,
        p_stops: orderedStops(stops).map(s => ({ spot_id: s.spot_id, custom_title: s.custom_title, custom_address: s.custom_address, day_number: s.day_number, estimated_cost: s.estimated_cost, notes: s.notes })),
      });
      if (saveError) {
        if (saveError.message.includes('TRIP_CONFLICT')) throw new Error('Este viaje cambió en otra sesión. Cancelá y volvé a abrirlo para cargar la versión actual.');
        if (saveError.code === 'PGRST202') throw new Error('Falta ejecutar la actualización de itinerarios en el SQL Editor de Supabase.');
        throw new Error('No se pudo guardar. Tus cambios siguen en este editor; revisá la conexión e intentá de nuevo.');
      }
      if (!data?.id) throw new Error('El servidor no confirmó el guardado.');
      onSaved({ ...trip, title: title.trim(), duration_days: duration, notes, budget_limit: budget === '' ? null : Number(budget), currency, edit_version: data.edit_version }, orderedStops(stops));
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el viaje.'); }
    finally { setSaving(false); }
  }
  return <form onSubmit={e => { e.preventDefault(); void save(); }} className="space-y-4">
    <fieldset disabled={saving} className="space-y-4 disabled:opacity-60">
      <h4 className="font-bold">{t("Editar viaje")}</h4>
      <label className="block text-xs font-bold">{t("Nombre del viaje")}<input className={field} value={title} maxLength={200} onChange={e => setTitle(e.target.value)} required /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-bold">{t("Duración en días")}<input type="number" min={1} max={30} required className={field} value={duration} onChange={e => setDuration(Number(e.target.value))} /></label>
        <label className="text-xs font-bold">{t("Moneda")}<select className={field} value={currency} onChange={e => setCurrency(e.target.value)}><option value="USD">{t("Dólares (USD)")}</option><option value="CRC">{t("Colones (CRC)")}</option></select></label>
      </div>
      <label className="block text-xs font-bold">{t("Presupuesto disponible (opcional)")}<input className={field} type="number" min={0} max={100000000} step="0.01" value={budget} onChange={e => setBudget(e.target.value)} placeholder={t("Sin límite definido")} /></label>
      <p className="text-xs text-slate-500">{t("Todos los costos usan la moneda elegida. Cambiarla no convierte los importes.")}</p>
      <label className="block text-xs font-bold">{t("Notas e información del viaje")}<textarea className={field} rows={3} maxLength={5000} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t("Reservas, equipaje, contactos, recordatorios…")} /></label>
      <p className="text-sm font-bold">{t("Costo estimado: ")}{money(total)}</p>
      {budget !== '' && total > Number(budget) && <p className="text-xs text-amber-700">{t("La suma de las paradas supera tu presupuesto en ")}{money(total - Number(budget))}.</p>}
      <p className="text-xs text-slate-500">{t("Podés incluir varias paradas por día. Usá las flechas para ordenar las visitas dentro del mismo día.")}</p>
      {stops.map((stop, index) => <section key={index} aria-label={t(`Parada ${index + 1}`)} className="rounded-xl border border-slate-200 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-bold">{t("Día")}<input aria-label={t(`Día de parada ${index + 1}`)} className={field} type="number" min={1} max={30} required value={stop.day_number} onChange={e => updateStop(index, { day_number: Number(e.target.value) })} /></label>
          <div className="flex gap-1">
            <button type="button" className={button} aria-label={`Subir parada ${index + 1}`} disabled={!index || stops[index - 1].day_number !== stop.day_number} onClick={() => setStops(moveStop(stops, index, -1))}>↑</button>
            <button type="button" className={button} aria-label={`Bajar parada ${index + 1}`} disabled={!stops[index + 1] || stops[index + 1].day_number !== stop.day_number} onClick={() => setStops(moveStop(stops, index, 1))}>↓</button>
            <button type="button" className={button} onClick={() => setStops(stops.filter((_, i) => i !== index))}>{t("Quitar")}</button>
          </div>
        </div>
        {stop.day_number > duration && <p className="text-xs text-red-600">{t("Esta parada queda fuera de los ")}{duration} {t(" días. Reasignala.")}</p>}
        <label className="block text-xs">{t("Nombre")}<input required className={field} maxLength={200} value={stop.custom_title} onChange={e => updateStop(index, { custom_title: e.target.value })} /></label>
        {stop.spot_id && <p className="text-xs text-slate-500">{t("Destino vinculado: ")}{stop.spots?.title || t("Catálogo")}{t(". El nombre y las notas no cambian su ubicación en el mapa.")}</p>}
        <label className="block text-xs">{t("Dirección o referencia")}<input className={field} maxLength={500} value={stop.custom_address} onChange={e => updateStop(index, { custom_address: e.target.value })} /></label>
        <label className="block text-xs">{t("Costo estimado (")}{currency})<input className={field} type="number" min={0} max={100000000} step="0.01" required value={stop.estimated_cost} onChange={e => updateStop(index, { estimated_cost: Number(e.target.value) })} /></label>
        <label className="block text-xs">{t("Notas de esta parada")}<textarea className={field} maxLength={5000} value={stop.notes} onChange={e => updateStop(index, { notes: e.target.value })} /></label>
      </section>)}
      <section className="rounded-xl bg-emerald-50 p-3 space-y-2 dark:bg-emerald-950">
        <h5 className="text-sm font-bold">{t("Agregar parada")}</h5>
        <label className="block text-xs">{t("Día de la nueva parada")}<input className={field} type="number" min={1} max={duration || 30} value={addDay} onChange={e => setAddDay(Number(e.target.value))} /></label>
        <input aria-label={t("Buscar destino")} className={field} placeholder={t("Buscar un destino del catálogo…")} value={query} onChange={e => setQuery(e.target.value)} />
        {catalogError && <p className="text-xs" role="status">{catalogError}</p>}
        {query.trim() && <div className="max-h-36 overflow-y-auto">{catalog.filter(s => s.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 12).map(s => <button key={s.id} type="button" className="block w-full text-left text-sm p-2 hover:bg-emerald-100" disabled={stops.length >= 100} onClick={() => { append(s); setQuery(''); }}>+ {s.title}</button>)}</div>}
        <button type="button" className={button} disabled={stops.length >= 100} onClick={() => append()}>{t("+ Parada personalizada")}</button>
        <p className="text-xs text-slate-500">{t("Las paradas personalizadas quedan en el itinerario. Para trazarlas en el mapa, agregá un destino del catálogo con ubicación.")}</p>
      </section>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-600">{t(error)}</p>}
    <div className="sticky bottom-0 bg-white dark:bg-slate-950 py-3 flex gap-2 border-t">
      <button type="button" className={button} disabled={saving} onClick={onCancel}>{t("Cancelar")}</button>
      <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-emerald-600 text-white font-bold p-2 disabled:opacity-50">{saving ? t("Guardando…") : t("Guardar cambios")}</button>
    </div>
  </form>;
}
