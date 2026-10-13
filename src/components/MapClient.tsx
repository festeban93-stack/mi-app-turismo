'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icono Azul Estándar
const defaultIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Función para crear marcadores numerados de ruta (1, 2, 3...)
function createNumberedRouteIcon(index: number) {
  return L.divIcon({
    className: 'custom-route-marker',
    html: `<div style="
      background-color: #059669;
      color: white;
      font-weight: 900;
      font-size: 11px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid white;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    ">${index + 1}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

interface MapClientProps {
  spots: any[];
  selectedSpot?: any;
  onSelectSpot: (spot: any) => void;
  routeSpots?: any[];
}

function MapController({ routeSpots, selectedSpot }: { routeSpots?: any[]; selectedSpot?: any }) {
  const map = useMap();

  useEffect(() => {
    if (selectedSpot?.latitude && selectedSpot?.longitude) {
      const lat = parseFloat(selectedSpot.latitude);
      const lon = parseFloat(selectedSpot.longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        map.flyTo([lat, lon], 14, { duration: 1.2 });
      }
    } else if (routeSpots && routeSpots.length > 0) {
      const validCoords = routeSpots
        .filter(s => s?.latitude && s?.longitude)
        .map(s => [parseFloat(s.latitude), parseFloat(s.longitude)] as [number, number])
        .filter(c => !isNaN(c[0]) && !isNaN(c[1]));

      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [70, 70], maxZoom: 14, animate: true });
      }
    }
  }, [routeSpots, selectedSpot, map]);

  return null;
}

export default function MapClient({ spots, selectedSpot, onSelectSpot, routeSpots = [] }: MapClientProps) {
  const defaultCenter: [number, number] = [9.7489, -83.7534];

  // Coordenadas ordenadas para la polínea
  const routePolylineCoords = routeSpots
    .filter(s => s?.latitude && s?.longitude)
    .map(s => [parseFloat(s.latitude), parseFloat(s.longitude)] as [number, number])
    .filter(c => !isNaN(c[0]) && !isNaN(c[1]));

  return (
    <MapContainer
      center={defaultCenter}
      zoom={8}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController routeSpots={routeSpots} selectedSpot={selectedSpot} />

      {/* Polínea de Ruta Trazada */}
      {routePolylineCoords.length > 1 && (
        <Polyline
          positions={routePolylineCoords}
          pathOptions={{ color: '#059669', weight: 5, dashArray: '6, 8', opacity: 0.95 }}
        />
      )}

      {/* Renderizado de Gemas Estándar */}
      {spots.map((spot) => {
        if (!spot.latitude || !spot.longitude) return null;
        const lat = parseFloat(spot.latitude);
        const lon = parseFloat(spot.longitude);
        if (isNaN(lat) || isNaN(lon)) return null;

        const routeIndex = routeSpots.findIndex(r => r.id === spot.id);
        const isPartOfRoute = routeIndex !== -1;

        return (
          <Marker
            key={spot.id}
            position={[lat, lon]}
            icon={isPartOfRoute ? createNumberedRouteIcon(routeIndex) : defaultIcon}
            eventHandlers={{
              click: () => onSelectSpot(spot),
            }}
          >
            <Popup>
              <div className="p-1 text-xs space-y-1 font-sans">
                <strong className="block text-slate-900 font-extrabold">{spot.title}</strong>
                <p className="text-slate-600 text-[10px]">{spot.address_text || 'Costa Rica'}</p>
                {isPartOfRoute && (
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold">
                    Parada #{routeIndex + 1} de la Ruta
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