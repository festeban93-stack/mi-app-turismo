'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Calendar, 
  MapPin, 
  Clock, 
  Compass, 
  Loader2, 
  Route, 
  DollarSign,
  ChevronRight,
  Bot
} from 'lucide-react';

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  onApplyRouteToMap: (routeSpots: any[]) => void;
}

export default function AICopilotDrawer({
  isOpen,
  onClose,
  initialPrompt = '',
  onApplyRouteToMap
}: AICopilotDrawerProps) {
  const [promptInput, setPromptInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [itineraryResult, setItineraryResult] = useState<any | null>(null);
  const [routeSpots, setRouteSpots] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && initialPrompt) {
      setPromptInput(initialPrompt);
      generateItinerary(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  const generateItinerary = async (queryText: string) => {
    if (!queryText.trim()) return;

    setIsLoading(true);
    setItineraryResult(null);

    try {
      const res = await fetch('/api/copilot/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: queryText }),
      });

      const data = await res.json();

      if (data.success) {
        setItineraryResult(data.itinerary);
        setRouteSpots(data.routeSpots || []);
        if (onApplyRouteToMap && data.routeSpots) {
          onApplyRouteToMap(data.routeSpots);
        }
      } else {
        alert(`Error del Copiloto: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error al conectar con la IA: ${err?.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateItinerary(promptInput);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[460px] bg-slate-900/95 backdrop-blur-2xl border-l border-slate-800 text-slate-100 shadow-2xl flex flex-col animate-slide-left">
      
      {/* Header Copiloto */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-cyan-950/50 via-slate-900 to-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Copiloto IA de Itinerarios</span>
              <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.2 rounded-full font-extrabold">
                PRO
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">Rutas inteligentes con gemas de la comunidad</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Cuerpo Principal */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        
        {/* Prompts de Sugerencia Rápida */}
        {!itineraryResult && !isLoading && (
          <div className="space-y-3 my-auto py-6">
            <div className="text-center space-y-1">
              <Sparkles className="w-8 h-8 text-cyan-400 mx-auto animate-bounce" />
              <h4 className="text-base font-extrabold text-white">¿A dónde querés viajar hoy?</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Decime tu destino, duración y tipo de viaje. La IA trazará la ruta perfecta.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {[
                'Plan de fin de semana en La Fortuna para 2 personas',
                'Ruta de 3 días por playas secretas de Guanacaste',
                'Tour gastronómico de sodas tradicionales en Cartago',
                'Escapada de aventura y senderos en Monteverde'
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPromptInput(suggestion);
                    generateItinerary(suggestion);
                  }}
                  className="w-full text-left p-3 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                >
                  <span>"{suggestion}"</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Estado de Carga */}
        {isLoading && (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">Diseñando tu itinerario ideal...</p>
              <p className="text-xs text-slate-400">Analizando gemas locales y tiempos de traslado en Costa Rica</p>
            </div>
          </div>
        )}

        {/* Resultado del Itinerario Generado */}
        {itineraryResult && !isLoading && (
          <div className="space-y-5 animate-fade-in">
            
            {/* Banner Resumen */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-cyan-500/30 space-y-2.5 shadow-xl">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                    {itineraryResult.destination || 'Costa Rica'}
                  </span>
                  <h4 className="text-base font-extrabold text-white mt-1">
                    {itineraryResult.title}
                  </h4>
                </div>
                <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg whitespace-nowrap">
                  {itineraryResult.estimated_budget || 'Presupuesto Medio'}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {itineraryResult.summary}
              </p>

              {routeSpots.length > 0 && (
                <button
                  onClick={() => onApplyRouteToMap(routeSpots)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold text-xs shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  <Route className="w-4 h-4" />
                  <span>Ver Ruta Trazada en el Mapa ({routeSpots.length} Gemas)</span>
                </button>
              )}
            </div>

            {/* Cronograma Día por Día */}
            <div className="space-y-4">
              {itineraryResult.days?.map((dayObj: any, dayIdx: number) => (
                <div key={dayIdx} className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 border-b border-slate-800 pb-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>{dayObj.title || `Día ${dayObj.day}`}</span>
                  </div>

                  <div className="space-y-2 pl-2 border-l-2 border-cyan-500/30">
                    {dayObj.activities?.map((act: any, actIdx: number) => (
                      <div
                        key={actIdx}
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            {act.time}
                          </span>
                          <span className="text-slate-400 text-[10px] font-semibold">
                            {act.activity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-snug">
                          {act.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

      {/* Input Flotante para Consultas */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Pregúntale a la IA (ej: 'Añadir sodas típicas en la ruta')..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:outline-none text-xs text-white placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={isLoading || !promptInput.trim()}
            className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold disabled:opacity-50 transition-colors shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}