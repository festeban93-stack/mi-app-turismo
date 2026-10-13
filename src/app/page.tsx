'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import DiscoveryHub from '@/components/DiscoveryHub';

const MapWithNoSSR = dynamic(() => import('@/components/MapClient'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-950 flex items-center justify-center text-slate-400">
      <span className="animate-pulse text-sm">Cargando mapa interactivo...</span>
    </div>
  ),
});

export default function HomePage() {
  const [spots, setSpots] = useState<any[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<any | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('Todas');

  useEffect(() => {
    async function fetchSpots() {
      try {
        // Deshabilitar cache del navegador agregando timestamp dinamico
        const res = await fetch(`/api/spots?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const json = await res.json();
        
        const rawSpots = Array.isArray(json) 
          ? json 
          : (json.spots || json.data || []);

        // Sanitización y parseo estricto de coordenadas PostGIS POINT(lng lat)
        const cleanSpots = rawSpots.map((s: any) => {
          let lat = s.latitude;
          let lng = s.longitude;

          if ((!lat || !lng || isNaN(Number(lat))) && s.location) {
            const match = String(s.location).match(/POINT\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
            if (match) {
              lng = parseFloat(match[1]);
              lat = parseFloat(match[2]);
            }
          }

          return {
            ...s,
            latitude: typeof lat === 'number' ? lat : parseFloat(lat),
            longitude: typeof lng === 'number' ? lng : parseFloat(lng),
          };
        }).filter((s: any) => !isNaN(s.latitude) && !isNaN(s.longitude));

        setSpots(cleanSpots);
      } catch (err) {
        console.error('Error cargando spots:', err);
      }
    }
    fetchSpots();
  }, []);

  const filteredSpots = activeCategory === 'Todas'
    ? spots
    : spots.filter((s) => s.category?.toLowerCase() === activeCategory.toLowerCase());

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      
      {/* 1. MAPA INTERACTIVO DE FONDO */}
      <div className="absolute inset-0 z-0">
        <MapWithNoSSR
          spots={filteredSpots}
          selectedSpot={selectedSpot}
          onSelectSpot={(spot: any) => setSelectedSpot(spot)}
        />
      </div>

      {/* 2. HEADER FLOTANTE RESPONSIVO (Top Bar) */}
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

        {/* Categorías deslizables */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-xl overflow-x-auto max-w-[200px] sm:max-w-none custom-scrollbar">
          {['Todas', 'gastronomia', 'naturaleza', 'aventura', 'cultura'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. PANEL RESPONSIVO: BOTTOM SHEET EN MÓVIL / SIDEBAR EN DESKTOP */}
      <div className="fixed bottom-0 left-0 right-0 z-30 md:absolute md:top-16 md:bottom-auto md:left-auto md:right-4 md:w-96 pointer-events-auto transition-all duration-300">
        {selectedSpot ? (
          /* Tarjeta de Detalle del Spot */
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
          /* Hub de Descubrimiento cuando no hay nada seleccionado */
          <div className="w-full max-h-[60vh] md:max-h-[calc(100vh-5.5rem)] overflow-y-auto rounded-t-3xl md:rounded-2xl custom-scrollbar shadow-2xl">
            <DiscoveryHub
              totalSpotsCount={spots.length}
              featuredSpots={spots.slice(0, 5)}
              onSelectCategory={(cat) => setActiveCategory(cat)}
              onSelectSpot={(spot) => setSelectedSpot(spot)}
              onOpenAICopilot={(prompt) => console.log('Copiloto IA:', prompt)}
              onOpenAddSpotModal={() => console.log('Modal Aportar Gema')}
            />
          </div>
        )}
      </div>
    </main>
  );
}