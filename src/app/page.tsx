'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';
import DiscoveryHub from '@/components/DiscoveryHub';
import AddSpotModal from '@/components/AddSpotModal';
import AICopilotDrawer from '@/components/AICopilotDrawer';
import AuthModal from '@/components/AuthModal';
import { Plus, Bot, Trash2, User, LogOut } from 'lucide-react';

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

export default function HomePage() {
  const [spots, setSpots] = useState<any[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<any | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>('');
  
  // Estado de Autenticación
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Modales y Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [copilotInitialPrompt, setCopilotInitialPrompt] = useState<string>('');
  const [routeSpots, setRouteSpots] = useState<any[]>([]);

  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
  }, []);

  // Escuchar sesión activa
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const fetchSpots = async () => {
    try {
      const res = await fetch(`/api/spots?t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      const rawSpots = Array.isArray(json) ? json : (json.spots || json.data || []);
      setSpots(rawSpots);
    } catch (err) {
      console.error('Error cargando spots:', err);
    }
  };

  useEffect(() => {
    fetchSpots();
  }, []);

  const handleOpenAddSpot = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
    } else {
      setIsAddModalOpen(true);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
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
      
      {/* 1. MAPA INTERACTIVO */}
      <div className="absolute inset-0 z-0">
        <MapWithNoSSR
          spots={filteredSpots}
          selectedSpot={selectedSpot}
          onSelectSpot={(spot: any) => setSelectedSpot(spot)}
          routeSpots={routeSpots}
        />
      </div>

      {/* 2. HEADER MINIMALISTA DE MARCA Y SESIÓN */}
      <div className="absolute top-3 left-3 right-3 md:right-auto z-20 flex items-center justify-between md:justify-start gap-2 pointer-events-auto">
        
        {/* LOGO */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-md flex items-center gap-1.5">
          <span className="font-extrabold text-xs tracking-tight text-slate-900 dark:text-white">
            Map<span className="text-emerald-600 dark:text-emerald-400">AI</span>
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>

        {/* CATEGORÍAS */}
        <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-1 rounded-xl shadow-md overflow-x-auto max-w-[180px] sm:max-w-none custom-scrollbar">
          {['Todas', 'gastronomia', 'naturaleza', 'aventura', 'cultura'].map((cat) => {
            const isSelected = activeCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
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
                {cat}
              </button>
            );
          })}
        </div>

        {/* BOTÓN DE SESIÓN */}
        {currentUser ? (
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-500 transition-colors shadow-md flex items-center gap-1 text-[10px] font-bold"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[10px] shadow-md hover:bg-slate-100 transition-all flex items-center gap-1"
          >
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ingresar</span>
          </button>
        )}
      </div>

      {/* 3. FABS FLOTANTES */}
      <div className="fixed bottom-4 left-3 z-40 flex items-center gap-1.5 pointer-events-auto">
        <button
          onClick={() => setIsCopilotOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-emerald-600/30 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] shadow-lg hover:bg-emerald-50 dark:hover:bg-slate-800 active:scale-95 transition-all"
        >
          <Bot className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Copiloto</span>
        </button>

        <button
          onClick={handleOpenAddSpot}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-lg active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Gema</span>
        </button>

        {routeSpots.length > 0 && (
          <button
            onClick={() => setRouteSpots([])}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 font-bold text-[10px] shadow-md hover:bg-rose-50 transition-all"
          >
            <Trash2 className="w-3 h-3" />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* 4. DASHBOARD COMPACTO */}
      <div className="fixed bottom-0 left-0 right-0 z-30 md:absolute md:top-14 md:bottom-auto md:left-auto md:right-3 md:w-80 pointer-events-auto transition-all duration-300">
        {selectedSpot ? (
          <div className="w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t md:border border-slate-200/80 dark:border-slate-800/80 rounded-t-2xl md:rounded-xl p-4 shadow-2xl space-y-3 max-h-[42vh] md:max-h-[calc(100vh-4.5rem)] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-2">
              <span className="px-2 py-0.5 text-[9px] uppercase font-bold rounded-md bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                {selectedSpot.category || 'naturaleza'}
              </span>
              <button
                onClick={() => setSelectedSpot(null)}
                className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{selectedSpot.title}</h3>

            <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/80">
              <p><strong>🕒 Horario:</strong> {selectedSpot.opening_hours || 'Lunes a Domingo 8:00 AM - 5:00 PM'}</p>
              <p><strong>🎟️ Entrada:</strong> {selectedSpot.entry_fee || 'Entrada Libre'}</p>
              <p><strong>📍 Dirección:</strong> {selectedSpot.address_text || 'Costa Rica'}</p>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedSpot.description}
            </p>

            <button
              onClick={() => setSelectedSpot(null)}
              className="w-full py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              ← Volver
            </button>
          </div>
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
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setIsAddModalOpen(true)}
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
        onClose={() => setIsAddModalOpen(false)}
        onSpotAdded={(newSpot) => {
          setSpots((prev) => [newSpot, ...prev]);
          setSelectedSpot(newSpot);
        }}
      />

    </main>
  );
}