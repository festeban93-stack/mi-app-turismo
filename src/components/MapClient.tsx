'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
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

// Icono personalizado para los puntos de la ruta del Copiloto IA
function createNumberedIcon(number: number) {
  return L.divIcon({
    className: 'custom-route-icon',
    html: `<div style="background-color: #06b6d4; color: #020617; font-weight: 900; font-size: 11px; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function MapController({ selectedSpot, routeSpots }: { selectedSpot: any; routeSpots?: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (selectedSpot && selectedSpot.latitude && selectedSpot.longitude) {
      map.flyTo([selectedSpot.latitude, selectedSpot.longitude], 14, { duration: 1.5 });
    } else if (routeSpots && routeSpots.length > 0) {
      const bounds = L.latLngBounds(routeSpots.map(s => [s.latitude, s.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true });
    }
  }, [selectedSpot, routeSpots, map]);

  return null;
}

interface MapClientProps {
  spots: any[];
  selectedSpot: any;
  onSelectSpot: (spot: any) => void;
  routeSpots?: any[];
}

export default function MapClient({ spots, selectedSpot, onSelectSpot, routeSpots = [] }: MapClientProps) {
  const defaultCenter: [number, number] = [9.7489, -83.7534];
  const defaultZoom = 8;

  // Extraer puntos válidos para trazar la línea de la ruta
  const routePolylineCoords: [number, number][] = routeSpots
    .filter(s => s.latitude && s.longitude)
    .map(s => [s.latitude, s.longitude]);

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

      <MapController selectedSpot={selectedSpot} routeSpots={routeSpots} />

      {/* Trazado de línea de la ruta cuando hay itinerario de IA activo */}
      {routePolylineCoords.length > 1 && (
        <Polyline
          positions={routePolylineCoords}
          pathOptions={{ color: '#06b6d4', weight: 4, opacity: 0.8, dashArray: '8, 8' }}
        />
      )}

      {/* Renderizar marcadores normales o de ruta */}
      {spots.map((spot) => {
        let lat = spot.latitude;
        let lng = spot.longitude;

        if (!lat || !lng) return null;

        const routeIndex = routeSpots.findIndex(rs => rs.id === spot.id);
        const isRouteSpot = routeIndex !== -1;
        const iconToUse = isRouteSpot ? createNumberedIcon(routeIndex + 1) : defaultIcon;

        return (
          <Marker
            key={spot.id || spot.title}
            position={[lat, lng]}
            icon={iconToUse}
            eventHandlers={{
              click: () => onSelectSpot(spot)
            }}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <p className="font-bold text-slate-900">{spot.title}</p>
                <p className="text-slate-600">{spot.address_text}</p>
                {isRouteSpot && (
                  <span className="inline-block text-[10px] bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded font-bold">
                    Parada #{routeIndex + 1} de la ruta
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}