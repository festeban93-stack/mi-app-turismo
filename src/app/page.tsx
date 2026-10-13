'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import DiscoveryHub from '@/components/DiscoveryHub';
import AddSpotModal from '@/components/AddSpotModal';
import AICopilotDrawer from '@/components/AICopilotDrawer';
import { Plus, Bot, Trash2 } from 'lucide-react';

const MapWithNoSSR = dynamic(() => import('@/components/MapClient'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-950 flex items-center justify-center text-slate-400">
      <span className="animate-pulse text-xs">Cargando mapa interactivo...</span>
    </div>
  ),
});

function normalizeText(text: string = ''): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export default function HomePage() {
  const [spots, setSpots] = useState<any[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<any | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>('');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [copilotInitialPrompt, setCopilotInitialPrompt] = useState<string>('');
  const [routeSpots, setRouteSpots] = useState<any[]>([]);

  const fetchSpots = async () => {
    try {
      const res = await fetch(`/api/spots?t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      const rawSpots = Array.isArray(json) ? json : (json.spots || json.data || []);
      setSpots(rawSpots);
    } catch (err) {
      console.error('Error cargando spots:', err);
    }
  };

  useEffect(() => {
    fetchSpots();
  }, []);

  const handleSpotAdded = (newSpot: any) => {
    setSpots((prev) => [newSpot, ...prev]);
    setSelectedSpot(newSpot);
  };

  const handleOpenCopilotWithPrompt = (promptText: string) => {
    setCopilotInitialPrompt(promptText);
    setIsCopilotOpen(true);
  };

  const handleApplyRouteToMap = (spotsForRoute: any[]) => {
    setRouteSpots(spotsForRoute);
  };

  const handleClearRoute = () => {
    setRouteSpots([]);
  };

  const filteredSpots = useMemo(() => {
    return spots.filter((spot) => {
      const catNorm = normalizeText(spot.category);
      const titleNorm = normalizeText(spot.title);
      const descNorm = normalizeText(spot.description);
      const activeCatNorm = normalizeText(activeCategory);

      let matchesCategory = true;
      if (activeCatNorm !== 'todas') {
        if (activeCatNorm === 'gastronomia') {
          matchesCategory = catNorm.includes('gastronom') || titleNorm.includes('restaurante') || titleNorm.includes('cafe') || titleNorm.includes('soda');
        } else if (activeCatNorm === 'naturaleza') {
          matchesCategory = catNorm.includes('naturalez') || titleNorm.includes('playa') || titleNorm.includes('catarata') || titleNorm.includes('mirador');
        } else if (activeCatNorm === 'aventura') {
          matchesCategory = catNorm.includes('aventur') || titleNorm.includes('canopy') || titleNorm.includes('surf');
        } else if (activeCatNorm === 'cultura') {
          matchesCategory = catNorm.includes('cultur') || titleNorm.includes('museo') || titleNorm.includes('teatro');
        } else {
          matchesCategory = catNorm === activeCatNorm;
        }
      }

      let matchesQuery = true;
      if (activeSearchQuery.trim()) {
        const queryNorm = normalizeText(activeSearchQuery);
        matchesQuery = titleNorm.includes(queryNorm) || descNorm.includes(queryNorm);
      }

      return matchesCategory && matchesQuery;
    });
  }, [spots, activeCategory, activeSearchQuery]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      
      {/* 1. MAPA INTERACTIVO */}
      <div className="absolute inset-0 z-0">
        <MapWithNoSSR
          spots={filteredSpots}
          selectedSpot={selectedSpot}
          onSelectSpot={(spot: any) => setSelectedSpot(spot)}
          routeSpots={routeSpots}
        />
      </div>

      {/* 2. HEADER MINIMALISTA ESTILO TRAVEL TECH */}
      <div className="absolute top-3 left-3 right-3 md:right-auto z-20 flex items-center justify-between md:justify-start gap-2 pointer-events-auto">
        
        {/* LOGO MINIMALISTA MAPAI */}
        <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800/80 rounded-xl px-2.5 py-1.5 shadow-lg flex items-center gap-1.5">
          <span className="font-black text-xs tracking-tight text-emerald-400">
            Map<span className="text-cyan-400">AI</span>
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>

        {/* CATEGORÍAS COMPACTAS */}
        <div className="flex items-center gap-1 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 p-1 rounded-xl shadow-lg overflow-x-auto max-w-[210px] sm:max-w-none custom-scrollbar">
          {['Todas', 'gastronomia', 'naturaleza', 'aventura', 'cultura'].map((cat) => {
            const isSelected = activeCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setActiveSearchQuery('');
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. BOTONES FLOTANTES COMPACTOS (FABs) */}
      <div className="fixed bottom-4 left-3 z-40 flex items-center gap-1.5 pointer-events-auto">
        {/* Botón Copiloto IA Pequeño */}
        <button
          onClick={() => handleOpenCopilotWithPrompt('')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-emerald-500/40 text-emerald-400 font-bold text-[11px] shadow-xl hover:bg-emerald-500/20 active:scale-95 transition-all"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Copiloto</span>
        </button>

        {/* Botón Reportar Gema Pequeño */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-[11px] shadow-xl hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Gema</span>
        </button>

        {/* Botón para Limpiar Ruta cuando hay una activa */}
        {routeSpots.length > 0 && (
          <button
            onClick={handleClearRoute}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-rose-400 font-bold text-[10px] shadow-xl hover:bg-rose-500/20 transition-all"
            title="Limpiar ruta del mapa"
          >
            <Trash2 className="w-3 h-3" />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* 4. PANEL COMPACTO MÓVIL (MAX-HEIGHT 38VH) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 md:absolute md:top-14 md:bottom-auto md:left-auto md:right-3 md:w-80 pointer-events-auto transition-all duration-300">
        {selectedSpot ? (
          <div className="w-full bg-slate-950/95 backdrop-blur-xl border-t md:border border-slate-800/80 rounded-t-2xl md:rounded-xl p-4 shadow-2xl space-y-3 max-h-[42vh] md:max-h-[calc(100vh-4.5rem)] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="px-2 py-0.5 text-[9px] uppercase font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {selectedSpot.category || 'naturaleza'}
              </span>
              <button
                onClick={() => setSelectedSpot(null)}
                className="w-6 h-6 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            <h3 className="text-sm font-bold text-white">{selectedSpot.title}</h3>

            <div className="space-y-1 text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
              <p><strong>🕒 Horario:</strong> {selectedSpot.opening_hours || 'Lunes a Domingo 8:00 AM - 5:00 PM'}</p>
              <p><strong>🎟️ Entrada:</strong> {selectedSpot.entry_fee || 'Entrada Libre'}</p>
              <p><strong>📍 Dirección:</strong> {selectedSpot.address_text || 'Costa Rica'}</p>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              {selectedSpot.description}
            </p>

            <button
              onClick={() => setSelectedSpot(null)}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 transition-colors border border-slate-700 shadow-sm"
            >
              ← Volver
            </button>
          </div>
        ) : (
          <div className="w-full max-h-[38vh] md:max-h-[calc(100vh-4.5rem)] overflow-y-auto rounded-t-2xl md:rounded-xl custom-scrollbar shadow-2xl">
            <DiscoveryHub
              totalSpotsCount={filteredSpots.length}
              featuredSpots={filteredSpots.slice(0, 5)}
              onSelectCategory={(cat) => {
                setActiveCategory(cat);
                setActiveSearchQuery('');
              }}
              onSelectSpot={(spot) => setSelectedSpot(spot)}
              onOpenAICopilot={(prompt) => handleOpenCopilotWithPrompt(prompt)}
              onOpenAddSpotModal={() => setIsAddModalOpen(true)}
            />
          </div>
        )}
      </div>

      {/* 5. DRAWER COPILOTO Y MODAL */}
      <AICopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => {
          setIsCopilotOpen(false);
          handleClearRoute();
        }}
        initialPrompt={copilotInitialPrompt}
        onApplyRouteToMap={handleApplyRouteToMap}
        onClearRoute={handleClearRoute}
      />

      <AddSpotModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSpotAdded={handleSpotAdded}
      />

    </main>
  );
}