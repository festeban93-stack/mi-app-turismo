'use client';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

import { useState, useEffect } from 'react';

interface ItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRegion: string;
  onHighlightRoute?: (placeIds: string[]) => void;
}

export default function ItineraryModal({ isOpen, onClose, selectedRegion, onHighlightRoute }: ItineraryModalProps) {
  const [region, setRegion] = useState(selectedRegion && selectedRegion !== 'Todas' ? selectedRegion : 'San José');
  const [days, setDays] = useState('2');
  const [budget, setBudget] = useState('150');
  const [travelStyle, setTravelStyle] = useState('Aventura & Naturaleza');
  const [loading, setLoading] = useState(false);
  const [itineraryResult, setItineraryResult] = useState<any[] | null>(null);

  const regionsList = ['San José', 'La Fortuna / San Carlos', 'Manuel Antonio', 'Guanacaste'];

  const [previousRegion, setPreviousRegion] = useState(selectedRegion);
  if (selectedRegion !== previousRegion) {
    setPreviousRegion(selectedRegion);
    setRegion(selectedRegion && selectedRegion !== 'Todas' ? selectedRegion : 'San José');
  }

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await authenticatedFetch('/api/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          region,
          days: parseInt(days, 10),
          budget: parseFloat(budget),
          travel_style: travelStyle
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.reply || 'Servicio no disponible.');
      if (data.success && data.itinerary) {
        setItineraryResult(data.itinerary);
      }
    } catch (err) {
      alert('Error al calcular la ruta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-emerald-500/40 w-full max-w-xl rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-white font-sans max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h2 className="font-bold text-lg text-emerald-400 flex items-center gap-2">
            🗺️ Planificador de Rutas IA
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
        </div>

        {!itineraryResult ? (
          <form onSubmit={handleGenerate} className="flex flex-col gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Selecciona la Región a Explorar</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 outline-none focus:border-emerald-500 text-white font-semibold"
              >
                {regionsList.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Días de Estancia</label>
                <select
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 outline-none focus:border-emerald-500 text-white"
                >
                  <option value="1">1 Día (Express)</option>
                  <option value="2">2 Días (Fin de semana)</option>
                  <option value="3">3 Días (Recomendado)</option>
                  <option value="5">5 Días (Inmersivo)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Presupuesto Máximo ($ USD)</label>
                <input
                  type="number"
                  min="20"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 outline-none focus:border-emerald-500 text-white"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Estilo de Viaje</label>
              <select
                value={travelStyle}
                onChange={(e) => setTravelStyle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 outline-none focus:border-emerald-500 text-white"
              >
                <option value="Aventura & Naturaleza">Aventura & Naturaleza</option>
                <option value="Relajación & Gastronomía">Relajación & Gastronomía</option>
                <option value="Económico & Mochilero">Económico & Mochilero</option>
                <option value="Familiar">Familiar & Accesible</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg font-semibold text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">🌀</span>
                    <span>Optimizando ruta...</span>
                  </>
                ) : (
                  <>
                    <span>✨ Generar Itinerario</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4 text-xs">
            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div>
                <h3 className="font-bold text-emerald-400 text-sm">Itinerario en {region} ({days} Días)</h3>
                <p className="text-[11px] text-slate-400">Presupuesto Est.: ${budget} USD | {travelStyle}</p>
              </div>
              <button
                onClick={() => setItineraryResult(null)}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700"
              >
                ✏️ Cambiar
              </button>
            </div>

            <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-1">
              {itineraryResult.map((dayItem: any) => (
                <div key={dayItem.day} className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col gap-2">
                  <div className="flex justify-between items-center border-b border-slate-700/60 pb-1.5">
                    <span className="font-bold text-emerald-300 text-xs">DÍA {dayItem.day}: {dayItem.theme}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Est. ${dayItem.estimated_daily_cost_usd} USD
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mt-1">
                    {dayItem.activities?.map((act: any, aIdx: number) => (
                      <div key={aIdx} className="flex gap-2.5 items-start bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        <span className="bg-slate-800 text-emerald-400 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold border border-slate-700">
                          {act.time}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-white text-xs">{act.place_name}</span>
                          <p className="text-[11px] text-slate-300 leading-relaxed">{act.recommendation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center border-t border-slate-800 pt-3">
              <button
                onClick={() => window.print()}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-1"
              >
                <span>🖨️</span> Imprimir / Exportar PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
