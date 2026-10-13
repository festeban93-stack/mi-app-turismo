'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import DiscoveryHub from '@/components/DiscoveryHub';
import AddSpotModal from '@/components/AddSpotModal';
import AICopilotDrawer from '@/components/AICopilotDrawer';
import { PlusCircle, Bot } from 'lucide-react';

const MapWithNoSSR = dynamic(() => import('@/components/MapClient'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-950 flex items-center justify-center text-slate-400">
      <span className="animate-pulse text-sm">Cargando mapa interactivo...</span>
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
  
  // Estados de Modales y Drawers
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

      {/* 2. HEADER FLOTANTE */}
      <div className="absolute top-3 left-3 right-3 md:right-auto z-20 flex items-center justify-between md:justify-start gap-2 pointer-events-auto">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 text-white shadow-xl flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 font-black flex items-center justify-center text-xs shadow-md">
            CR
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight">MapAI Costa Rica</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                Live DB ({spots.length})
              </span>
            </div>
            <p className="text-[9px] text-slate-400">Exploración con IA</p>
          </div>
        </div>

        {/* Categorías */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-xl overflow-x-auto max-w-[200px] sm:max-w-none custom-scrollbar">
          {['Todas', 'gastronomia', 'naturaleza', 'aventura', 'cultura'].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setActiveSearchQuery('');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize whitespace-nowrap transition-all ${
                activeCategory.toLowerCase() === cat.toLowerCase()
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. BOTONES FLOTANTES DE ACCIÓN (COPILOTO + CROWDSOURCING) */}
      <div className="fixed bottom-6 left-4 z-40 flex items-center gap-2 pointer-events-auto">
        {/* Trigger Copiloto IA */}
        <button
          onClick={() => handleOpenCopilotWithPrompt('')}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all border border-cyan-300/40"
        >
          <Bot className="w-4 h-4 text-slate-950" />
          <span className="hidden sm:inline">Copiloto IA</span>
        </button>

        {/* Trigger Crowdsourcing */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-extrabold text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all border border-emerald-300/40"
        >
          <PlusCircle className="w-4 h-4 text-slate-950" />
          <span>+ Reportar Gema</span>
        </button>
      </div>

      {/* 4. PANEL LATERAL / BOTTOM SHEET */}
      <div className="fixed bottom-0 left-0 right-0 z-30 md:absolute md:top-16 md:bottom-auto md:left-auto md:right-4 md:w-96 pointer-events-auto transition-all duration-300">
        {selectedSpot ? (
          <div className="w-full bg-slate-900/95 backdrop-blur-xl border-t md:border border-slate-800 rounded-t-3xl md:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[70vh] md:max-h-[calc(100vh-5rem)] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {selectedSpot.category || 'naturaleza'}
              </span>
              <button
                onClick={() => setSelectedSpot(null)}
                className="w-7 h-7 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            <h3 className="text-base font-bold text-white">{selectedSpot.title}</h3>

            <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <p><strong>🕒 Horario:</strong> {selectedSpot.opening_hours || 'Lunes a Domingo 8:00 AM - 5:00 PM'}</p>
              <p><strong>🎟️ Entrada:</strong> {selectedSpot.entry_fee || 'Entrada Libre'}</p>
              <p><strong>📍 Dirección:</strong> {selectedSpot.address_text || 'Costa Rica'}</p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedSpot.description}
            </p>

            <button
              onClick={() => setSelectedSpot(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors border border-slate-700 shadow-md"
            >
              ← Volver a Explorar
            </button>
          </div>
        ) : (
          <div className="w-full max-h-[60vh] md:max-h-[calc(100vh-5.5rem)] overflow-y-auto rounded-t-3xl md:rounded-2xl custom-scrollbar shadow-2xl">
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

      {/* 5. DRAWER COPILOTO IA Y MODAL DE CROWDSOURCING */}
      <AICopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        initialPrompt={copilotInitialPrompt}
        onApplyRouteToMap={handleApplyRouteToMap}
      />

      <AddSpotModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSpotAdded={handleSpotAdded}
      />

    </main>
  );
}