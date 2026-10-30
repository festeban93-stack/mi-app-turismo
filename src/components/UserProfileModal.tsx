'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ClaimBusinessModal from '@/components/ClaimBusinessModal';
import { 
  X, 
  Award, 
  MapPin, 
  Sparkles, 
  LogOut, 
  ShieldCheck, 
  Compass, 
  ChevronRight,
  Store,
  Loader2
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onSignOut: () => void;
  availableSpots?: any[];
}

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onSignOut,
  availableSpots = []
}: UserProfileModalProps) {
  const [profileData, setProfileData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'settings'>('stats');
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const [previousOpen, setPreviousOpen] = useState(isOpen);
  if (previousOpen !== isOpen) { setPreviousOpen(isOpen); if (isOpen) setLoading(true); }

  async function fetchUserProfile() {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      const { count: userSpotsCount } = await supabase
        .from('spots')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);

      return {
        ...profile,
        spotsCount: userSpotsCount || 0,
        fullName: profile?.full_name || currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Explorador',
        avatarUrl: profile?.avatar_url || currentUser?.user_metadata?.avatar_url || null,
        email: currentUser?.email,
        points: profile?.points || 50,
        role: profile?.role || 'explorer'
      };
    } catch (err) {
      console.error('Error cargando perfil:', err);

    }
  };


  useEffect(() => {
    if (isOpen && currentUser) {
      let active = true;
      fetchUserProfile().then(data => { if (active) { if (data) setProfileData(data); setLoading(false); } });
      return () => { active = false; };
    }
  }, [isOpen, currentUser]);


  const handleLogoutClick = async () => {
    setIsSigningOut(true);
    try {
      onClose();
      await onSignOut();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!isOpen || !currentUser) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in select-none">
        <div className="relative w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh]">
          
          {/* Banner Superior */}
          <div className="h-24 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 relative p-4 flex justify-between items-start">
            <span className="px-2.5 py-1 rounded-full bg-slate-950/30 backdrop-blur-md text-white text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 border border-white/20">
              <Sparkles className="w-3 h-3 text-emerald-300" />
              <span>MapAI Pass</span>
            </span>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-950/40 text-white hover:bg-slate-950/70 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Info Principal */}
          <div className="px-5 pb-4 relative -mt-10 flex items-end justify-between border-b border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-end gap-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border-4 border-white dark:border-slate-950 shadow-xl overflow-hidden flex items-center justify-center text-white font-extrabold text-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                {profileData?.avatarUrl ? (
                  <img src={profileData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{profileData?.fullName?.charAt(0)?.toUpperCase() || 'E'}</span>
                )}
              </div>

              <div className="mb-1">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                  <span>{profileData?.fullName}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{profileData?.email}</p>
              </div>
            </div>
          </div>

          {/* Pestañas */}
          <div className="flex border-b border-slate-200/80 dark:border-slate-800/80 px-5 pt-2 bg-slate-50/50 dark:bg-slate-900/40">
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-2 px-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'stats'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Progreso & Logros
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'settings'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Ajustes & Cuenta
            </button>
          </div>

          {/* Contenido */}
          <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1">
            
            {activeTab === 'stats' ? (
              <>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                      Estatus de Explorador
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {profileData?.points || 50}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Pts</span>
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                      Nivel: <strong className="text-emerald-700 dark:text-emerald-300">Pionero Local CR</strong>
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-md">
                    <Award className="w-7 h-7" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <MapPin className="w-4 h-4" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Gemas Aportadas</span>
                    </div>
                    <p className="text-lg font-black text-slate-900 dark:text-white">{profileData?.spotsCount || 0}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1">
                    <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
                      <Compass className="w-4 h-4" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Itinerarios IA</span>
                    </div>
                    <p className="text-lg font-black text-slate-900 dark:text-white">Activos</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2 border border-slate-800 shadow-md">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Store className="w-4 h-4" />
                    <span>¿Tenés un Comercio o Tour en CR?</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Verificá tu perfil comercial para destacar tu menú, WhatsApp directo y aparecer con prioridad en las rutas de la IA.
                  </p>
                  <button
                    onClick={() => setIsClaimModalOpen(true)}
                    className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] transition-all flex items-center justify-center gap-1 shadow"
                  >
                    <span>Reclamar mi Local</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Preferencias de Exploración
                  </label>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Sugerencias por Ubicación GPS</span>
                      <input type="checkbox" defaultChecked className="accent-emerald-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Notificaciones de Gemas Ocultas</span>
                      <input type="checkbox" defaultChecked className="accent-emerald-600" />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleLogoutClick}
                    disabled={isSigningOut}
                    className="w-full py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSigningOut ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                    <span>{isSigningOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
                  </button>
                </div>
              </div>
            )}

          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200/80 dark:border-slate-800/80 text-center text-[10px] text-slate-400">
            MapAI Costa Rica • v2.4 (Live DB)
          </div>

        </div>
      </div>

      <ClaimBusinessModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        currentUser={currentUser}
        availableSpots={availableSpots}
      />
    </>
  );
}
