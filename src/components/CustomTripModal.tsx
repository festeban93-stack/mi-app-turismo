'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  X, 
  Plus, 
  Search, 
  Calendar, 
  UserPlus, 
  Trash2, 
  Sparkles, 
  Route, 
  CheckCircle2, 
  Loader2,
  Users,
  MapPin,
  Radio
} from 'lucide-react';

interface CustomTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  availableSpots: any[];
  onApplyTripToMap: (routeSpots: any[]) => void;
  onRequireAuth: () => void;
}

interface TripItem {
  id?: string;
  spot?: any;
  custom_title?: string;
  custom_address?: string;
  day: number;
}

export default function CustomTripModal({
  isOpen,
  onClose,
  currentUser,
  availableSpots = [],
  onApplyTripToMap,
  onRequireAuth
}: CustomTripModalProps) {
  const [tripTitle, setTripTitle] = useState('');
  const [durationDays, setDurationDays] = useState(2);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  // Buscador y Paradas
  const [searchQuery, setSearchQuery] = useState('');
  const [customPlaceName, setCustomPlaceName] = useState('');
  const [selectedSpots, setSelectedSpots] = useState<TripItem[]>([]);

  // Colaboración
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!currentUser && isOpen) {
      onClose();
      onRequireAuth();
    }
  }, [currentUser, isOpen]);

  // Escuchar cambios en Tiempo Real si hay un viaje activo cargado
  useEffect(() => {
    if (!activeTripId) return;

    const channel = supabase
      .channel(`trip_${activeTripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_spots', filter: `trip_id=eq.${activeTripId}` },
        () => {
          setIsRealtimeActive(true);
          fetchTripSpotsRealtime(activeTripId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTripId]);

  const fetchTripSpotsRealtime = async (tripId: string) => {
    const { data } = await supabase
      .from('trip_spots')
      .select('*, spots(*)')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true });

    if (data) {
      const items: TripItem[] = data.map(d => ({
        id: d.id,
        spot: d.spots,
        custom_title: d.custom_title,
        custom_address: d.custom_address,
        day: d.day_number
      }));
      setSelectedSpots(items);
    }
  };

  if (!isOpen || !currentUser) return null;

  // Filtrar gemas por búsqueda
  const filteredSpots = availableSpots.filter(s => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.title?.toLowerCase().includes(query) ||
      s.category?.toLowerCase().includes(query) ||
      s.address_text?.toLowerCase().includes(query)
    );
  });

  // Agregar Gema Existente
  const handleAddSpotToTrip = (spot: any, day: number) => {
    if (selectedSpots.some(item => item.spot?.id === spot.id)) return;
    setSelectedSpots(prev => [...prev, { spot, day }]);
  };

  // Agregar Parada Personalizada (Sin foto ni registro público)
  const handleAddCustomPlace = (day: number) => {
    if (!customPlaceName.trim()) return;
    setSelectedSpots(prev => [
      ...prev,
      {
        custom_title: customPlaceName.trim(),
        custom_address: 'Lugar personalizado',
        day
      }
    ]);
    setCustomPlaceName('');
  };

  const handleRemoveSpotFromTrip = (index: number) => {
    setSelectedSpots(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddCollaborator = () => {
    if (!collaboratorEmail.trim() || !collaboratorEmail.includes('@')) return;
    if (invitedEmails.includes(collaboratorEmail.trim())) return;
    setInvitedEmails(prev => [...prev, collaboratorEmail.trim()]);
    setCollaboratorEmail('');
  };

  const handleRemoveCollaborator = (email: string) => {
    setInvitedEmails(prev => prev.filter(e => e !== email));
  };

  const handleSaveTrip = async () => {
    if (!tripTitle.trim()) {
      alert('Por favor ingresá un nombre para tu viaje.');
      return;
    }
    if (selectedSpots.length === 0) {
      alert('Agregá al menos un lugar o parada personalizada.');
      return;
    }

    setLoading(true);

    try {
      // 1. Crear registro en la tabla trips
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert([
          {
            owner_id: currentUser.id,
            title: tripTitle,
            duration_days: durationDays
          }
        ])
        .select()
        .single();

      if (tripError) throw tripError;

      setActiveTripId(tripData.id);

      // 2. Insertar paradas (gemas o personalizadas)
      const spotsPayload = selectedSpots.map((item, index) => ({
        trip_id: tripData.id,
        spot_id: item.spot?.id || null,
        custom_title: item.custom_title || null,
        custom_address: item.custom_address || null,
        day_number: item.day,
        order_index: index
      }));

      const { error: spotsError } = await supabase
        .from('trip_spots')
        .insert(spotsPayload);

      if (spotsError) throw spotsError;

      // 3. Registrar colaboradores invitados
      if (invitedEmails.length > 0) {
        const collabPayload = invitedEmails.map(email => ({
          trip_id: tripData.id,
          invited_email: email,
          role: 'editor'
        }));

        await supabase.from('trip_collaborators').insert(collabPayload);
      }

      // Trazar en el mapa solo las gemas con coordenadas geográficas
      const routeSpots = selectedSpots.filter(item => item.spot).map(item => item.spot);
      onApplyTripToMap(routeSpots);

      setSuccess(true);
    } catch (err: any) {
      alert(`Error al guardar el viaje: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setTripTitle('');
    setDurationDays(2);
    setSearchQuery('');
    setCustomPlaceName('');
    setSelectedSpots([]);
    setInvitedEmails([]);
    setActiveTripId(null);
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 p-5 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Crear Viaje Personalizado</span>
                {isRealtimeActive && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold flex items-center gap-1 border border-emerald-500/30">
                    <Radio className="w-2.5 h-2.5 animate-pulse" />
                    En vivo
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Planificador colaborativo multiusuario</p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="py-12 text-center space-y-4 my-auto">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto animate-bounce" />
            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                ¡Viaje "{tripTitle}" Creado!
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed">
                Ruta trazada en el mapa. Tus colaboradores invitados pueden conectarse y editar la lista de lugares en tiempo real.
              </p>
            </div>
            <button
              onClick={handleResetAndClose}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
            >
              Ver Ruta en el Mapa
            </button>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto custom-scrollbar p-1 flex-1">
            
            {/* 1. Datos Básicos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Nombre del Viaje</label>
                <input
                  type="text"
                  placeholder="Ej: Paseo a La Fortuna con Amigos"
                  value={tripTitle}
                  onChange={e => setTripTitle(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Duración (Días)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={durationDays}
                  onChange={e => setDurationDays(parseInt(e.target.value) || 1)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 2. Colaboradores Invitados */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Invitar Amigos por Correo</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="email"
                  placeholder="correo@amigo.com"
                  value={collaboratorEmail}
                  onChange={e => setCollaboratorEmail(e.target.value)}
                  className="flex-1 p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCollaborator}
                  className="px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs hover:bg-slate-800 transition-all"
                >
                  Invitar
                </button>
              </div>

              {invitedEmails.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {invitedEmails.map(email => (
                    <span
                      key={email}
                      className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-emerald-200 dark:border-emerald-500/30"
                    >
                      {email}
                      <button onClick={() => handleRemoveCollaborator(email)} className="hover:text-rose-500">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Parada Personalizada (Lugar Fuera de Lista) */}
            <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-2">
              <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>¿Lugar fuera del mapa? Agregalo como parada personal</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Ej: Casa de la abuela, Restaurante conocido..."
                  value={customPlaceName}
                  onChange={e => setCustomPlaceName(e.target.value)}
                  className="flex-1 p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:border-emerald-500 focus:outline-none"
                />
                {Array.from({ length: durationDays }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddCustomPlace(idx + 1)}
                    className="px-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-all whitespace-nowrap"
                  >
                    + Día {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Buscador de Gemas del Mapa */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-emerald-600" />
                <span>O seleccionar gemas registradas</span>
              </label>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar gemas..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1 border border-slate-200 dark:border-slate-800/80 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/30">
                {filteredSpots.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-2">No hay coincidencia.</p>
                ) : (
                  filteredSpots.slice(0, 8).map(spot => {
                    const isAdded = selectedSpots.some(item => item.spot?.id === spot.id);
                    return (
                      <div
                        key={spot.id}
                        className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-xs"
                      >
                        <span className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                          {spot.title}
                        </span>

                        {isAdded ? (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Agregado ✓</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            {Array.from({ length: durationDays }).map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleAddSpotToTrip(spot, idx + 1)}
                                className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-600 hover:text-white text-emerald-800 dark:text-emerald-300 font-bold text-[9px] transition-all"
                              >
                                + Día {idx + 1}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 5. Resumen de la Ruta */}
            {selectedSpots.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Itinerario del Viaje ({selectedSpots.length} paradas)
                </label>

                <div className="space-y-1">
                  {selectedSpots.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white font-extrabold text-[9px]">
                          Día {item.day}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {item.spot ? item.spot.title : item.custom_title}
                        </span>
                        {!item.spot && (
                          <span className="text-[9px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                            Parada libre
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleRemoveSpotFromTrip(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveTrip}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{loading ? 'Guardando Viaje...' : 'Guardar y Trazar Ruta Colaborativa'}</span>
            </button>

          </div>
        )}

      </div>
    </div>
  );
}