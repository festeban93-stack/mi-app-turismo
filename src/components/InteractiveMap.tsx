'use client';
import { useLanguage } from '@/lib/i18n';

import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { useEffect, useState, useRef } from 'react';
import CopilotWidget from './CopilotWidget';
import AddPlaceModal from './AddPlaceModal';
import ClaimBusinessModal from './ClaimBusinessModal';
import ItineraryModal from './ItineraryModal';

interface Place {
  id: string;
  name: string;
  category: string;
  region: string;
  short_description: string;
  ai_story: string;
  tags: string[];
  estimated_price_usd: number;
  rating: number;
  location: any;
}

export default function InteractiveMap() {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [allPlacesBackup, setAllPlacesBackup] = useState<Place[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('Todas');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isItineraryOpen, setIsItineraryOpen] = useState(false);
  const [clickedLatLng, setClickedLatLng] = useState<{ lat: number; lng: number } | null>(null);

  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const regions = ['Todas', 'San José', 'La Fortuna / San Carlos', 'Manuel Antonio', 'Guanacaste'];
  const categories = ['Todas', 'Naturaleza', 'Gastronomía', 'Aventura', 'Cultura'];

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setCurrentUser(data.session?.user || null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setCurrentUser(session?.user || null));
    return () => data.subscription.unsubscribe();
  }, []);

  const updateMarkers = (items: Place[]) => {
    if (!window.L || !mapRef.current) return;
    const L = window.L;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    items.forEach((place) => {
      const [lng, lat] = place.location?.coordinates || [];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const marker = L.marker([lat, lng]).addTo(mapRef.current);
      const popupContent = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = place.name;
      const description = document.createElement('p');
      description.textContent = place.short_description;
      popupContent.append(title, description);
      marker.bindPopup(popupContent);

      marker.on('click', () => {
        setSelectedPlace(place);
      });

      markersRef.current.push(marker);
    });
  };

  async function fetchPlaces() {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedRegion !== 'Todas') params.append('region', selectedRegion);
    if (selectedCategory !== 'Todas') params.append('category', selectedCategory);

    try {
      const res = await fetch(`/api/places?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPlaces(data);
          setAllPlacesBackup(data);
          updateMarkers(data);
        }
      }
    } catch (e) {
      console.error('Error al cargar puntos:', e);
    } finally {
      setLoading(false);
    }

    if (mapRef.current) {
      if (selectedRegion === 'La Fortuna / San Carlos') mapRef.current.setView([10.4633, -84.7031], 10);
      else if (selectedRegion === 'Manuel Antonio') mapRef.current.setView([9.3892, -84.1383], 11);
      else if (selectedRegion === 'Guanacaste') mapRef.current.setView([10.35, -85.65], 9);
      else if (selectedRegion === 'San José') mapRef.current.setView([9.9331, -84.08], 11);
      else mapRef.current.setView([9.9281, -84.0907], 8);
    }
  };

  function initMap() {
    if (!window.L || mapRef.current) return;

    const L = window.L;
    const map = L.map('map-container', {
      center: [9.9281, -84.0907],
      zoom: 8,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    map.on('click', (e: any) => {
      setClickedLatLng({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;
    fetchPlaces();
  };


  useEffect(() => {
    if (document.getElementById('leaflet-css')) {
      initMap();
      return;
    }

    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      initMap();
    };
    document.body.appendChild(script);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);


  useEffect(() => {
    if (mapRef.current) {
      fetchPlaces();
    }
  }, [selectedRegion, selectedCategory]);



  const handleFilterFromCopilot = (matchedIds: string[]) => {
    const filtered = allPlacesBackup.filter((p) => matchedIds.includes(p.id));
    if (filtered.length > 0) {
      setPlaces(filtered);
      updateMarkers(filtered);
    }
  };

  const handleResetMapFilter = () => {
    setPlaces(allPlacesBackup);
    updateMarkers(allPlacesBackup);
  };

  const handleAddNewPlace = (newPlace: Place) => {
    const updated = [newPlace, ...places];
    setPlaces(updated);
    setAllPlacesBackup([newPlace, ...allPlacesBackup]);
    updateMarkers(updated);
    setSelectedPlace(newPlace);
  };


  return (
    <div className="relative w-full h-screen flex flex-col md:flex-row overflow-hidden bg-slate-950 text-white font-sans">
      {/* PANEL LATERAL */}
      <div className="w-full md:w-96 z-20 bg-slate-900/95 backdrop-blur border-b md:border-r border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto max-h-[45vh] md:max-h-full shadow-2xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
              🧭 MapAI Costa Rica
            </h1>
            <p className="text-xs text-slate-400">{t("Exploración turística e historias por IA")}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsItineraryOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/40 font-bold px-2.5 py-1.5 rounded-lg text-xs shadow transition-all active:scale-95 flex items-center gap-1"
              title={t("Planear Ruta con IA")}
            >
              <span>🗺️</span> {t(" Ruta ")}</button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-2.5 py-1.5 rounded-lg text-xs shadow transition-all transform active:scale-95 flex items-center gap-1"
            >
              <span>💎</span> + Gema
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-300">{t("Región")}</label>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="bg-slate-800 text-sm border border-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-200"
          >
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-300">{t("Categoría")}</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-800 text-sm border border-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-200"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {selectedPlace ? (
          <div className="bg-slate-800/90 rounded-xl p-4 border border-emerald-500/40 flex flex-col gap-2.5 mt-2 shadow-lg">
            <div className="flex justify-between items-start">
              <h2 className="font-bold text-lg text-emerald-300">{selectedPlace.name}</h2>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                {selectedPlace.category}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{selectedPlace.short_description}</p>

            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-700/60 mt-1">
              <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1 mb-1">
                {t(" ✨ Guía Virtual IA ")}</span>
              <p className="text-xs text-slate-300 italic leading-relaxed">{selectedPlace.ai_story}</p>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
              <span>{t("💲 Est. $")}{selectedPlace.estimated_price_usd} USD</span>
              <span>⭐ {selectedPlace.rating || 4.8}</span>
            </div>

            <button
              onClick={() => currentUser ? setIsClaimModalOpen(true) : alert(t("Iniciá sesión desde el mapa principal para reclamar un negocio."))}
              className="mt-2 w-full bg-slate-900 hover:bg-slate-800 border border-amber-500/50 hover:border-amber-400 text-amber-300 font-semibold py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow"
            >
              <span>🏆</span> {t(" ¿Eres el dueño? Reclamar Negocio ")}</button>
          </div>
        ) : (
          <div className="text-xs text-slate-500 text-center py-8 border border-dashed border-slate-800 rounded-xl flex flex-col items-center gap-2">
            <span>{t("📍 Haz clic en cualquier marcador del mapa para desplegar los detalles e historia de la Guía Virtual.")}</span>
          </div>
        )}
      </div>

      {/* MAPA */}
      <div className="flex-1 w-full h-full relative z-10 bg-slate-950">
        <div id="map-container" className="w-full h-full" />
      </div>

      {/* COPILOTO IA */}
      <CopilotWidget
        allPlaces={allPlacesBackup}
        onFilterPlaces={handleFilterFromCopilot}
        onResetFilter={handleResetMapFilter}
      />

      {/* MODAL CROWDSOURCING */}
      <AddPlaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPlaceAdded={handleAddNewPlace}
        currentLatLng={clickedLatLng}
      />

      {/* MODAL RECLAMO B2B */}
      {selectedPlace && (
        <ClaimBusinessModal
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          key={selectedPlace.id}
          currentUser={currentUser}
          initialSpotId={selectedPlace.id}
          availableSpots={places.map(place => ({ id: place.id, title: place.name }))}
        />
      )}

      {/* MODAL ITINERARIOS IA */}
      <ItineraryModal
        isOpen={isItineraryOpen}
        onClose={() => setIsItineraryOpen(false)}
        selectedRegion={selectedRegion}
        onHighlightRoute={handleFilterFromCopilot}
      />
    </div>
  );
}

declare global {
  interface Window {
    L: any;
  }
}
