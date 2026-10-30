'use client';
import { useLanguage } from '@/lib/i18n';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Store, Send, CheckCircle2, Building2, Phone, FileText, Loader2 } from 'lucide-react';

interface ClaimBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  availableSpots?: any[];
  initialSpotId?: string;
}

export default function ClaimBusinessModal({
  isOpen,
  onClose,
  currentUser,
  availableSpots = [],
  initialSpotId = ''
}: ClaimBusinessModalProps) {
  const { t } = useLanguage();
  const [selectedSpotId, setSelectedSpotId] = useState<string>(initialSpotId);
  const [customBusinessName, setCustomBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setErrorMsg(t("Por favor ingresá un número de WhatsApp o teléfono de contacto."));
      return;
    }

    const spotObj = availableSpots.find(s => s.id === selectedSpotId);
    const finalBusinessName = spotObj ? spotObj.title : customBusinessName;

    if (!finalBusinessName.trim()) {
      setErrorMsg(t("Por favor seleccioná un comercio existente o ingresá el nombre de tu local."));
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.from('business_claims').insert([
        {
          user_id: currentUser.id,
          spot_id: selectedSpotId || null,
          business_name: finalBusinessName,
          contact_phone: phone,
          contact_email: currentUser.email,
          tax_id_or_identification: taxId,
          additional_notes: notes,
          status: 'pending'
        }
      ]);

      if (error) throw error;

      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al enviar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setSuccess(false);
    setErrorMsg(null);
    setSelectedSpotId('');
    setCustomBusinessName('');
    setPhone('');
    setTaxId('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 p-5 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {t(" Reclamar mi Comercio B2B ")}</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{t("Verificación Oficial en MapAI")}</p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
              {t(" ¡Solicitud Recibida! ")}</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed">
              {t(" Nuestro equipo revisará la información de tu comercio y te contactaremos por WhatsApp o correo en menos de 24 horas para verificar tu perfil B2B. ")}</p>
            <button
              onClick={handleResetAndClose}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
            >
              {t(" Entendido ")}</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            {errorMsg && (
              <p className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 text-[10px] font-medium">
                ⚠️ {errorMsg}
              </p>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t("¿Cuál es tu negocio?")}</span>
              </label>

              {availableSpots.length > 0 && (
                <select
                  value={selectedSpotId}
                  onChange={(e) => setSelectedSpotId(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:border-emerald-500 focus:outline-none mb-1.5"
                >
                  <option value="">{t("-- Seleccionar gema existente en el mapa --")}</option>
                  {availableSpots.map((spot) => (
                    <option key={spot.id} value={spot.id}>
                      {spot.title} ({spot.address_text || 'Costa Rica'})
                    </option>
                  ))}
                </select>
              )}

              {!selectedSpotId && (
                <input
                  type="text"
                  placeholder={t("O escribí el nombre de tu local/tour...")}
                  value={customBusinessName}
                  onChange={(e) => setCustomBusinessName(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:border-emerald-500 focus:outline-none"
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t("WhatsApp de Contacto Directo")}</span>
              </label>
              <input
                type="tel"
                required
                placeholder="+506 8888-8888"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t("Cédula Jurídica o Física (Opcional)")}</span>
              </label>
              <input
                type="text"
                placeholder={t("N° de Identificación tributaria")}
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                {t(" Detalles Adicionales (Menú, Horarios, Sitio Web) ")}</label>
              <textarea
                rows={2}
                placeholder={t("Agregá cualquier información para verificar la propiedad del comercio...")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("Enviando Solicitud...")}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t("Enviar Solicitud de Verificación")}</span>
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}