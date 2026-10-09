"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { places } from "@/data/places";

const createCategoryIcon = (color: string) => {
  return L.divIcon({
    className: "custom-pin",
    html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const categoryColors: Record<string, string> = {
  comida: "#EF4444",
  aventura: "#F59E0B",
  cultura: "#8B5CF6",
  naturaleza: "#10B981"
};

// Función auxiliar para obtener latitud y longitud sin importar cómo estén nombradas en el objeto
const getCoordinates = (place: any): [number, number] | null => {
  const lat = place.lat ?? place.latitude ?? (Array.isArray(place.coordinates) ? place.coordinates[0] : undefined);
  const lng = place.lng ?? place.longitude ?? (Array.isArray(place.coordinates) ? place.coordinates[1] : undefined);

  if (typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng)) {
    return [lat, lng];
  }
  return null;
};

export default function Map() {
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);

  const center: [number, number] = [9.7489, -83.7534]; // Centro de Costa Rica

  return (
    <div className="relative h-[calc(100vh-100px)] w-full rounded-2xl overflow-hidden shadow-xl border border-gray-100">
      <MapContainer center={center} zoom={8} scrollWheelZoom={true} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {places.map((place: any, index: number) => {
          const coords = getCoordinates(place);
          if (!coords) return null; // Ignora elementos con coordenadas inválidas para evitar fallos

          return (
            <Marker
              key={place.id || index}
              position={coords}
              icon={createCategoryIcon(categoryColors[place.category?.toLowerCase()] || "#3B82F6")}
              eventHandlers={{
                click: () => {
                  setSelectedPlace(place);
                  setCheckedIn(false);
                },
              }}
            >
              <Popup>
                <div className="text-center">
                  <h3 className="font-bold text-slate-800">{place.name || place.title}</h3>
                  <p className="text-xs text-slate-500 capitalize">{place.category}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Drawer / Panel lateral de detalles del lugar */}
      {selectedPlace && (
        <div className="absolute right-4 top-4 bottom-4 w-80 md:w-96 bg-white z-[1000] rounded-2xl shadow-2xl p-6 overflow-y-auto border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                {selectedPlace.category}
              </span>
              <button
                onClick={() => setSelectedPlace(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedPlace.name || selectedPlace.title}</h2>
            <p className="text-slate-600 text-sm mb-4">{selectedPlace.description}</p>

            {/* Guía Turístico por Check-in */}
            {checkedIn && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 my-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎧</span>
                  <h4 className="font-bold text-amber-900 text-sm">Guía Turístico IA</h4>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed mb-3">
                  {selectedPlace.history || selectedPlace.details || "¡Bienvenido a este increíble lugar! Aquí verás la narración histórica, secretos del sitio y la historia de sus platillos estrella."}
                </p>
                <button className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs py-2 rounded-lg font-medium transition-all">
                  ▶ Escuchar Audioguía
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100">
            {!checkedIn ? (
              <button
                onClick={() => setCheckedIn(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>📍</span> Hacer Check-in aquí
              </button>
            ) : (
              <p className="text-center text-xs font-medium text-emerald-600">
                ✓ ¡Check-in confirmado! Disfruta de la guía.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}