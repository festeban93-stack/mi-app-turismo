'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Corregir icono por defecto de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icono Estándar
const defaultIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Icono Destacado para Ruta de IA / Viaje
const routeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapClientProps {
  spots: any[];
  selectedSpot?: any;
  onSelectSpot: (spot: any) => void;
  routeSpots?: any[];
}

// Componente para controlar la cámara y zoom en el mapa
function MapController({ routeSpots, selectedSpot }: { routeSpots?: any[]; selectedSpot?: any }) {
  const map = useMap();

  useEffect(() => {
    if (selectedSpot?.latitude && selectedSpot?.longitude) {
      map.flyTo([parseFloat(selectedSpot.latitude), parseFloat(selectedSpot.longitude)], 14, { duration: 1.5 });
    } else if (routeSpots && routeSpots.length > 0) {
      const validCoords = routeSpots
        .filter(s => s?.latitude && s?.longitude)
        .map(s => [parseFloat(s.latitude), parseFloat(s.longitude)] as [number, number]);

      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
      }
    }
  }, [routeSpots, selectedSpot, map]);

  return null;
}

export default function MapClient({ spots, selectedSpot, onSelectSpot, routeSpots = [] }: MapClientProps) {
  // Centro por defecto: Costa Rica
  const defaultCenter: [number, number] = [9.7489, -83.7534];

  // Coordenadas para la línea de ruta
  const routePolylineCoords = routeSpots
    .filter(s => s?.latitude && s?.longitude)
    .map(s => [parseFloat(s.latitude), parseFloat(s.longitude)] as [number, number]);

  return (
    <MapContainer
      center={defaultCenter}
      zoom={8}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController routeSpots={routeSpots} selectedSpot={selectedSpot} />

      {/* Línea Verde de Ruta Trazada */}
      {routePolylineCoords.length > 1 && (
        <Polyline
          positions={routePolylineCoords}
          pathOptions={{ color: '#059669', weight: 4, dashArray: '8, 8', opacity: 0.8 }}
        />
      )}

      {/* Renderizado de Gemas */}
      {spots.map((spot) => {
        if (!spot.latitude || !spot.longitude) return null;
        const lat = parseFloat(spot.latitude);
        const lon = parseFloat(spot.longitude);
        if (isNaN(lat) || isNaN(lon)) return null;

        const isPartOfRoute = routeSpots.some(r => r.id === spot.id);

        return (
          <Marker
            key={spot.id}
            position={[lat, lon]}
            icon={isPartOfRoute ? routeIcon : defaultIcon}
            eventHandlers={{
              click: () => onSelectSpot(spot),
            }}
          >
            <Popup>
              <div className="p-1 text-xs space-y-1 font-sans">
                <strong className="block text-slate-900 font-extrabold">{spot.title}</strong>
                <p className="text-slate-600 text-[10px]">{spot.address_text || 'Costa Rica'}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}