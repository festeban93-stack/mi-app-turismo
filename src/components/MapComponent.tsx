'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Spot } from './SpotCardPreview';

// Correccion de iconos por defecto de Leaflet en Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

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
      zoom={11}
      scrollWheelZoom={true}
      className="w-full h-full z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      {selectedSpot && (
        <MapRecenter center={[selectedSpot.latitude, selectedSpot.longitude]} />
      )}

      {spots.map((spot) => (
        <Marker
          key={spot.id}
          position={[spot.latitude, spot.longitude]}
          eventHandlers={{
            click: () => onSelectSpot(spot),
          }}
        >
          <Popup>
            <div className="p-1 font-sans">
              <h4 className="font-bold text-slate-900 text-sm">{spot.title}</h4>
              <p className="text-xs text-slate-600 line-clamp-2">{spot.description}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}