'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
  X, 
  MapPin, 
  Navigation, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  Loader2,
  Compass,
  Utensils,
  Mountain,
  Waves,
  Camera,
  Image as ImageIcon,
  Trash2,
  Map,
  Link2
} from 'lucide-react';

const MapPickerWithNoSSR = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center text-slate-500 text-xs animate-pulse">
      Cargando mapa selector...
    </div>
  ),
});

interface AddSpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpotAdded: (newSpot: any) => void;
}

export default function AddSpotModal({ isOpen, onClose, onSpotAdded }: AddSpotModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('naturaleza');
  const [description, setDescription] = useState('');
  const [addressText, setAddressText] = useState('');
  const [nickname, setNickname] = useState('');

  // Modo de Ubicación: 'gps' | 'manual'
  const [locationMode, setLocationMode] = useState<'gps' | 'manual'>('gps');
  const [rawLocationInput, setRawLocationInput] = useState('');

  // Coordenadas
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Estados de Imagen
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rewardData, setRewardData] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (locationMode === 'gps') fetchGPSLocation();
    } else {
      resetForm();
    }
  }, [isOpen, locationMode]);

  const fetchGPSLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Tu dispositivo no soporta geolocalización GPS.');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        setLocationError('No se pudo obtener el GPS automáticamente. Podés seleccionar en el mapa.');
        if (!latitude) {
          setLatitude(9.9281);
          setLongitude(-84.0907);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Parser para Links de Google Maps o Coordenadas "9.9321, -84.0812"
  const handleParseLocationInput = (inputVal: string) => {
    setRawLocationInput(inputVal);
    if (!inputVal.trim()) return;

    // Detectar patrón @lat,lng en URLs de Google Maps
    const gmapsMatch = inputVal.match(/@([-\d.]+),([-\d.]+)/);
    if (gmapsMatch) {
      const parsedLat = parseFloat(gmapsMatch[1]);
      const parsedLng = parseFloat(gmapsMatch[2]);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        setLatitude(parsedLat);
        setLongitude(parsedLng);
        return;
      }
    }

    // Detectar patrón "lat, lng" o "lat lng"
    const coordsMatch = inputVal.match(/([-\d.]+)[,\s]+([-\d.]+)/);
    if (coordsMatch) {
      const parsedLat = parseFloat(coordsMatch[1]);
      const parsedLng = parseFloat(coordsMatch[2]);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        setLatitude(parsedLat);
        setLongitude(parsedLng);
        return;
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreviewUrl = URL.createObjectURL(file);
    setImagePreview(localPreviewUrl);
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success && data.imageUrl) {
        setImageUrl(data.imageUrl);
      } else {
        alert(`Error subiendo imagen: ${data.error || 'Falló la carga'}`);
        setImagePreview(null);
      }
    } catch (err: any) {
      alert(`Error al subir imagen: ${err?.message}`);
      setImagePreview(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setCategory('naturaleza');
    setDescription('');
    setAddressText('');
    setNickname('');
    setImageUrl('');
    setImagePreview(null);
    setLatitude(null);
    setLongitude(null);
    setLocationMode('gps');
    setRawLocationInput('');
    setRewardData(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !latitude || !longitude || !imageUrl) return;

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/spots/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          description,
          address_text: addressText,
          latitude,
          longitude,
          explorer_nickname: nickname,
          image_url: imageUrl
        })
      });

      const data = await res.json();

      if (data.success) {
        setRewardData(data);
        if (onSpotAdded) onSpotAdded(data.spot);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error al registrar gema: ${err?.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col">
        
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">Reportar Gema Oculta</h3>
              <p className="text-[11px] text-slate-400">Verificación con evidencia fotográfica</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
          
          {rewardData ? (
            /* Pantalla de Éxito */
            <div className="py-6 text-center space-y-4 animate-scale-up">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>

              <div className="space-y-1">
                <h4 className="text-xl font-black text-white">¡Gema Enviada a Verificación!</h4>
                <p className="text-xs text-slate-300">
                  Gracias <span className="font-bold text-cyan-400">{rewardData.spot?.explorer_nickname}</span>. Tu foto e información están en revisión.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 space-y-2 max-w-xs mx-auto shadow-inner">
                <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-extrabold">
                  <Award className="w-4 h-4" />
                  <span>+50 Pts acreditados tras aprobación</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-xs shadow-lg hover:brightness-110 transition-all"
              >
                Volver al Mapa Interactivo
              </button>
            </div>
          ) : (
            /* Formulario */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* MODALIDAD DE UBICACIÓN (GPS VS MANUAL/MAPA) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Ubicación del Lugar *</label>
                
                {/* Selector de Pestañas */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setLocationMode('gps')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      locationMode === 'gps'
                        ? 'bg-cyan-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>GPS Automático</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocationMode('manual')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      locationMode === 'manual'
                        ? 'bg-cyan-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>Elegir en Mapa</span>
                  </button>
                </div>

                {/* Contenido según el Modo */}
                {locationMode === 'gps' ? (
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-xs">
                      <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-slate-200">Coordenadas GPS:</span>
                        <p className="text-[10px] text-slate-400">
                          {isGettingLocation ? (
                            <span className="inline-flex items-center gap-1 text-cyan-400">
                              <Loader2 className="w-3 h-3 animate-spin" /> Capturando GPS...
                            </span>
                          ) : latitude && longitude ? (
                            <span className="text-emerald-400 font-mono">
                              {latitude.toFixed(4)}, {longitude.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-amber-400">Sin GPS</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={fetchGPSLocation}
                      disabled={isGettingLocation}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300 flex items-center gap-1 transition-colors flex-shrink-0"
                    >
                      <Navigation className="w-3 h-3 text-cyan-400" />
                      <span>Recapturar</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                    
                    {/* Pegar Enlace o Coordenadas */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Link2 className="w-3 h-3 text-cyan-400" />
                        <span>Pegá link de Google Maps o coordenadas "lat, lng":</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: https://maps.app.goo.gl/... o 9.9321, -84.0812"
                        value={rawLocationInput}
                        onChange={(e) => handleParseLocationInput(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500"
                      />
                    </div>

                    {/* Mini Mapa Picker */}
                    <MapPickerWithNoSSR
                      lat={latitude || 9.7489}
                      lng={longitude || -83.7534}
                      onChange={(newLat, newLng) => {
                        setLatitude(newLat);
                        setLongitude(newLng);
                      }}
                    />

                    {/* Indicadores Numéricos */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400">Latitud:</span>
                        <input
                          type="number"
                          step="0.0001"
                          value={latitude || ''}
                          onChange={(e) => setLatitude(parseFloat(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">Longitud:</span>
                        <input
                          type="number"
                          step="0.0001"
                          value={longitude || ''}
                          onChange={(e) => setLongitude(parseFloat(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* FOTOGRAFÍA: CÁMARA O GALERÍA */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Foto del Lugar (Evidencia) *</span>
                  {imageUrl && <span className="text-[10px] text-emerald-400 font-bold">✓ Subida con éxito</span>}
                </label>

                {imagePreview ? (
                  <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
                    <img
                      src={imagePreview}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                    />
                    {isUploadingImage && (
                      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center text-xs text-cyan-400 font-bold gap-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Subiendo a la nube...</span>
                      </div>
                    )}
                    {!isUploadingImage && (
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setImageUrl('');
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 text-rose-400 hover:text-rose-300 border border-slate-800 backdrop-blur-md transition-all shadow-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 hover:bg-slate-800/60 hover:border-cyan-500/50 text-slate-300 hover:text-white transition-all group"
                    >
                      <Camera className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold">Tomar Foto (Cámara)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 hover:bg-slate-800/60 hover:border-emerald-500/50 text-slate-300 hover:text-white transition-all group"
                    >
                      <ImageIcon className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold">Elegir de Galería</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Nombre de la Gema */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nombre de la Gema Oculta *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mirador Valle del Sol, Soda Doña Rosa..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:outline-none text-xs text-white"
                />
              </div>

              {/* Categorías */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Categoría</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'gastronomia', label: 'Gastronomía', icon: Utensils },
                    { id: 'naturaleza', label: 'Naturaleza', icon: Mountain },
                    { id: 'aventura', label: 'Aventura', icon: Waves },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cantón y Apodo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Cantón / Zona</label>
                  <input
                    type="text"
                    placeholder="Ej: Bajos de Toro, Sarchí"
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Tu Apodo de Explorador</label>
                  <input
                    type="text"
                    placeholder="Ej: Esteban R."
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              </div>

              {/* Banner Gamificado */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/50 to-cyan-950/50 border border-emerald-500/30 flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 animate-bounce" />
                <p className="text-[11px] text-slate-300 leading-snug">
                  Ganarás <strong className="text-emerald-400">+50 Pts</strong> y la insignia <strong className="text-cyan-400">Pionero Local</strong> tras ser verificada.
                </p>
              </div>

              {/* Botón de Envío */}
              <button
                type="submit"
                disabled={isSubmitting || isUploadingImage || !title || !imageUrl || !latitude || !longitude}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando a moderación...</span>
                  </>
                ) : (
                  <span>🔒 Enviar a Verificación (+50 Pts)</span>
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}