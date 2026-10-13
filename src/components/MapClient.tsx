'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapController({ selectedSpot }: { selectedSpot: any }) {
  const map = useMap();

  useEffect(() => {
    if (selectedSpot && selectedSpot.latitude && selectedSpot.longitude) {
      map.flyTo([selectedSpot.latitude, selectedSpot.longitude], 14, {
        duration: 1.5
      });
    }
  }, [selectedSpot, map]);

  return null;
}

interface MapClientProps {
  spots: any[];
  selectedSpot: any;
  onSelectSpot: (spot: any) => void;
}

export default function MapClient({ spots, selectedSpot, onSelectSpot }: MapClientProps) {
  const defaultCenter: [number, number] = [9.7489, -83.7534];
  const defaultZoom = 8;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="w-full h-full z-0"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController selectedSpot={selectedSpot} />

      {spots.map((spot) => {
        let lat = spot.latitude;
        let lng = spot.longitude;

        if (!lat || !lng) return null;

        return (
          <Marker
            key={spot.id || spot.title}
            position={[lat, lng]}
            icon={defaultIcon}
            eventHandlers={{
              click: () => onSelectSpot(spot)
            }}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <p className="font-bold text-slate-900">{spot.title}</p>
                <p className="text-slate-600">{spot.address_text}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}