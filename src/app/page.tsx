'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import DiscoveryHub from '@/components/DiscoveryHub';

// Carga dinámica del mapa para evitar errores de SSR con Leaflet
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
  const [selectedSpot, setSelectedSpot] = useState<any | null>(null); // Nulo al inicio para mostrar el Hub
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cargar spots desde Supabase / API
  useEffect(() => {
    async function fetchSpots() {
      try {
        const res = await fetch('/api/spots');
        const data = await res.json();
        if (Array.isArray(data)) {
          setSpots(data);
        }
      } catch (err) {
        console.error('Error cargando spots:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSpots();
  }, []);

  // Filtrar spots segun la categoria seleccionada
  const filteredSpots = activeCategory === 'Todas'
    ? spots
    : spots.filter((s) => s.category?.toLowerCase() === activeCategory.toLowerCase());

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* 1. MAPA INTERACTIVO DE FONDO */}
      <div className="absolute inset-0 z-0">
        <MapWithNoSSR
          spots={filteredSpots}
          selectedSpot={selectedSpot}
          onSelectSpot={(spot: any) => setSelectedSpot(spot)}
        />
      </div>

      {/* 2. BARRA SUPERIOR DE NAVEGACIÓN Y FILTROS */}
      <div className="absolute top-4 left-4 right-4 md:right-auto z-10 flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-bold shadow-lg flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">
            CR
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span>MapAI Costa Rica</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold">
                Live DB ({spots.length})
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-normal">Exploración e Itinerarios con IA</p>
          </div>
        </div>

        {/* Categorias rapidas */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-lg">
          {['Todas', 'gastronomia', 'naturaleza', 'aventura', 'cultura'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                activeCategory === cat
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. PANEL LATERAL DERECHO: DISCOVERY HUB O FICHA DE DETALLE */}
      <div className="absolute top-20 right-4 z-20 w-full max-w-sm px-2 sm:px-0 pointer-events-auto">
        {selectedSpot ? (
          /* Tarjeta de detalle cuando se hace clic en un marcador */
          <div className="w-full bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-5 text-slate-100 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setSelectedSpot(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Volver al Hub"
            >
              ✕
            </button>

            <span className="inline-block px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {selectedSpot.category || 'naturaleza'}
            </span>

            <h3 className="text-lg font-bold text-white pr-6">{selectedSpot.title}</h3>

            <div className="space-y-2 text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
              <p><strong>🕒 Horario:</strong> {selectedSpot.opening_hours || 'Lunes a Domingo 8:00 AM - 5:00 PM'}</p>
              <p><strong>🎟️ Costo:</strong> {selectedSpot.entry_fee || 'Entrada Gratuita'}</p>
              <p><strong>📍 Ubicación:</strong> {selectedSpot.address_text || 'Costa Rica'}</p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedSpot.description}
            </p>

            <button
              onClick={() => setSelectedSpot(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors border border-slate-700"
            >
              ← Volver a Explorar
            </button>
          </div>
        ) : (
          /* Hub de Descubrimiento cuando no hay ningún lugar seleccionado */
          <DiscoveryHub
            totalSpotsCount={spots.length}
            featuredSpots={spots.slice(0, 5)}
            onSelectCategory={(cat) => setActiveCategory(cat)}
            onSelectSpot={(spot) => setSelectedSpot(spot)}
            onOpenAICopilot={(prompt) => console.log('Copiloto IA:', prompt)}
            onOpenAddSpotModal={() => console.log('Abrir Modal Agregar Gema')}
          />
        )}
      </div>
    </main>
  );
}