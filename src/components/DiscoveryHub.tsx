'use client';

import React from 'react';
import { 
  Sparkles, 
  MapPin, 
  ChevronRight, 
  Utensils, 
  Sunset, 
  Coffee, 
  Waves
} from 'lucide-react';

interface DiscoveryHubProps {
  totalSpotsCount: number;
  featuredSpots: any[];
  onSelectCategory: (category: string) => void;
  onSelectSpot: (spot: any) => void;
  onOpenAICopilot: (prompt: string) => void;
  onOpenAddSpotModal: () => void;
}

export default function DiscoveryHub({
  totalSpotsCount,
  featuredSpots = [],
  onSelectCategory,
  onSelectSpot,
  onOpenAICopilot,
  onOpenAddSpotModal,
}: DiscoveryHubProps) {
  return (
    <div className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t md:border border-slate-200/80 dark:border-slate-800 rounded-t-3xl md:rounded-2xl p-3.5 space-y-3.5 text-slate-900 dark:text-slate-100 shadow-2xl">
      
      {/* 1. SECCIÓN DE EXPLORACIÓN RÁPIDA */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Exploración por Intención
        </h4>

        <div className="grid grid-cols-2 gap-1.5">
          {[
            {
              title: 'Atardeceres & Miradores',
              prompt: 'Atardeceres y miradores panorámicos en Costa Rica',
              icon: Sunset,
              color: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/80 dark:border-amber-800/40 text-amber-800 dark:text-amber-400',
            },
            {
              title: 'Café & Brunch',
              prompt: 'Cafeterías de especialidad y brunch local',
              icon: Coffee,
              color: 'from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200/80 dark:border-yellow-800/40 text-yellow-800 dark:text-yellow-400',
            },
            {
              title: 'Cataratas & Senderos',
              prompt: 'Cataratas y senderos naturales en Costa Rica',
              icon: Waves,
              color: 'from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200/80 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-400',
            },
            {
              title: 'Sodas & Tradicional',
              prompt: 'Sodas tradicionales y comida típica costarricense',
              icon: Utensils,
              color: 'from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200/80 dark:border-orange-800/40 text-orange-800 dark:text-orange-400',
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => onOpenAICopilot(item.prompt)}
                className={`p-2.5 rounded-xl bg-gradient-to-br ${item.color} border hover:scale-[1.02] active:scale-[0.98] transition-all text-left space-y-1 group shadow-sm`}
              >
                <Icon className="w-4 h-4" />
                <p className="text-[11px] font-bold leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                  {item.title}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. COPILOTO IA - ACCESOS DIRECTOS */}
      <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 animate-pulse" />
            Itinerarios Sugeridos
          </span>
        </div>

        <div className="space-y-1.5">
          {[
            { label: '🌲 Plan de fin de semana en La Fortuna', prompt: 'Plan de fin de semana en La Fortuna para 2 personas' },
            { label: '🌊 Mejores playas para atardeceres en Guanacaste', prompt: 'Mejores playas para atardeceres en Guanacaste' },
            { label: '🍛 Sodas tradicionales imperdibles en Cartago', prompt: 'Sodas tradicionales imperdibles en Cartago' },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => onOpenAICopilot(item.prompt)}
              className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/50 text-[11px] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all flex items-center justify-between group"
            >
              <span className="truncate pr-2 font-medium">{item.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* 3. GEMAS DESTACADAS */}
      {featuredSpots.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
          <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Gemas Destacadas
          </h4>

          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            {featuredSpots.map((spot) => (
              <button
                key={spot.id || spot.title}
                onClick={() => onSelectSpot(spot)}
                className="flex-shrink-0 w-40 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/50 text-left space-y-1 group transition-all"
              >
                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                  {spot.category || 'naturaleza'}
                </span>
                <h5 className="text-[11px] font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                  {spot.title}
                </h5>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5 text-slate-400" />
                  {spot.address_text || 'Costa Rica'}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}