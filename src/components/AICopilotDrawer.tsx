'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Calendar, 
  Clock, 
  Loader2, 
  Route, 
  ChevronRight,
  Bot,
  FileDown,
  Trash2
} from 'lucide-react';

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  onApplyRouteToMap: (routeSpots: any[]) => void;
  onClearRoute?: () => void;
}

export default function AICopilotDrawer({
  isOpen,
  onClose,
  initialPrompt = '',
  onApplyRouteToMap,
  onClearRoute
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
        
        if (onApplyRouteToMap && data.routeSpots && data.routeSpots.length > 0) {
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

  const handleExportPDF = () => {
    if (!itineraryResult) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${itineraryResult.title || 'Itinerario MapAI'}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #0f172a; max-width: 800px; margin: 0 auto; line-height: 1.5; }
            .header { border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
            .logo { font-size: 20px; font-weight: 900; color: #0284c7; letter-spacing: -0.5px; }
            h1 { font-size: 22px; margin: 10px 0 5px; color: #0f172a; }
            .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-right: 6px; }
            .summary { font-size: 13px; color: #475569; margin: 15px 0; background: #f8fafc; padding: 12px; border-radius: 8px; border-left: 4px solid #0284c7; }
            .day-title { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
            .activity { margin: 12px 0 12px 12px; padding-left: 12px; border-left: 2px solid #cbd5e1; }
            .act-time { font-weight: 700; font-size: 12px; color: #0284c7; }
            .act-name { font-weight: 700; font-size: 13px; color: #1e293b; margin: 2px 0; }
            .act-desc { font-size: 12px; color: #64748b; }
            .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">MapAI Costa Rica</div>
            <h1>${itineraryResult.title}</h1>
            <div>
              <span class="badge">📍 ${itineraryResult.destination || 'Costa Rica'}</span>
              <span class="badge">💰 ${itineraryResult.estimated_budget || 'Presupuesto Medio'}</span>
            </div>
            <div class="summary">${itineraryResult.summary}</div>
          </div>
          ${itineraryResult.days?.map((day: any) => `
            <div class="day-title">🗓️ ${day.title || `Día ${day.day}`}</div>
            ${day.activities?.map((act: any) => `
              <div class="activity">
                <div class="act-time">⏰ ${act.time}</div>
                <div class="act-name">${act.activity}</div>
                <div class="act-desc">${act.description}</div>
              </div>
            `).join('')}
          `).join('')}
          <div class="footer">Generado por MapAI Costa Rica - Descubrimiento Turístico Inteligente</div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleCloseDrawer = () => {
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateItinerary(promptInput);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[420px] bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800/80 text-slate-100 shadow-2xl flex flex-col animate-slide-left">
      
      {/* Header Copiloto Minimalista */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Bot className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Copiloto IA</span>
              <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 rounded-full font-bold">
                PRO
              </span>
            </h3>
            <p className="text-[9px] text-slate-400">Itinerarios con gemas locales</p>
          </div>
        </div>

        <button
          onClick={handleCloseDrawer}
          className="p-1.5 rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Cuerpo Principal */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        
        {/* Prompts Rápidos */}
        {!itineraryResult && !isLoading && (
          <div className="space-y-3 my-auto py-6">
            <div className="text-center space-y-1">
              <Sparkles className="w-6 h-6 text-emerald-400 mx-auto animate-bounce" />
              <h4 className="text-sm font-bold text-white">¿A dónde querés viajar hoy?</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Ingresá tu destino o elegí una sugerencia.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              {[
                'Plan de fin de semana en La Fortuna',
                'Mejores playas para atardeceres en Guanacaste',
                'Sodas tradicionales imperdibles en Cartago',
                'Escapada de aventura en Monteverde'
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPromptInput(suggestion);
                    generateItinerary(suggestion);
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 text-[11px] text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                >
                  <span>"{suggestion}"</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Carga */}
        {isLoading && (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-white">Generando itinerario...</p>
              <p className="text-[10px] text-slate-400">Analizando gemas locales en Costa Rica</p>
            </div>
          </div>
        )}

        {/* Resultado */}
        {itineraryResult && !isLoading && (
          <div className="space-y-4 animate-fade-in">
            
            {/* Banner Resumen */}
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 space-y-2 shadow-xl">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {itineraryResult.destination || 'Costa Rica'}
                  </span>
                  <h4 className="text-sm font-extrabold text-white mt-1">
                    {itineraryResult.title}
                  </h4>
                </div>
                <span className="text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md whitespace-nowrap">
                  {itineraryResult.estimated_budget || 'Presupuesto Medio'}
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-snug">
                {itineraryResult.summary}
              </p>

              {/* Botones de Acción: Exportar PDF & Limpiar Ruta */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleExportPDF}
                  className="py-1.5 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] transition-all flex items-center justify-center gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Exportar PDF</span>
                </button>

                {onClearRoute && (
                  <button
                    onClick={() => {
                      onClearRoute();
                      setRouteSpots([]);
                    }}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Limpiar Ruta</span>
                  </button>
                )}
              </div>
            </div>

            {/* Cronograma */}
            <div className="space-y-3">
              {itineraryResult.days?.map((dayObj: any, dayIdx: number) => (
                <div key={dayIdx} className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 border-b border-slate-800/80 pb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{dayObj.title || `Día ${dayObj.day}`}</span>
                  </div>

                  <div className="space-y-1.5 pl-2 border-l-2 border-emerald-500/30">
                    {dayObj.activities?.map((act: any, actIdx: number) => (
                      <div
                        key={actIdx}
                        className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 space-y-0.5"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-emerald-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            {act.time}
                          </span>
                          <span className="text-slate-300 font-semibold truncate max-w-[180px]">
                            {act.activity}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug">
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

      {/* Input Flotante */}
      <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/90">
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="Ajustar consulta..."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:outline-none text-[11px] text-white placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={isLoading || !promptInput.trim()}
            className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold disabled:opacity-50 transition-colors shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

    </div>
  );
}