'use client';

import React from 'react';
import { 
  Compass, 
  Sparkles, 
  MapPin, 
  Coffee, 
  Mountain, 
  Utensils, 
  Waves, 
  PlusCircle, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';

interface Spot {
  id: string;
  title: string;
  category: string;
  address_text: string;
  description: string;
  opening_hours?: string;
  entry_fee?: string;
}

interface DiscoveryHubProps {
  totalSpotsCount: number;
  featuredSpots: Spot[];
  onSelectCategory: (category: string) => void;
  onSelectSpot: (spot: Spot) => void;
  onOpenAICopilot: (initialPrompt?: string) => void;
  onOpenAddSpotModal: () => void;
}

export default function DiscoveryHub({
  totalSpotsCount,
  featuredSpots,
  onSelectCategory,
  onSelectSpot,
  onOpenAICopilot,
  onOpenAddSpotModal,
}: DiscoveryHubProps) {
  const quickIntents = [
    { label: 'Atardeceres & Miradores', category: 'naturaleza', icon: Mountain, color: 'from-amber-500/20 to-orange-500/20 text-orange-400 border-orange-500/30' },
    { label: 'Café & Brunch', category: 'gastronomia', icon: Coffee, color: 'from-amber-700/20 to-yellow-600/20 text-amber-300 border-amber-600/30' },
    { label: 'Cataratas & Senderos', category: 'aventura', icon: Waves, color: 'from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30' },
    { label: 'Sodas & Tradicional', category: 'gastronomia', icon: Utensils, color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30' },
  ];

  const aiPrompts = [
    '🌲 Plan de fin de semana en La Fortuna',
    '🌊 Mejores playas para atardeceres en Guanacaste',
    '🍲 Sodas tradicionales imperdibles en Cartago',
  ];

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-5 text-slate-100 shadow-2xl space-y-6 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {totalSpotsCount} Gemas en Vivo
          </span>
          <button
            onClick={onOpenAddSpotModal}
            className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Aportar Gema</span>
          </button>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          ¿Qué querés explorar hoy? <Compass className="w-5 h-5 text-cyan-400 animate-spin-slow" />
        </h2>
        <p className="text-xs text-slate-400">
          Descubrí lugares auténticos, restaurantes locales y miradores geolocalizados en Costa Rica.
        </p>
      </div>

      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Exploración Rápida por Intención
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {quickIntents.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => onSelectCategory(item.category)}
                className={`flex flex-col items-start p-3 rounded-xl border bg-gradient-to-br ${item.color} hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left group`}
              >
                <Icon className="w-5 h-5 mb-2 group-hover:rotate-6 transition-transform" />
                <span className="text-xs font-semibold leading-snug">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 to-slate-900 border border-cyan-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 animate-bounce" />
            <span>Copiloto IA de Itinerarios</span>
          </div>
        </div>

        <div className="space-y-1.5">
          {aiPrompts.map((promptText, idx) => (
            <button
              key={idx}
              onClick={() => onOpenAICopilot(promptText)}
              className="w-full text-left text-xs bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/50 rounded-lg p-2.5 text-slate-300 hover:text-white flex items-center justify-between transition-all group"
            >
              <span className="truncate">{promptText}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Gemas Recomendadas
          </h3>
        </div>

        <div className="space-y-2">
          {featuredSpots.slice(0, 3).map((spot) => (
            <div
              key={spot.id}
              onClick={() => onSelectSpot(spot)}
              className="p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer group flex items-start justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  {spot.category}
                </span>
                <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                  {spot.title}
                </h4>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  {spot.address_text}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors flex-shrink-0 self-center" />
            </div>
          ))}
        </div>
      </div>

      <div
        onClick={onOpenAddSpotModal}
        className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 hover:border-emerald-500/60 cursor-pointer transition-all flex items-center justify-between gap-3 group"
      >
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-emerald-300 group-hover:text-emerald-200">
            ¿Conocés un lugar secreto?
          </p>
          <p className="text-[11px] text-slate-400">
            Reportá una gema oculta y ganá insignias de Explorador.
          </p>
        </div>
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform flex-shrink-0">
          <PlusCircle className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}