'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  X, 
  MapPin, 
  Clock, 
  Ticket, 
  Navigation, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  Compass
} from 'lucide-react';

interface SpotDetailCardProps {
  spot: any;
  onClose: () => void;
  currentUser: any;
  onRequireAuth: () => void;
}

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export default function SpotDetailCard({
  spot,
  onClose,
  currentUser,
  onRequireAuth
}: SpotDetailCardProps) {
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);

  // 1. Obtener distancia GPS del usuario
  useEffect(() => {
    if (navigator.geolocation && spot?.latitude && spot?.longitude) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const dist = calculateHaversineDistance(
            pos.coords.latitude,
            pos.coords.longitude,
            parseFloat(spot.latitude),
            parseFloat(spot.longitude)
          );
          setDistanceKm(dist);
        },
        (err) => console.log('Geolocalización no disponible:', err),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [spot]);

  // 2. Detener audio si el usuario cierra la tarjeta
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Control de Audio Guía por sintetizador de voz
  const toggleAudioGuide = () => {
    if (!('speechSynthesis' in window)) {
      alert('Tu navegador no soporta sintetizador de voz para la audio guía.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      window.speechSynthesis.cancel();
      const textToRead = `${spot.title}. Ubicado en ${spot.address_text || 'Costa Rica'}. ${spot.description}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = 'es-CR';
      utterance.rate = 0.95;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  // 3. Ejecutar Check-In con recompensa de puntos
  const handleCheckIn = async () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    setCheckInLoading(true);
    try {
      // Sumar 10 puntos al perfil del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', currentUser.id)
        .maybeSingle();

      const currentPoints = profile?.points || 0;

      await supabase
        .from('profiles')
        .update({ points: currentPoints + 10 })
        .eq('id', currentUser.id);

      setHasCheckedIn(true);
    } catch (err) {
      console.error('Error procesando check-in:', err);
    } finally {
      setCheckInLoading(false);
    }
  };

  const wazeUrl = `https://waze.com/ul?ll=${spot.latitude},${spot.longitude}&navigate=yes`;
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`;

  return (
    <div className="w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t md:border border-slate-200/80 dark:border-slate-800/80 rounded-t-3xl md:rounded-2xl p-4 shadow-2xl space-y-3.5 text-slate-900 dark:text-slate-100 max-h-[80vh] md:max-h-[calc(100vh-4.5rem)] overflow-y-auto custom-scrollbar">
      
      {/* Header de la Tarjeta */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-2.5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 text-[9px] uppercase font-extrabold rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
              {spot.category || 'Naturaleza'}
            </span>
            {distanceKm !== null && (
              <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                <Compass className="w-2.5 h-2.5 text-emerald-600" />
                A {distanceKm} km de vos
              </span>
            )}
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
            {spot.title}
          </h3>
        </div>

        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-xs transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Botones Principales de Acción (Navegación & Audio) */}
      <div className="grid grid-cols-3 gap-1.5">
        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 px-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-[10px] transition-all flex items-center justify-center gap-1 shadow-sm"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Waze</span>
        </a>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 px-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 font-bold text-[10px] transition-all flex items-center justify-center gap-1 shadow-sm"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Google Maps</span>
        </a>

        <button
          onClick={toggleAudioGuide}
          className={`py-2 px-2 rounded-xl font-bold text-[10px] transition-all flex items-center justify-center gap-1 border shadow-sm ${
            isPlayingAudio
              ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
          }`}
        >
          {isPlayingAudio ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span>{isPlayingAudio ? 'Pausar' : 'Audio Guía'}</span>
        </button>
      </div>

      {/* Datos Clave: Horario, Entrada y Dirección */}
      <div className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span><strong>Horario:</strong> {spot.opening_hours || 'Lunes a Domingo 8:00 AM - 4:00 PM'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Ticket className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span><strong>Entrada:</strong> {spot.entry_fee || 'Entrada Libre / Consultar tarifa local'}</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
          <span><strong>Dirección:</strong> {spot.address_text || 'Costa Rica'}</span>
        </div>
      </div>

      {/* Reseña / Descripción */}
      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5">
        {spot.description}
      </p>

      {/* Botón de Check-In con Recompensa de Puntos */}
      <div className="pt-1">
        {hasCheckedIn ? (
          <div className="py-2 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>¡Check-In Realizado! (+10 Pts sumados)</span>
          </div>
        ) : (
          <button
            onClick={handleCheckIn}
            disabled={checkInLoading}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>Hacer Check-In Aquí (+10 Pts)</span>
          </button>
        )}
      </div>

    </div>
  );
}