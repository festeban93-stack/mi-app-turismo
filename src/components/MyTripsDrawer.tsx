'use client';
import { useLanguage } from '@/lib/i18n';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import TripEditor from './TripEditor';
import TravelMode from './TravelMode';
import { 
  X, 
  Route, 
  Calendar, 
  DollarSign, 
  Share2, 
  Printer, 
  Trash2, 
  CheckCircle2, 
  Compass,
  Bot,
  UserCheck
} from 'lucide-react';

interface MyTripsDrawerProps {
  onTravelLayoutChange?: (layout: 'none' | 'split' | 'map') => void;
  availableSpots?: any[];
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onApplyTripToMap: (routeSpots: any[]) => void;
}

export default function MyTripsDrawer({
  isOpen,
  availableSpots = [],
  onTravelLayoutChange,
  onClose,
  currentUser,
  onApplyTripToMap
}: MyTripsDrawerProps) {
  const { t, language } = useLanguage();
  const [mapOnly,setMapOnly] = useState(false);
  const [travelStops, setTravelStops] = useState<any[] | null>(null);
  const detailRequest = useRef(0);
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
  const [tripSpots, setTripSpots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const [detailError, setDetailError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const [previousUser, setPreviousUser] = useState(currentUser?.id);
  if (previousUser !== currentUser?.id) { setPreviousUser(currentUser?.id); setSelectedTrip(null); setTripSpots([]); setTrips([]); setTravelStops(null); setEditing(false); }

  useEffect(() => { onTravelLayoutChange?.(isOpen && travelStops ? (mapOnly ? 'map' : 'split') : 'none'); }, [isOpen,travelStops,mapOnly,onTravelLayoutChange]);

  const [previousOpen, setPreviousOpen] = useState(isOpen);
  if (previousOpen !== isOpen) { setPreviousOpen(isOpen); if (isOpen) setLoading(true); }

  async function fetchUserTrips() {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error cargando viajes:', err);

    }
  };


  useEffect(() => {
    if (isOpen && currentUser) {
      let active = true;
      fetchUserTrips().then(data => { if (active) { if (data) setTrips(data); setLoading(false); } });
      return () => { active = false; };
    }
  }, [isOpen, currentUser]);


  const handleSelectTrip = async (trip: any) => {
    const request = ++detailRequest.current;
    setMapOnly(false); setTravelStops(null); setEditing(false); setNotice(''); setDetailError(''); setTripSpots([]);
    setSelectedTrip(trip);
    setLoading(true);
    try {
      const metadata = await supabase.from('trips').select('*').eq('id', trip.id).single();
      if (metadata.error) throw metadata.error;
      const details = await supabase.from('trip_spots').select('*, spots(*)').eq('trip_id', trip.id)
        .order('day_number', { ascending: true }).order('order_index', { ascending: true });
      if (request !== detailRequest.current) return;
      const { data, error } = details;

      setSelectedTrip(metadata.data);

      if (error) throw error;
      if (data) {
        setTripSpots(data);
        const route = data.filter(d => d.spots).map(d => d.spots);
        onApplyTripToMap(route);
      }
    } catch (err) {
      console.error('Error cargando detalles del viaje:', err);
      if (request !== detailRequest.current) return;
      setDetailError(t("No se pudieron cargar las paradas. Volvé a abrir el viaje."));
    } finally {
      if (request === detailRequest.current) setLoading(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleShareTrip = () => {
    if (!selectedTrip) return;
    const shareUrl = `${window.location.origin}/explore?tripId=${selectedTrip.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (!isOpen || !currentUser) return null;

  const totalCost = tripSpots.reduce((sum, item) => sum + (parseFloat(item.estimated_cost) || 0), 0);

  return (
    <div className={`fixed right-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl p-4 md:p-5 flex flex-col justify-between overflow-y-auto animate-fade-in text-slate-900 dark:text-slate-100 select-none ${travelStops ? (mapOnly ? 'h-20 md:h-auto md:top-0' : 'h-[62dvh] md:h-auto md:top-0 rounded-t-3xl md:rounded-none') : 'top-0'}`}>
      
      {travelStops && <button className="sticky top-0 z-10 mb-3 min-h-11 rounded-xl bg-emerald-600 p-2 text-sm font-bold text-white md:hidden" onClick={()=>setMapOnly(v=>!v)}>{mapOnly?t("Ver tarjetas del viaje ↑"):t("Ver mapa completo ↓")}</button>}
      {/* Header */}
      <div className={travelStops && mapOnly ? 'hidden md:block' : ''}>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold">{t("Mis Itinerarios de Viaje")}</h3>
              <p className="text-[10px] text-slate-500">{t("Manuales e Inteligencia Artificial")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de Viajes */}
        <div className="pt-3 space-y-2">
          {!selectedTrip ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t("Tus Viajes Guardados")}</label>
              {trips.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">{t("Aún no tenés viajes guardados.")}</p>
              ) : (
                trips.map(savedTrip => (
                  <div
                    key={savedTrip.id}
                    onClick={() => handleSelectTrip(savedTrip)}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{savedTrip.title}</h4>
                        {savedTrip.is_ai_generated ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-bold border border-emerald-500/20 flex items-center gap-0.5">
                            <Bot className="w-2.5 h-2.5" /> {t(" IA ")}</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[8px] font-bold">
                            {t(" Manual ")}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500">{savedTrip.duration_days} {t(" Días de Exploración")}</p>
                    </div>
                    <Route className="w-4 h-4 text-emerald-600" />
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => { detailRequest.current++; setLoading(false); setSelectedTrip(null); setTravelStops(null); setEditing(false); }}
                className="text-xs font-bold text-emerald-600 hover:underline"
              >
                {t(" ← Volver a lista de viajes ")}</button>

              {travelStops ? <TravelMode key={`${currentUser.id}:${selectedTrip.id}`} trip={selectedTrip} stops={travelStops} userId={currentUser.id} onRoute={onApplyTripToMap} onExit={() => setTravelStops(null)} /> : <>
              {detailError && <p role="alert" className="text-sm text-red-600">{detailError}</p>}
              {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
              {loading ? <p role="status">{t("Cargando paradas…")}</p> : editing ? <TripEditor key={selectedTrip.id} trip={selectedTrip} initialStops={tripSpots}
                onCancel={() => setEditing(false)} onSaved={(updated, stops) => {
                  setSelectedTrip(updated); setTripSpots(stops); setEditing(false);
                  setTrips(prev => prev.map(savedTrip => savedTrip.id === updated.id ? updated : savedTrip));
                  onApplyTripToMap(stops.filter(s => s.spots).map(s => s.spots));
                  setNotice(t("Cambios guardados."));
                }} /> : <>
              {!detailError && tripSpots.length > 0 && <button className="w-full rounded-xl bg-emerald-600 text-white py-3 text-sm font-bold" onClick={() => setTravelStops(tripSpots.map(s => ({ ...s, spots: availableSpots.find(p => p.id === s.spot_id) || s.spots })))}>{t("▶ Iniciar / continuar viaje")}</button>}
              {selectedTrip.owner_id === currentUser.id && !detailError && <button className="w-full rounded-xl border border-emerald-600 text-emerald-700 py-2 text-sm font-bold" onClick={() => setEditing(true)}>{t("Editar viaje, ruta y presupuesto")}</button>}
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{selectedTrip.title}</h4>
                  {selectedTrip.is_ai_generated && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-extrabold text-[9px] flex items-center gap-1">
                      <Bot className="w-3 h-3" /> {t(" Creado con IA ")}</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold pt-1">
                  <span>{selectedTrip.duration_days} {t(" Días de Viaje")}</span>
                  <span>{t("Costo estimado: ")}{new Intl.NumberFormat(language === 'en' ? 'en-US' : 'es-CR', { style: 'currency', currency: selectedTrip.currency || 'USD' }).format(totalCost)}</span>
                </div>
              </div>

              {selectedTrip.budget_limit != null && <p className="text-xs">{t("Presupuesto disponible: ")}{selectedTrip.budget_limit} {selectedTrip.currency || 'USD'}</p>}
              {selectedTrip.notes && <p className="whitespace-pre-wrap text-sm">{selectedTrip.notes}</p>}
              {/* Acciones de Exportación / Compartir */}
              <div className="flex gap-2">
                <button
                  onClick={handleShareTrip}
                  className="flex-1 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copiedLink ? t("¡Link Copiado!") : t("Compartir Link")}</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t("PDF / Ficha")}</span>
                </button>
              </div>

              {/* Lista de Paradas del Itinerario */}
              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto custom-scrollbar pt-1">
                {tripSpots.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-extrabold text-[9px] mr-1.5">
                        {t(" Día ")}{item.day_number}
                      </span>
                      <strong className="text-slate-900 dark:text-white">
                        {item.custom_title || item.spots?.title}
                      </strong>
                      {item.custom_address && <p className="text-xs text-slate-500 whitespace-normal">{item.custom_address}</p>}
                      {item.notes && <p className="text-xs whitespace-pre-wrap">{item.notes}</p>}
                    </div>
                    <span className="font-bold text-emerald-600 text-[11px]">
                      {item.estimated_cost || 0} {selectedTrip.currency || 'USD'}
                    </span>
                  </div>
                ))}
              </div>
              </>}
              </>}
            </div>
          )}
        </div>
      </div>

      <div className={`${travelStops && mapOnly ? 'hidden md:block' : ''} p-3 text-center text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-800`}>
        {t(" MapAI • Integración IA + Colaborativo ")}</div>

    </div>
  );
}
