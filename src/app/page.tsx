'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';
import SpotCardPreview, { Spot } from '@/components/SpotCardPreview';

// Cargar el mapa din?micamente sin SSR para evitar errores con Leaflet en Next.js
const MapContainer = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-cyan-400">
      <div className="flex flex-col items-center gap-2">
        <span className="animate-spin text-3xl">??</span>
        <span className="text-xs font-mono">Cargando Mapa de Costa Rica...</span>
      </div>
    </div>
  ),
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HomePage() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // 1. Obtener ubicaci?n GPS del usuario al cargar
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // Fallback por defecto: Valle Central (Escaz? / San Jos?)
          setUserCoords({ lat: 9.9281, lng: -84.0907 });
        }
      );
    } else {
      setUserCoords({ lat: 9.9281, lng: -84.0907 });
    }
  }, []);

  // 2. Consultar lugares cercanos en Supabase RPC PostGIS
  const loadNearbySpots = async () => {
    if (!userCoords) return;
    setLoading(true);

    const { data, error } = await supabase.rpc('get_spots_nearby', {
      lat: userCoords.lat,
      lng: userCoords.lng,
      radius_meters: 60000, // 60 km de radio
      cat_filter: categoryFilter === 'todas' ? null : categoryFilter,
    });

    if (!error && data) {
      setSpots(data as Spot[]);
      if (data.length > 0 && !selectedSpot) {
        setSelectedSpot(data[0]); // Seleccionar el primer lugar por defecto
      }
    } else if (error) {
      console.error('Error al consultar lugares:', error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userCoords) {
      loadNearbySpots();
    }
  }, [userCoords, categoryFilter]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-col md:flex-row">
      {/* HEADER MOBILE / BARRA SUPERIOR */}
      <header className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between gap-3 bg-slate-900/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 shadow-2xl max-w-xl mx-auto md:mx-0 md:left-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">????</span>
          <div>
            <h1 className="text-sm font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent leading-none">
              MapAI Costa Rica
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Exploraci?n e Itinerarios con IA</p>
          </div>
        </div>

        {/* Filtros por Categor?a */}
        <div className="flex gap-1.5 overflow-x-auto max-w-[220px] sm:max-w-none no-scrollbar">
          {['todas', 'gastronomia', 'naturaleza', 'aventura', 'cultura'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat === 'todas' ? null : cat)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold capitalize transition-all whitespace-nowrap ${
                (cat === 'todas' && categoryFilter === null) || categoryFilter === cat
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* LIENZO DEL MAPA INTERACTIVO (LEAFLET) */}
      <div className="w-full h-full z-10">
        <MapContainer
          spots={spots}
          selectedSpot={selectedSpot}
          userCoords={userCoords}
          onSelectSpot={(spot: Spot) => setSelectedSpot(spot)}
        />
      </div>

      {/* PANEL FLOTANTE DE PREVIEW & CHECK-IN (BOTTOM SHEET EN M?VIL / SIDEBAR EN DESKTOP) */}
      {selectedSpot && (
        <aside className="absolute bottom-4 left-4 right-4 z-30 md:bottom-auto md:top-24 md:right-6 md:left-auto md:w-96 flex justify-center">
          <SpotCardPreview
            spot={selectedSpot}
            userCoords={userCoords}
            onClose={() => setSelectedSpot(null)}
          />
        </aside>
      )}

      {/* BOT?N FLOTANTE COPILOTO IA */}
      <button className="absolute bottom-6 right-6 z-40 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 px-4 py-3 rounded-full font-extrabold text-xs shadow-2xl shadow-cyan-500/40 hover:scale-105 transition-all flex items-center gap-2">
        <span>??</span>
        <span>Copiloto IA</span>
      </button>
    </main>
  );
}