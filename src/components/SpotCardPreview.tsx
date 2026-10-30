'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface Spot {
  id: string;
  title: string;
  description: string;
  category: string;
  images?: string[];
  rating_avg: number;
  distance_meters: number;
  latitude: number;
  longitude: number;
  opening_hours?: string;
  entry_fee?: string;
  address_text?: string;
  checkins_count?: number;
}

interface SpotCardPreviewProps {
  spot: Spot;
  userCoords: { lat: number; lng: number } | null;
  onClose?: () => void;
}

export default function SpotCardPreview({ spot, userCoords, onClose }: SpotCardPreviewProps) {
  const [checkinStatus, setCheckinStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [localCheckinCount, setLocalCheckinCount] = useState(spot.checkins_count || 0);

  const handleCheckIn = async () => {
    if (!userCoords) {
      setErrorMessage('Debes activar el acceso a tu GPS para hacer Check-in.');
      setCheckinStatus('error');
      return;
    }

    setCheckinStatus('loading');
    setErrorMessage('');

    const R = 6371e3;
    const phi1 = (userCoords.lat * Math.PI) / 180;
    const phi2 = (spot.latitude * Math.PI) / 180;
    const deltaPhi = ((spot.latitude - userCoords.lat) * Math.PI) / 180;
    const deltaLambda = ((spot.longitude - userCoords.lng) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distToSpotMeters = R * c;

    if (distToSpotMeters > 500) {
      setErrorMessage(`Estás demasiado lejos (${(distToSpotMeters / 1000).toFixed(1)} km). Debes estar a menos de 500m del lugar.`);
      setCheckinStatus('error');
      return;
    }

    const { error } = await supabase.from('checkins').insert({
      spot_id: spot.id,
      user_lat: userCoords.lat,
      user_lng: userCoords.lng,
    });

    if (error) {
      setErrorMessage('Error: ' + error.message);
      setCheckinStatus('error');
    } else {
      setCheckinStatus('success');
      setLocalCheckinCount((prev) => prev + 1);
    }
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-2xl text-slate-100 max-w-md w-full space-y-4">
      <div className="flex justify-between items-start gap-2">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-1">
            {spot.category}
          </span>
          <h3 className="text-lg font-bold text-white leading-tight">{spot.title}</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 text-lg">
            ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="text-base">🕒</span>
          <div>
            <span className="font-semibold text-slate-400 block text-[10px]">HORARIO DE ATENCIÓN</span>
            <span>{spot.opening_hours || 'Sin confirmar'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-300 border-t border-slate-700/50 pt-2">
          <span className="text-base">🎟️</span>
          <div>
            <span className="font-semibold text-slate-400 block text-[10px]">COSTO / ENTRADA</span>
            <span className="text-emerald-400 font-medium">{spot.entry_fee || 'Tarifa sin confirmar'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-300 border-t border-slate-700/50 pt-2">
          <span className="text-base">📍</span>
          <div>
            <span className="font-semibold text-slate-400 block text-[10px]">DIRECCIÓN Y UBICACIÓN</span>
            <span>{spot.address_text || 'Costa Rica'}</span>
            <span className="text-[10px] text-cyan-400 block mt-0.5 font-mono">
              a {(spot.distance_meters / 1000).toFixed(1)} km de ti
            </span>
          </div>
        </div>
      </div>

      {spot.description && (
        <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
          {spot.description}
        </p>
      )}

      <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span className="flex items-center gap-1">
            📍 <strong className="text-white">{localCheckinCount}</strong> Exploradores han hecho Check-in
          </span>
          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-cyan-300">
            +50 Pts
          </span>
        </div>

        {checkinStatus === 'success' ? (
          <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs p-2.5 rounded-xl text-center font-semibold">
            ¡Check-in registrado con éxito! 🎉 +50 Puntos de Explorador.
          </div>
        ) : (
          <button
            onClick={handleCheckIn}
            disabled={checkinStatus === 'loading'}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {checkinStatus === 'loading' ? (
              <span>Validando GPS...</span>
            ) : (
              <>
                <span>📍</span>
                <span>Hacer Check-in Aquí (Verificar Presencia)</span>
              </>
            )}
          </button>
        )}

        {checkinStatus === 'error' && (
          <p className="text-[11px] text-rose-400 text-center bg-rose-950/40 border border-rose-800/40 p-2 rounded-lg">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
