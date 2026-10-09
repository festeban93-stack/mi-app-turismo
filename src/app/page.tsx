'use client';

import dynamic from 'next/dynamic';

const InteractiveMap = dynamic(() => import('@/components/InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center text-emerald-400 font-sans gap-3">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm">Cargando MapAI Costa Rica...</p>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="w-full h-screen">
      <InteractiveMap />
    </main>
  );
}