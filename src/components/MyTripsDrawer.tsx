'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
  Users
} from 'lucide-react';

interface MyTripsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onApplyTripToMap: (routeSpots: any[]) => void;
}

export default function MyTripsDrawer({
  isOpen,
  onClose,
  currentUser,
  onApplyTripToMap
}: MyTripsDrawerProps) {
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
  const [tripSpots, setTripSpots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      fetchUserTrips();
    }
  }, [isOpen, currentUser]);

  const fetchUserTrips = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('trips')
        .select('*')
        .eq('owner_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (data) setTrips(data);
    } catch (err) {
      console.error('Error cargando viajes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTrip = async (trip: any) => {
    setSelectedTrip(trip);
    setLoading(true);
    try {
      const { data } = await supabase
        .from('trip_spots')
        .select('*, spots(*)')
        .eq('trip_id', trip.id)
        .order('day_number', { ascending: true });

      if (data) {
        setTripSpots(data);
        const route = data.filter(d => d.spots).map(d => d.spots);
        onApplyTripToMap(route);
      }
    } catch (err) {
      console.error('Error cargando detalles del viaje:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleShareTrip = () => {
    if (!selectedTrip) return;
    const shareUrl = `${window.location.origin}/?tripId=${selectedTrip.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (!isOpen || !currentUser) return null;

  const totalCost = tripSpots.reduce((sum, item) => sum + (parseFloat(item.estimated_cost) || 0), 0);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl p-5 flex flex-col justify-between animate-fade-in text-slate-900 dark:text-slate-100 select-none">
      
      {/* Header */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold">Mis Itinerarios de Viaje</h3>
              <p className="text-[10px] text-slate-500">Gestión sin salir de la plataforma</p>
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
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tus Viajes Guardados</label>
              {trips.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Aún no has creado itinerarios personalizados.</p>
              ) : (
                trips.map(t => (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTrip(t)}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{t.title}</h4>
                      <p className="text-[10px] text-slate-500">{t.duration_days} Días de Exploración</p>
                    </div>
                    <Route className="w-4 h-4 text-emerald-600" />
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => setSelectedTrip(null)}
                className="text-xs font-bold text-emerald-600 hover:underline"
              >
                ← Volver a lista de viajes
              </button>

              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{selectedTrip.title}</h4>
                <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                  <span>{selectedTrip.duration_days} Días de Viaje</span>
                  <span>Presupuesto Est: ${totalCost.toLocaleString()}</span>
                </div>
              </div>

              {/* Acciones de Exportación / Compartir */}
              <div className="flex gap-2">
                <button
                  onClick={handleShareTrip}
                  className="flex-1 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copiedLink ? '¡Link Copiado!' : 'Compartir Link'}</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>PDF / Ficha</span>
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
                        Día {item.day_number}
                      </span>
                      <strong className="text-slate-900 dark:text-white">
                        {item.spots ? item.spots.title : item.custom_title}
                      </strong>
                    </div>
                    <span className="font-bold text-emerald-600 text-[11px]">
                      ${item.estimated_cost || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 text-center text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-800">
        MapAI Trip Manager • Sincronizado en tiempo real
      </div>

    </div>
  );
}