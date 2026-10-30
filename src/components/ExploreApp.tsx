'use client';
import { LanguageSwitch, useLanguage } from '@/lib/i18n';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import DiscoveryHub from '@/components/DiscoveryHub';
import SpotDetailCard from '@/components/SpotDetailCard';
import AddSpotModal from '@/components/AddSpotModal';
import AICopilotDrawer from '@/components/AICopilotDrawer';
import AuthModal from '@/components/AuthModal';
import UserProfileModal from '@/components/UserProfileModal';
import CustomTripModal from '@/components/CustomTripModal';
import MyTripsDrawer from '@/components/MyTripsDrawer';
import { Plus, Bot, Trash2, User, Compass, BookmarkCheck } from 'lucide-react';

const MapWithNoSSR = dynamic(() => import('@/components/MapClient'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-400">
      <span className="animate-pulse text-xs">Cargando mapa interactivo...</span>
    </div>
  ),
});

function normalizeText(text: string = ''): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

async function loadPublicSpots() {
  const res = await fetch('/api/spots', { cache: 'no-store' });
  const json = await res.json();
  if (!res.ok || json.success === false) throw new Error(json.error || 'No fue posible cargar destinos.');
  return json.spots || [];
}

export default function HomePage() {
  const { t } = useLanguage();
  const [spots, setSpots] = useState<any[]>([]);
  const [spotsError, setSpotsError] = useState('');
  const [selectedSpot, setSelectedSpot] = useState<any | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>('');
  
  // Estado de Autenticación
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [authIntent, setAuthIntent] = useState<'LOGIN_ONLY' | 'ADD_SPOT' | 'CUSTOM_TRIP' | null>(null);

  // Modales y Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [prefilledGemaTitle, setPrefilledGemaTitle] = useState<string>('');
  const [isCustomTripModalOpen, setIsCustomTripModalOpen] = useState<boolean>(false);
  const [isMyTripsDrawerOpen, setIsMyTripsDrawerOpen] = useState<boolean>(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [copilotInitialPrompt, setCopilotInitialPrompt] = useState<string>('');
  const [travelLayout,setTravelLayout] = useState<'none' | 'split' | 'map'>('none');
  const [routeSpots, setRouteSpots] = useState<any[]>([]);

  useEffect(() => {
    const view = new URLSearchParams(window.location.search).get('view');
    if (!currentUser || !view) return;
    if(view==='trips')queueMicrotask(()=>setIsMyTripsDrawerOpen(true));
    if(view==='profile')queueMicrotask(()=>setIsProfileModalOpen(true));
  }, [currentUser]);

  // Escuchar sesión activa
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) setCurrentUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setCurrentUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchSpots = async () => {
    try { setSpots(await loadPublicSpots()); setSpotsError(''); }
    catch { setSpotsError('No pudimos cargar los destinos. Intentá nuevamente.'); }
  };

  useEffect(() => {
    let active = true;
    loadPublicSpots().then(data => { if (active) setSpots(data); })
      .catch(() => { if (active) setSpotsError('No pudimos cargar los destinos. Intentá nuevamente.'); });
    return () => { active = false; };
  }, []);

  const handleOpenAuthForLogin = () => {
    setAuthIntent('LOGIN_ONLY');
    setIsAuthModalOpen(true);
  };

  const handleOpenAddSpot = () => {
    if (!currentUser) {
      setAuthIntent('ADD_SPOT');
      setIsAuthModalOpen(true);
    } else {
      setIsAddModalOpen(true);
    }
  };

  const handleOpenCustomTrip = () => {
    if (!currentUser) {
      setAuthIntent('CUSTOM_TRIP');
      setIsAuthModalOpen(true);
    } else {
      setIsCustomTripModalOpen(true);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    if (authIntent === 'ADD_SPOT') {
      setIsAddModalOpen(true);
    } else if (authIntent === 'CUSTOM_TRIP') {
      setIsCustomTripModalOpen(true);
    }
    setAuthIntent(null);
  };

  const handleSignOut = async () => {
    try {
      setIsProfileModalOpen(false);
      await supabase.auth.signOut();
      setCurrentUser(null);
    } catch (err) {
      console.error('Error durante el cierre de sesión:', err);
    }
  };

  const filteredSpots = useMemo(() => {
    return spots.filter((spot) => {
      const catNorm = normalizeText(spot.category);
      const titleNorm = normalizeText(spot.title);
      const descNorm = normalizeText(spot.description);
      const activeCatNorm = normalizeText(activeCategory);

      let matchesCategory = true;
      if (activeCatNorm !== 'todas') {
        if (activeCatNorm === 'gastronomia') {
          matchesCategory = catNorm.includes('gastronom') || titleNorm.includes('restaurante') || titleNorm.includes('cafe') || titleNorm.includes('soda');
        } else if (activeCatNorm === 'naturaleza') {
          matchesCategory = catNorm.includes('naturalez') || titleNorm.includes('playa') || titleNorm.includes('catarata') || titleNorm.includes('mirador');
        } else if (activeCatNorm === 'aventura') {
          matchesCategory = catNorm.includes('aventur') || titleNorm.includes('canopy') || titleNorm.includes('surf');
        } else if (activeCatNorm === 'cultura') {
          matchesCategory = catNorm.includes('cultur') || titleNorm.includes('museo') || titleNorm.includes('teatro');
        } else {
          matchesCategory = catNorm === activeCatNorm;
        }
      }

      let matchesQuery = true;
      if (activeSearchQuery.trim()) {
        const queryNorm = normalizeText(activeSearchQuery);
        matchesQuery = titleNorm.includes(queryNorm) || descNorm.includes(queryNorm);
      }

      return matchesCategory && matchesQuery;
    });
  }, [spots, activeCategory, activeSearchQuery]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 select-none">
      
      {spotsError && <div role="alert" className="absolute bottom-4 left-4 z-[1000] rounded-xl bg-white p-4 text-sm text-slate-900 shadow-lg">
        {spotsError} <button onClick={() => void fetchSpots()} className="font-bold underline">{t("Reintentar")}</button>
      </div>}
      {/* 1. MAPA INTERACTIVO */}
      <div className={`absolute top-0 left-0 right-0 z-0 ${travelLayout==='split' ? 'bottom-[62dvh] md:bottom-0 md:right-[28rem]' : travelLayout==='map' ? 'bottom-20 md:bottom-0 md:right-[28rem]' : 'bottom-0'}`}>
        <MapWithNoSSR
          spots={filteredSpots}
          selectedSpot={selectedSpot}
          onSelectSpot={(spot: any) => setSelectedSpot(spot)}
          routeSpots={routeSpots}
        />
      </div>

      <div className="absolute right-3 top-16 z-40 flex items-center gap-2 md:top-3"><Link href="/" className="rounded-full bg-white p-3 text-xs font-bold text-emerald-900 shadow-md">{t('Volver al inicio')}</Link><LanguageSwitch/></div>
      {/* 2. HEADER MINIMALISTA */}
      <div className="absolute top-3 left-3 right-3 md:right-auto z-20 flex items-center justify-between md:justify-start gap-2 pointer-events-auto">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-md flex items-center gap-1.5">
          <span className="font-extrabold text-xs tracking-tight text-slate-900 dark:text-white">
            Pi<span className="text-emerald-600 dark:text-emerald-400">.</span>
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>

        <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-1 rounded-xl shadow-md overflow-x-auto max-w-[180px] sm:max-w-none custom-scrollbar">
          {[t("Todas"), 'gastronomia', 'naturaleza', 'aventura', 'cultura'].map((cat) => {
            const isSelected = activeCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={t(cat)}
                onClick={() => {
                  setActiveCategory(cat);
                  setActiveSearchQuery('');
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t(cat)}
              </button>
            );
          })}
        </div>

        {currentUser ? (
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="p-1 px-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[10px] shadow-md hover:bg-slate-100 transition-all flex items-center gap-1.5"
            title={t("Ver mi perfil")}
          >
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-[10px]">
              {currentUser?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || currentUser?.email?.charAt(0)?.toUpperCase() || 'E'}
            </div>
            <span className="hidden sm:inline truncate max-w-[80px]">{t("Mi Perfil")}</span>
          </button>
        ) : (
          <button
            onClick={handleOpenAuthForLogin}
            className="px-2.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[10px] shadow-md hover:bg-slate-100 transition-all flex items-center gap-1"
          >
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t("Ingresar")}</span>
          </button>
        )}
      </div>

      {/* 3. FABS FLOTANTES COMPACTOS */}
      <div className="fixed bottom-4 left-3 z-40 flex items-center gap-1.5 pointer-events-auto">
        <button
          onClick={() => setIsCopilotOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-emerald-600/30 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] shadow-lg hover:bg-emerald-50 dark:hover:bg-slate-800 active:scale-95 transition-all"
        >
          <Bot className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{t("Copiloto")}</span>
        </button>

        <button
          onClick={handleOpenCustomTrip}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-bold text-[11px] shadow-lg hover:brightness-110 active:scale-95 transition-all"
        >
          <Compass className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
          <span>{t("Crear Viaje")}</span>
        </button>

        {currentUser && (
          <button
            onClick={() => setIsMyTripsDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[11px] shadow-lg hover:bg-slate-100 transition-all"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t("Mis Viajes")}</span>
          </button>
        )}

        <button
          onClick={handleOpenAddSpot}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-lg active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t("Gema")}</span>
        </button>

        {routeSpots.length > 0 && (
          <button
            onClick={() => setRouteSpots([])}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 font-bold text-[10px] shadow-md hover:bg-rose-50 transition-all"
          >
            <Trash2 className="w-3 h-3" />
            <span>{t("Limpiar")}</span>
          </button>
        )}
      </div>

      {/* 4. DASHBOARD / PANELS */}
      <div hidden={travelLayout!=='none'} className="fixed bottom-0 left-0 right-0 z-30 md:absolute md:top-14 md:bottom-auto md:left-auto md:right-3 md:w-80 pointer-events-auto transition-all duration-300">
        {selectedSpot ? (
          <SpotDetailCard
            spot={selectedSpot}
            onClose={() => setSelectedSpot(null)}
            currentUser={currentUser}
            onRequireAuth={handleOpenAuthForLogin}
          />
        ) : (
          <div className="w-full max-h-[38vh] md:max-h-[calc(100vh-4.5rem)] overflow-y-auto rounded-t-2xl md:rounded-xl custom-scrollbar shadow-2xl">
            <DiscoveryHub
              totalSpotsCount={filteredSpots.length}
              featuredSpots={filteredSpots.slice(0, 5)}
              onSelectCategory={(cat) => {
                setActiveCategory(cat);
                setActiveSearchQuery('');
              }}
              onSelectSpot={(spot) => setSelectedSpot(spot)}
              onOpenAICopilot={(prompt) => {
                setCopilotInitialPrompt(prompt);
                setIsCopilotOpen(true);
              }}
              onOpenAddSpotModal={handleOpenAddSpot}
            />
          </div>
        )}
      </div>

      {/* 5. MODALES Y DRAWERS */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthIntent(null);
        }}
        onSuccess={handleAuthSuccess}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        availableSpots={spots}
      />

      <CustomTripModal
        isOpen={isCustomTripModalOpen}
        onClose={() => setIsCustomTripModalOpen(false)}
        currentUser={currentUser}
        availableSpots={spots}
        onApplyTripToMap={(spotsForRoute) => { setSelectedSpot(null); setRouteSpots(spotsForRoute); }}
        onRequireAuth={handleOpenAuthForLogin}
        onOpenAddSpotWithTitle={(title) => {
          setPrefilledGemaTitle(title);
          setIsAddModalOpen(true);
        }}
      />

      <MyTripsDrawer
        onTravelLayoutChange={setTravelLayout}
        availableSpots={spots}
        isOpen={isMyTripsDrawerOpen}
        onClose={() => setIsMyTripsDrawerOpen(false)}
        currentUser={currentUser}
        onApplyTripToMap={(spotsForRoute) => { setSelectedSpot(null); setRouteSpots(spotsForRoute); }}
      />

      <AICopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => {
          setIsCopilotOpen(false);
          setRouteSpots([]);
        }}
        initialPrompt={copilotInitialPrompt}
        onApplyRouteToMap={(spotsForRoute) => setRouteSpots(spotsForRoute)}
        onClearRoute={() => setRouteSpots([])}
      />

      <AddSpotModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setPrefilledGemaTitle('');
        }}
        onSpotAdded={() => { void fetchSpots(); }}
      />

    </main>
  );
}
