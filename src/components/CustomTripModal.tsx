'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  X, 
  Plus, 
  Search, 
  MapPin, 
  Calendar, 
  DollarSign, 
  UserPlus, 
  Trash2, 
  Sparkles, 
  Route, 
  CheckCircle2, 
  Loader2,
  Users
} from 'lucide-react';

interface CustomTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  availableSpots: any[];
  onApplyTripToMap: (routeSpots: any[]) => void;
  onRequireAuth: () => void;
}

export default function CustomTripModal({
  isOpen,
  onClose,
  currentUser,
  availableSpots = [],
  onApplyTripToMap,
  onRequireAuth
}: CustomTripModalProps) {
  // Estado de Creación de Viaje
  const [tripTitle, setTripTitle] = useState('');
  const [durationDays, setDurationDays] = useState(2);
  const [budget, setBudget] = useState('Presupuesto Medio');
  
  // Búsqueda y Selección de Gemas
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpots, setSelectedSpots] = useState<{ spot: any; day: number }[]>([]);
  
  // Colaboradores
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

  // Filtrar gemas disponibles en tiempo real
  const filteredSpots = availableSpots.filter(s => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.title?.toLowerCase().includes(query) ||
      s.category?.toLowerCase().includes(query) ||
      s.address_text?.toLowerCase().includes(query)
    );
  });

  const handleAddSpotToTrip = (spot: any, day: number) => {
    if (selectedSpots.some(item => item.spot.id === spot.id)) return;
    setSelectedSpots(prev => [...prev, { spot, day }]);
  };

  const handleRemoveSpotFromTrip = (spotId: string) => {
    setSelectedSpots(prev => prev.filter(item => item.spot.id !== spotId));
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
      alert('Agregá al menos una gema o lugar a tu ruta.');
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
            duration_days: durationDays,
            estimated_budget: budget
          }
        ])
        .select()
        .single();

      if (tripError) throw tripError;

      // 2. Insertar gemas asignadas
      const spotsPayload = selectedSpots.map((item, index) => ({
        trip_id: tripData.id,
        spot_id: item.spot.id,
        day_number: item.day,
        order_index: index
      }));

      const { error: spotsError } = await supabase
        .from('trip_spots')
        .insert(spotsPayload);

      if (spotsError) throw spotsError;

      // 3. Insertar colaboradores invitados
      if (invitedEmails.length > 0) {
        const collabPayload = invitedEmails.map(email => ({
          trip_id: tripData.id,
          invited_email: email,
          role: 'editor'
        }));

        await supabase.from('trip_collaborators').insert(collabPayload);
      }

      // Trazar ruta en el mapa
      const spotsForRoute = selectedSpots.map(item => item.spot);
      onApplyTripToMap(spotsForRoute);

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
    setBudget('Presupuesto Medio');
    setSearchQuery('');
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
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Planificador a la medida y colaborativo</p>
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
                La ruta ha sido cargada directamente en tu mapa. Los colaboradores invitados recibirán acceso para editar la ruta.
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
            
            {/* 1. Datos Básicos del Viaje */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="sm:col-span-3 space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Nombre del Viaje</label>
                <input
                  type="text"
                  placeholder="Ej: Fin de semana en La Fortuna con Amigos"
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

              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Presupuesto Estimado</span>
                </label>
                <select
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Económico">Económico (Mochilero)</option>
                  <option value="Presupuesto Medio">Presupuesto Medio</option>
                  <option value="Premium">Premium / Resort</option>
                </select>
              </div>
            </div>

            {/* 2. Colaboradores Invitados */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Invitar Personas al Viaje</span>
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

            {/* 3. Buscador de Gemas */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-emerald-600" />
                <span>Buscar y Agregar Gemas al Viaje</span>
              </label>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre (ej: Catarata, Soda, Mirador)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Lista de Gemas Disponibles */}
              <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1.5 border border-slate-200 dark:border-slate-800/80 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/30">
                {filteredSpots.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-2">No se encontraron gemas.</p>
                ) : (
                  filteredSpots.slice(0, 10).map(spot => {
                    const isAdded = selectedSpots.some(item => item.spot.id === spot.id);
                    return (
                      <div
                        key={spot.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 text-xs"
                      >
                        <div className="truncate pr-2">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{spot.title}</p>
                          <p className="text-[9px] text-slate-500 truncate">{spot.address_text || 'Costa Rica'}</p>
                        </div>

                        {isAdded ? (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Agregado ✓</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            {Array.from({ length: durationDays }).map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleAddSpotToTrip(spot, idx + 1)}
                                className="px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-400 font-bold text-[9px] border border-emerald-200 dark:border-emerald-800 transition-all"
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

            {/* 4. Lista de Gemas Seleccionadas para la Ruta */}
            {selectedSpots.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Ruta del Viaje ({selectedSpots.length} lugares seleccionados)
                </label>

                <div className="space-y-1.5">
                  {selectedSpots.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white font-extrabold text-[9px]">
                          Día {item.day}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white truncate">{item.spot.title}</span>
                      </div>

                      <button
                        onClick={() => handleRemoveSpotFromTrip(item.spot.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botón Guardar */}
            <div className="pt-2">
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
                <span>{loading ? 'Guardando Viaje...' : 'Guardar y Trazar Ruta'}</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}