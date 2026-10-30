'use client';
import { useLanguage } from '@/lib/i18n';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pickerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapEventsHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const { t } = useLanguage();
  const currentCenter: [number, number] = [lat || 9.7489, lng || -83.7534];

  return (
    <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-700 shadow-inner relative z-0">
      <MapContainer
        center={currentCenter}
        zoom={12}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEventsHandler onSelect={onChange} />
        <MapCenterController center={currentCenter} />
        {lat && lng ? <Marker position={[lat, lng]} icon={pickerIcon} /> : null}
      </MapContainer>
      <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-slate-300 border border-slate-800 text-center pointer-events-none z-10">
        {t(" 👉 Tocá o hacé clic en cualquier punto del mapa para fijar el pin ")}</div>
    </div>
  );
}