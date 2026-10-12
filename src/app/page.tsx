'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import dynamicNext from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';
import SpotCardPreview, { Spot } from '@/components/SpotCardPreview';

const MapContainer = dynamicNext(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-cyan-400">
      <div className="flex flex-col items-center gap-2">
        <span className="animate-spin text-3xl">🌐</span>
        <span className="text-xs font-mono">Cargando Mapa de Costa Rica...</span>
      </div>
    </div>
  ),
});

// Semillero de emergencia si Supabase retorna 0 registros
const FALLBACK_SPOTS: Spot[] = [
  {
    id: 'f1',
    title: 'Mirador Tiquicia',
    description: 'Vista panorámica espectacular de todo el Valle Central. Comida típica costarricense, café chorreado y ambiente acogedor al atardecer.',
    category: 'gastronomia',
    rating_avg: 4.8,
    distance_meters: 2400,
    latitude: 9.8950,
    longitude: -84.1350,
    opening_hours: 'Martes a Domingo: 4:00 PM - 11:00 PM',
    entry_fee: 'Consumo mínimo ₡5,000',
    address_text: 'San Antonio de Escazú, San José',
    checkins_count: 12
  },
  {
    id: 'f2',
    title: 'Parque Nacional Volcán Poás',
    description: 'Uno de los cráteres volcánicos activos más grandes del mundo con laguna de color turquesa y senderos en bosque nuboso.',
    category: 'naturaleza',
    rating_avg: 4.9,
    distance_meters: 35000,
    latitude: 10.1980,
    longitude: -84.2330,
    opening_hours: 'Lunes a Domingo: 8:00 AM - 3:30 PM (Reserva SINAC)',
    entry_fee: 'Nacionales: ₡1,130 | Extranjeros: $15',
    address_text: 'Poás, Alajuela',
    checkins_count: 45
  },
  {
    id: 'f3',
    title: 'Catarata La Paz Waterfall Gardens',
    description: 'Impresionantes caídas de agua, santuario de vida silvestre, mariposario y senderos rodeados de densa vegetación tropical.',
    category: 'naturaleza',
    rating_avg: 4.7,
    distance_meters: 32000,
    latitude: 10.2080,
    longitude: -84.1620,
    opening_hours: 'Lunes a Domingo: 8:00 AM - 5:00 PM',
    entry_fee: 'Nacionales: ₡18,000 | Extranjeros: $52',
    address_text: 'Vara Blanca, Heredia',
    checkins_count: 28
  },
  {
    id: 'f4',
    title: 'Baqueano Gastronómico & Café',
    description: 'Rincón oculto especializado en cafés de especialidad de Tarrazú, repostería artesanal y desayunos típicos con ingredientes locales.',
    category: 'gastronomia',
    rating_avg: 4.8,
    distance_meters: 5000,
    latitude: 9.9281,
    longitude: -84.0907,
    opening_hours: 'Lunes a Sábado: 7:00 AM - 8:00 PM',
    entry_fee: 'Entrada Libre (Café desde ₡1,800)',
    address_text: 'Barrio Escalante, San José',
    checkins_count: 19
  },
  {
    id: 'f5',
    title: 'Catarata Río Celeste',
    description: 'Famosa por sus aguas de color azul turquesa intenso rodeadas por el bosque tropical del Parque Nacional Volcán Tenorio.',
    category: 'aventura',
    rating_avg: 4.9,
    distance_meters: 120000,
    latitude: 10.7010,
    longitude: -85.0180,
    opening_hours: 'Lunes a Domingo: 8:00 AM - 2:00 PM',
    entry_fee: 'Nacionales: ₡904 | Extranjeros: $12',
    address_text: 'Guatuso, Alajuela',
    checkins_count: 67
  }
];

export default function HomePage() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: 9.9281,
    lng: -84.0907,
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => console.log('Coordenadas por defecto San José:', err)
      );
    }
  }, []);

  const loadNearbySpots = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('get_spots_nearby', {
        lat: userCoords.lat,
        lng: userCoords.lng,
        radius_meters: 500000,
        cat_filter: categoryFilter === 'todas' ? null : categoryFilter,
      });

      if (!error && data && data.length > 0) {
        setSpots(data as Spot[]);
        if (!selectedSpot) setSelectedSpot(data[0]);
      } else {
        // Fallback activo si Supabase devuelve 0 o error
        const filteredFallback = categoryFilter && categoryFilter !== 'todas'
          ? FALLBACK_SPOTS.filter(s => s.category === categoryFilter)
          : FALLBACK_SPOTS;
        setSpots(filteredFallback);
        if (filteredFallback.length > 0 && !selectedSpot) setSelectedSpot(filteredFallback[0]);
      }
    } catch (err) {
      const filteredFallback = categoryFilter && categoryFilter !== 'todas'
        ? FALLBACK_SPOTS.filter(s => s.category === categoryFilter)
        : FALLBACK_SPOTS;
      setSpots(filteredFallback);
      if (filteredFallback.length > 0 && !selectedSpot) setSelectedSpot(filteredFallback[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNearbySpots();
  }, [userCoords, categoryFilter]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 flex flex-col md:flex-row">
      <header className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between gap-3 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 shadow-2xl max-w-xl mx-auto md:mx-0 md:left-6">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🇨🇷</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent leading-none">
                MapAI Costa Rica
              </h1>
              <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {spots.length} Gemas
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Exploración e Itinerarios con IA</p>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto max-w-[220px] sm:max-w-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {['todas', 'gastronomia', 'naturaleza', 'aventura', 'cultura'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat === 'todas' ? null : cat)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold capitalize transition-all whitespace-nowrap ${
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

      <div className="w-full h-full z-10">
        <MapContainer
          spots={spots}
          selectedSpot={selectedSpot}
          userCoords={userCoords}
          onSelectSpot={(spot: Spot) => setSelectedSpot(spot)}
        />
      </div>

      {selectedSpot && (
        <aside className="absolute bottom-4 left-4 right-4 z-30 md:bottom-auto md:top-24 md:right-6 md:left-auto md:w-96 flex justify-center">
          <SpotCardPreview
            spot={selectedSpot}
            userCoords={userCoords}
            onClose={() => setSelectedSpot(null)}
          />
        </aside>
      )}

      <button className="absolute bottom-6 right-6 z-40 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 px-4 py-3 rounded-full font-extrabold text-xs shadow-2xl shadow-cyan-500/40 hover:scale-105 transition-all flex items-center gap-2">
        <span>🤖</span>
        <span>Copiloto IA</span>
      </button>
    </main>
  );
}