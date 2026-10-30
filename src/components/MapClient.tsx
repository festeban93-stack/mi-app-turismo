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

// Icono Azul Estándar Elegante
const defaultIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Marcadores Estilizados tipo Pin con Número de Orden (Pin Vectorial Pro)
function createNumberedRouteIcon(index: number, totalSpots: number) {
  const isStart = index === 0;
  const isEnd = index === totalSpots - 1;

  const badgeColor = isStart ? '#10b981' : isEnd ? '#f43f5e' : '#059669';
  const labelText = isStart ? '1' : `${index + 1}`;

  const svgMarker = `
    <div style="position: relative; width: 36px; height: 46px; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.35));">
      <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 0C8.05887 0 0 8.05887 0 18C0 31.5 18 46 18 46C18 46 36 31.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="${badgeColor}"/>
        <circle cx="18" cy="18" r="13" fill="#ffffff"/>
      </svg>
      <span style="
        position: absolute;
        top: 7px;
        font-family: system-ui, -apple-system, sans-serif;
        font-weight: 900;
        font-size: 13px;
        color: ${badgeColor};
        line-height: 1;
        user-select: none;
      ">${labelText}</span>
    </div>
  `;

  return L.divIcon({
    className: 'custom-pin-marker',
    html: svgMarker,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -42]
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
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      const coords = (routeSpots || []).filter(s=>s.latitude!=null && s.longitude!=null).map(s=>[Number(s.latitude),Number(s.longitude)] as [number,number]).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
      if (!selectedSpot && coords.length) map.fitBounds(coords, {padding:[24,24],maxZoom:13});
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map,routeSpots,selectedSpot]);

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
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14, animate: true });
      }
    }
  }, [routeSpots, selectedSpot, map]);

  return null;
}

export default function MapClient({ spots, selectedSpot, onSelectSpot, routeSpots = [] }: MapClientProps) {
  const defaultCenter: [number, number] = [9.7489, -83.7534];

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

      {/* Capa Base de Sombra para la Polínea */}
      {routePolylineCoords.length > 1 && (
        <>
          <Polyline
            positions={routePolylineCoords}
            pathOptions={{ color: '#0f172a', weight: 8, opacity: 0.3 }}
          />
          <Polyline
            positions={routePolylineCoords}
            pathOptions={{ color: '#10b981', weight: 5, dashArray: '8, 10', opacity: 0.95, lineCap: 'round' }}
          />
        </>
      )}

      {/* Renderizado de Gemas */}
      {spots.filter(spot => !routeSpots.some(r => r.id === spot.id)).map((spot) => {
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
            icon={isPartOfRoute ? createNumberedRouteIcon(routeIndex, routeSpots.length) : defaultIcon}
            eventHandlers={{
              click: () => onSelectSpot(spot),
            }}
          >
            <Popup>
              <div className="p-1.5 text-xs space-y-1 font-sans">
                <div className="flex items-center gap-1.5">
                  {isPartOfRoute && (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-extrabold text-[10px] flex items-center justify-center">
                      {routeIndex + 1}
                    </span>
                  )}
                  <strong className="block text-slate-900 font-extrabold leading-snug">{spot.title}</strong>
                </div>
                <p className="text-slate-500 text-[10px]">{spot.address_text || 'Costa Rica'}</p>
                {isPartOfRoute && (
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold border border-emerald-300">
                    {routeIndex === 0 ? '🏁 Inicio de la Ruta' : routeIndex === routeSpots.length - 1 ? '🎯 Destino Final' : `Parada #${routeIndex + 1}`}
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
      {routeSpots.filter(s => Number.isFinite(Number(s.latitude)) && Number.isFinite(Number(s.longitude))).map((spot,index) => (
        <Marker key={`route-${index}`} position={[Number(spot.latitude),Number(spot.longitude)]} icon={createNumberedRouteIcon((spot.routeNumber || index+1)-1, routeSpots.length)}>
          <Popup><strong>Parada {spot.routeNumber || index+1}: {spot.title}</strong><p>{spot.address_text || ''}</p></Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}