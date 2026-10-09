'use client';

import { useState } from 'react';

interface ClaimBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  placeName: string;
  placeId: string;
}

export default function ClaimBusinessModal({ isOpen, onClose, placeName, placeId }: ClaimBusinessModalProps) {
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/places/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: placeId,
          owner_name: ownerName,
          owner_email: email,
          owner_phone: phone
        })
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      }
    } catch (err) {
      alert('Error enviando la solicitud. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-amber-500/40 w-full max-w-md rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-white font-sans">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h2 className="font-bold text-base text-amber-400 flex items-center gap-2">
            🏆 Reclamar "{placeName}"
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center text-center gap-3 py-6">
            <span className="text-4xl">🎉</span>
            <h3 className="font-bold text-emerald-400 text-sm">¡Solicitud B2B Enviada!</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Verificaremos tu relación con <strong className="text-white">{placeName}</strong> y te daremos acceso al Panel de Administración B2B para personalizar menú, precios y publicar ofertas destacadas.
            </p>
            <button
              onClick={onClose}
              className="mt-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-lg text-xs"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
            <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              ¿Eres el dueño o administrador de este establecimiento? Reclama tu perfil para responder opiniones, actualizar tu WhatsApp directo y activar el **Pin Promocional**.
            </p>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Nombre Completo del Responsable *</label>
              <input
                type="text"
                required
                placeholder="Ej: Carlos Valverde"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 outline-none focus:border-amber-500 text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Correo Electrónico de Contacto *</label>
              <input
                type="email"
                required
                placeholder="ejemplo@comercio.cr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 outline-none focus:border-amber-500 text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Teléfono / WhatsApp de Negocio *</label>
              <input
                type="tel"
                required
                placeholder="+506 8888-8888"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 outline-none focus:border-amber-500 text-white"
              />
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg font-semibold text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg transition-colors"
              >
                {submitting ? 'Enviando...' : 'Verificar Negocio'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
