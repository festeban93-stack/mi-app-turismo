'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  X, 
  Search, 
  Calendar, 
  Trash2, 
  Sparkles, 
  Route, 
  CheckCircle2, 
  Loader2,
  Users,
  MapPin,
  DollarSign,
  Plus,
  Gem
} from 'lucide-react';

interface CustomTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  availableSpots: any[];
  onApplyTripToMap: (routeSpots: any[]) => void;
  onRequireAuth: () => void;
  onOpenAddSpotWithTitle?: (title: string) => void;
}

interface TripItem {
  id?: string;
  spot?: any;
  custom_title?: string;
  custom_address?: string;
  day: number;
  cost: number;
}

export default function CustomTripModal({
  isOpen,
  onClose,
  currentUser,
  availableSpots = [],
  onApplyTripToMap,
  onRequireAuth,
  onOpenAddSpotWithTitle
}: CustomTripModalProps) {
  const [tripTitle, setTripTitle] = useState('');
  const [durationDays, setDurationDays] = useState(2);

  // Buscador y Paradas
  const [searchQuery, setSearchQuery] = useState('');
  const [customPlaceName, setCustomPlaceName] = useState('');
  const [customPlaceCost, setCustomPlaceCost] = useState('');
  const [selectedSpots, setSelectedSpots] = useState<TripItem[]>([]);

  // Colaboración
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!currentUser && isOpen) {
      onClose();
      onRequireAuth();
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  // Filtrar gemas
  const filteredSpots = availableSpots.filter(s => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.title?.toLowerCase().includes(query) ||
      s.category?.toLowerCase().includes(query) ||
      s.address_text?.toLowerCase().includes(query)
    );
  });

  // Extraer valor numérico aproximado de la tarifa enlistada
  const parseSpotCost = (entryFeeText: string = ''): number => {
    const numbers = entryFeeText.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      return parseFloat(numbers[0]);
    }
    return 0;
  };

  // Agregar Gema Enlistada
  const handleAddSpotToTrip = (spot: any, day: number) => {
    if (selectedSpots.some(item => item.spot?.id === spot.id)) return;
    const estimatedCost = parseSpotCost(spot.entry_fee);
    setSelectedSpots(prev => [...prev, { spot, day, cost: estimatedCost }]);
  };

  // Agregar Parada Personalizada
  const handleAddCustomPlace = (day: number) => {
    if (!customPlaceName.trim()) return;
    const costNum = parseFloat(customPlaceCost) || 0;
    setSelectedSpots(prev => [
      ...prev,
      {
        custom_title: customPlaceName.trim(),
        custom_address: 'Parada libre',
        day,
        cost: costNum
      }
    ]);
    setCustomPlaceName('');
    setCustomPlaceCost('');
  };

  const handleUpdateItemCost = (index: number, newCost: number) => {
    setSelectedSpots(prev => {
      const updated = [...prev];
      updated[index].cost = newCost;
      return updated;
    });
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

  // Costo Total Acumulado
  const totalTripCost = selectedSpots.reduce((sum, item) => sum + (item.cost || 0), 0);

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
      // 1. Crear viaje en Supabase
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

      // 2. Insertar paradas con sus costos
      const spotsPayload = selectedSpots.map((item, index) => ({
        trip_id: tripData.id,
        spot_id: item.spot?.id || null,
        custom_title: item.custom_title || null,
        custom_address: item.custom_address || null,
        day_number: item.day,
        order_index: index,
        estimated_cost: item.cost || 0
      }));

      const { error: spotsError } = await supabase
        .from('trip_spots')
        .insert(spotsPayload);

      if (spotsError) throw spotsError;

      // 3. Registrar colaboradores
      if (invitedEmails.length > 0) {
        const collabPayload = invitedEmails.map(email => ({
          trip_id: tripData.id,
          invited_email: email,
          role: 'editor'
        }));

        await supabase.from('trip_collaborators').insert(collabPayload);
      }

      // Trazar en el mapa
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
    setCustomPlaceCost('');
    setSelectedSpots([]);
    setInvitedEmails([]);
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
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Crear Viaje Personalizado
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Presupuesto en tiempo real y colaboración</p>
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
                Costo Total Estimado: <strong className="text-emerald-600 dark:text-emerald-400">${totalTripCost.toLocaleString()}</strong>. La ruta ha sido cargada en tu mapa interactivo.
              </p>
            </div>
            <button
              onClick={handleResetAndClose}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
            >
              Ver Itinerario en la Plataforma
            </button>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto custom-scrollbar p-1 flex-1">
            
            {/* 1. Nombre y Duración */}
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

            {/* 2. Colaboradores */}
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
                      <button onClick={() => handleRemoveCollaborator(email)} className="hover:text-rose-500">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Parada Custom con Precio Personalizado */}
            <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 space-y-2">
              <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Agregar Parada Libre + Costo Estimado</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                <input
                  type="text"
                  placeholder="Nombre de la parada..."
                  value={customPlaceName}
                  onChange={e => setCustomPlaceName(e.target.value)}
                  className="sm:col-span-2 p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:border-emerald-500 focus:outline-none"
                />
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="number"
                    placeholder="Costo ($)"
                    value={customPlaceCost}
                    onChange={e => setCustomPlaceCost(e.target.value)}
                    className="w-full pl-7 pr-2 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-1 pt-1">
                {Array.from({ length: durationDays }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddCustomPlace(idx + 1)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-all"
                  >
                    + Día {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Buscador de Gemas Enlistadas */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-emerald-600" />
                <span>O seleccionar gemas del mapa (Con precios precargados)</span>
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
                  <p className="text-[10px] text-slate-400 text-center py-2">No hay coincidencias.</p>
                ) : (
                  filteredSpots.slice(0, 6).map(spot => {
                    const isAdded = selectedSpots.some(item => item.spot?.id === spot.id);
                    return (
                      <div
                        key={spot.id}
                        className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-xs"
                      >
                        <div className="truncate pr-2">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{spot.title}</p>
                          <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                            {spot.entry_fee || 'Entrada Libre'}
                          </p>
                        </div>

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

            {/* 5. Resumen de Itinerario & Presupuesto Acumulado */}
            {selectedSpots.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Itinerario ({selectedSpots.length} paradas)
                  </label>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    Total: ${totalTripCost.toLocaleString()} USD/CRC
                  </span>
                </div>

                <div className="space-y-1.5">
                  {selectedSpots.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white font-extrabold text-[9px]">
                          Día {item.day}
                        </span>
                        <div className="truncate">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {item.spot ? item.spot.title : item.custom_title}
                          </p>
                          {!item.spot && (
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenAddSpotWithTitle && item.custom_title) {
                                  onOpenAddSpotWithTitle(item.custom_title);
                                }
                              }}
                              className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
                            >
                              <Gem className="w-2.5 h-2.5" />
                              <span>¿Es una Gema Oculta? Aportala (+50 Pts)</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-16">
                          <input
                            type="number"
                            value={item.cost || ''}
                            placeholder="$0"
                            onChange={e => handleUpdateItemCost(idx, parseFloat(e.target.value) || 0)}
                            className="w-full p-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-emerald-600 text-right focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveSpotFromTrip(idx)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
              <span>{loading ? 'Guardando Viaje...' : `Guardar Viaje ($${totalTripCost.toLocaleString()} Est.)`}</span>
            </button>

          </div>
        )}

      </div>
    </div>
  );
}