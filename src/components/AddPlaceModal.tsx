'use client';

import { useState, useEffect, useRef } from 'react';

interface AddPlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceAdded: (newPlace: any) => void;
  currentLatLng?: { lat: number; lng: number } | null;
}

export default function AddPlaceModal({ isOpen, onClose, onPlaceAdded, currentLatLng }: AddPlaceModalProps) {
  const [name, setName] = useState('');
  const [region, setRegion] = useState('San José');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [lat, setLat] = useState<number>(currentLatLng ? currentLatLng.lat : 9.9331);
  const [lng, setLng] = useState<number>(currentLatLng ? currentLatLng.lng : -84.0768);
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const miniMapRef = useRef<any>(null);
  const miniMarkerRef = useRef<any>(null);

  const [previousLocation, setPreviousLocation] = useState(currentLatLng);
  if (currentLatLng !== previousLocation) {
    setPreviousLocation(currentLatLng);
    if (currentLatLng) { setLat(currentLatLng.lat); setLng(currentLatLng.lng); }
  }

  // Inicializar y actualizar el mini-mapa dentro del modal
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined' || !window.L) return;

    const L = window.L;
    const timer = setTimeout(() => {
      const mapElement = document.getElementById('mini-map-picker');
      if (!mapElement) return;

      if (!miniMapRef.current) {
        const miniMap = L.map('mini-map-picker', {
          center: [lat, lng],
          zoom: 14,
          zoomControl: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
        }).addTo(miniMap);

        const marker = L.marker([lat, lng], { draggable: true }).addTo(miniMap);

        marker.on('dragend', (e: any) => {
          const position = e.target.getLatLng();
          setLat(position.lat);
          setLng(position.lng);
        });

        miniMap.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          setLat(e.latlng.lat);
          setLng(e.latlng.lng);
        });

        miniMapRef.current = miniMap;
        miniMarkerRef.current = marker;
      } else {
        miniMapRef.current.setView([lat, lng], miniMapRef.current.getZoom());
        miniMarkerRef.current.setLatLng([lat, lng]);
        miniMapRef.current.invalidateSize();
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  // FUNCIÓN GPS CORREGIDA CON RE-RENDERIZADO FORZADO DE LEAFLET
  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización GPS.');
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;

        setLat(newLat);
        setLng(newLng);
        setGettingLocation(false);

        // Actualización imperativa directa sobre la instancia de Leaflet
        if (miniMapRef.current && miniMarkerRef.current) {
          miniMapRef.current.setView([newLat, newLng], 15);
          miniMarkerRef.current.setLatLng([newLat, newLng]);
          miniMapRef.current.invalidateSize();
        }
      },
      (error) => {
        setGettingLocation(false);
        console.warn('⚠️ Error al obtener ubicación GPS:', error.message);
        alert('No se pudo obtener la posición GPS. Puedes seleccionar el punto arrastrando el pin en el mapa.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/places/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          region,
          raw_description: description,
          price,
          lat: lat.toString(),
          lng: lng.toString()
        })
      });

      const data = await res.json();
      if (data.success && data.newPlace) {
        onPlaceAdded(data.newPlace);
        onClose();
        setName('');
        setDescription('');
      }
    } catch (err) {
      alert('Error al guardar la gema. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-lg rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-white font-sans max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h2 className="font-bold text-lg text-emerald-400 flex items-center gap-2">
            💎 Añadir Gema Oculta
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
          <div>
            <label className="font-semibold text-slate-300 block mb-1">Nombre del Lugar / Rincón *</label>
            <input
              type="text"
              required
              placeholder="Ej: Mirador El Silencio / Soda Doña Mary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 outline-none focus:border-emerald-500 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Región</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 outline-none focus:border-emerald-500 text-slate-200"
              >
                <option value="San José">San José</option>
                <option value="La Fortuna / San Carlos">La Fortuna</option>
                <option value="Manuel Antonio">Manuel Antonio</option>
                <option value="Guanacaste">Guanacaste</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Precio Est. ($ USD)</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 outline-none focus:border-emerald-500 text-white"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-300 block mb-1">¿Por qué es especial? (Descripción corta)</label>
            <textarea
              rows={2}
              placeholder="Cuenta un secreto local, la mejor hora para ir o qué pedir de comer..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 outline-none focus:border-emerald-500 text-white"
            />
          </div>

          {/* SELECTOR DE UBICACIÓN VISUAL INTERACTIVO CON GPS */}
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-slate-300 flex items-center gap-1">
                📍 Ubicación Exacta:
              </label>
              <button
                type="button"
                onClick={handleGetGPS}
                disabled={gettingLocation}
                className="bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] px-2.5 py-1 rounded border border-emerald-500/30 flex items-center gap-1 transition-colors"
              >
                <span>{gettingLocation ? '🌀' : '🎯'}</span>
                <span>{gettingLocation ? 'Ubicando GPS...' : 'Usar mi GPS'}</span>
              </button>
            </div>

            {/* MINI MAPA INTERACTIVO */}
            <div className="w-full h-44 rounded-xl border border-slate-700 overflow-hidden relative shadow-inner bg-slate-950 mt-1">
              <div id="mini-map-picker" className="w-full h-full" />
              <div className="absolute bottom-2 left-2 z-[1000] bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-md text-[10px] text-slate-300 border border-slate-700 pointer-events-none font-mono">
                Lat: <span className="text-emerald-400">{lat.toFixed(5)}</span> | Lng: <span className="text-emerald-400">{lng.toFixed(5)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg font-semibold text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
            >
              {submitting ? 'Guardando...' : 'Guardar Gema'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
