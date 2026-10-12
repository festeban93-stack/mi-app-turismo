'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Spot } from './SpotCardPreview';

const createCustomIcon = (category: string) => {
  const categoryEmojis: Record<string, string> = {
    gastronomia: '🍲',
    naturaleza: '🌲',
    aventura: '🏄',
    cultura: '🎭',
    hospedaje: '🏨',
  };

  const emoji = categoryEmojis[category] || '📍';

  return L.divIcon({
    className: 'custom-map-pin',
    html: `<div class="relative flex items-center justify-center w-10 h-10 bg-slate-900 text-white rounded-full border-2 border-cyan-400 shadow-lg shadow-cyan-500/50 hover:scale-125 transition-transform cursor-pointer text-lg">
      <span>${emoji}</span>
      <span class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rotate-45"></span>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

interface MapComponentProps {
  spots: Spot[];
  selectedSpot: Spot | null;
  userCoords: { lat: number; lng: number } | null;
  onSelectSpot: (spot: Spot) => void;
}

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function MapComponent({
  spots,
  selectedSpot,
  userCoords,
  onSelectSpot,
}: MapComponentProps) {
  const defaultCenter: [number, number] = userCoords
    ? [userCoords.lat, userCoords.lng]
    : [9.9281, -84.0907];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={9}
      scrollWheelZoom={true}
      className="w-full h-full z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {selectedSpot && (
        <MapRecenter center={[selectedSpot.latitude, selectedSpot.longitude]} />
      )}

      {spots.map((spot) => (
        <Marker
          key={spot.id}
          position={[spot.latitude, spot.longitude]}
          icon={createCustomIcon(spot.category)}
          eventHandlers={{
            click: () => onSelectSpot(spot),
          }}
        >
          <Popup>
            <div className="p-1 font-sans">
              <span className="text-[10px] uppercase font-bold text-cyan-600 block mb-0.5">
                {spot.category}
              </span>
              <h4 className="font-bold text-slate-900 text-sm">{spot.title}</h4>
              <p className="text-xs text-slate-600 line-clamp-2 mt-1">{spot.description}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}