'use client';

import React, { useState } from 'react';
import { Database, Play, Sparkles, Loader2, MapPin, CheckCircle2 } from 'lucide-react';

const REGIONS = [
  { name: 'Sarchí, Bajos del Toro & Poás', bbox: [10.05, -84.40, 10.25, -84.20] },
  { name: 'Valle Central (San José, Heredia, Cartago)', bbox: [9.80, -84.25, 10.05, -83.80] },
  { name: 'Zona Norte & La Fortuna / Arenal', bbox: [10.30, -84.80, 10.60, -84.40] },
  { name: 'Guanacaste (Tamarindo, Conchal, Liberia)', bbox: [10.00, -85.90, 10.90, -85.30] },
  { name: 'Monteverde & Pacífico Central (Jacó, Quepos)', bbox: [9.30, -84.80, 10.35, -84.50] },
  { name: 'Pacífico Sur (Uvita, Drake, Pérez Zeledón)', bbox: [8.30, -83.80, 9.30, -83.40] },
  { name: 'Caribe (Cahuita, Puerto Viejo, Tortuguero)', bbox: [9.60, -83.10, 10.60, -82.50] }
];

const CURATED_NATIONAL_SPOTS = [
  { title: 'Mirador & Café Cadaia Sarchí', description: 'Vista panorámica al Valle Central, café de origen local y repostería artesanal.', category: 'gastronomia', latitude: 10.0934, longitude: -84.3512, address_text: 'Sarchí Norte, Alajuela', opening_hours: '08:00 - 18:00', entry_fee: 'Consumo local' },
  { title: 'Catarata Del Toro', description: 'Impresionante caída de agua de 90 metros dentro de un antiguo cráter volcánico.', category: 'naturaleza', latitude: 10.2036, longitude: -84.2925, address_text: 'Bajos del Toro, Sarchí', opening_hours: '07:00 - 17:00', entry_fee: '₡5,000 / $14 USD' },
  { title: 'Blue Falls of Costa Rica', description: 'Pozas y cataratas de color azul celeste cristalino rodeadas de bosque nuboso.', category: 'naturaleza', latitude: 10.2081, longitude: -84.2967, address_text: 'Bajos del Toro, Sarchí', opening_hours: '07:00 - 16:00', entry_fee: '₡8,000 / $18 USD' },
  { title: 'Café & Mirador Roca Quemada', description: 'Punto panorámico hacia las montañas de Valverde Vega con café chorreado.', category: 'gastronomia', latitude: 10.1089, longitude: -84.3411, address_text: 'Sarchí Sur, Alajuela', opening_hours: '09:00 - 19:00', entry_fee: 'Consumo promedio ₡4,000' },
  { title: 'Parque Nacional Volcán Poás', description: 'Uno de los cráteres volcánicos activos más grandes del mundo.', category: 'naturaleza', latitude: 10.1982, longitude: -84.2307, address_text: 'Poás, Alajuela', opening_hours: '08:00 - 15:30', entry_fee: '₡1,500' },
  { title: 'Catarata Río Celeste', description: 'Famosa catarata de aguas turquesa en el Parque Nacional Volcán Tenorio.', category: 'naturaleza', latitude: 10.7021, longitude: -85.0152, address_text: 'Guatuso, Alajuela', opening_hours: '08:00 - 14:00', entry_fee: '₡800' },
  { title: 'La Fortuna Waterfall', description: 'Espectacular catarata con poza natural para nadar en medio de la selva tropical.', category: 'aventura', latitude: 10.4442, longitude: -84.6675, address_text: 'La Fortuna, Alajuela', opening_hours: '07:30 - 16:00', entry_fee: '₡9,000' },
  { title: 'Playa Conchal', description: 'Icónica playa de aguas cristalinas compuesta por diminutas conchas trituradas.', category: 'naturaleza', latitude: 10.3981, longitude: -85.8169, address_text: 'Santa Cruz, Guanacaste', opening_hours: 'Acceso Libre', entry_fee: 'Gratis' },
  { title: 'Playa Tamarindo', description: 'Playa meca del surf, atardeceres espectaculares y oferta gastronómica variada.', category: 'aventura', latitude: 10.2993, longitude: -85.8402, address_text: 'Tamarindo, Guanacaste', opening_hours: '24 Horas', entry_fee: 'Gratis' },
  { title: 'Parque Nacional Rincón de la Vieja', description: 'Senderos con pailas de barro hirviendo, fumarolas y cataratas.', category: 'naturaleza', latitude: 10.7821, longitude: -85.3421, address_text: 'Liberia, Guanacaste', opening_hours: '08:00 - 15:00', entry_fee: '₡1,000' },
  { title: 'Parque Nacional Manuel Antonio', description: 'Biodiversidad exuberante, monos carablanca, perezosos y playas de agua turquesa.', category: 'naturaleza', latitude: 9.3892, longitude: -84.1415, address_text: 'Quepos, Puntarenas', opening_hours: '07:00 - 15:00', entry_fee: '₡1,800' },
  { title: 'Café & Mirador Monteverde', description: 'Cafetería de altura en el bosque nuboso con cata de café y vistas a la montaña.', category: 'gastronomia', latitude: 10.3160, longitude: -84.8255, address_text: 'Monteverde, Puntarenas', opening_hours: '07:00 - 18:00', entry_fee: 'Consumo local' },
  { title: 'Peñón de Guacalillo', description: 'Acantilado panorámico con vista al Océano Pacífico y atardeceres memorables.', category: 'naturaleza', latitude: 9.8321, longitude: -84.6521, address_text: 'Garabito, Puntarenas', opening_hours: 'Acceso libre', entry_fee: 'Gratis' },
  { title: 'Catarata Nauyaca', description: 'Imponentes cataratas de dos niveles en medio del cañón de la montaña.', category: 'aventura', latitude: 9.2721, longitude: -83.8242, address_text: 'Pérez Zeledón, San José', opening_hours: '07:00 - 15:00', entry_fee: '₡6,000' },
  { title: 'Ruinas de Ujarrás', description: 'Sitio histórico con la estructura colonial más antigua conservada en Costa Rica.', category: 'cultura', latitude: 9.8251, longitude: -83.8322, address_text: 'Paraíso, Cartago', opening_hours: '08:00 - 16:30', entry_fee: 'Gratis' },
  { title: 'Mirador Orosi', description: 'Parque recreativo con vista panorámica hacia el hermoso Valle de Orosi.', category: 'naturaleza', latitude: 9.7921, longitude: -83.8521, address_text: 'Orosi, Cartago', opening_hours: '08:00 - 16:00', entry_fee: 'Gratis' },
  { title: 'Parque Nacional Cahuita', description: 'Sendero costero bordeado de arrecifes de coral, playas blancas y fauna silvestre.', category: 'naturaleza', latitude: 9.7381, longitude: -82.8421, address_text: 'Talamanca, Limón', opening_hours: '08:00 - 16:00', entry_fee: 'Donación voluntaria' }
];

export default function AdminIngestPage() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev]);
  };

  const runCuratedSeed = async () => {
    setRunning(true);
    addLog('🚀 Iniciando Carga Instantánea del Dataset Curado Nacional...');

    try {
      const res = await fetch('/api/admin/bulk-spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spots: CURATED_NATIONAL_SPOTS })
      });

      const data = await res.json();

      if (res.ok) {
        setTotalCount(prev => prev + CURATED_NATIONAL_SPOTS.length);
        addLog(`✅ ¡Éxito! Se inyectaron ${CURATED_NATIONAL_SPOTS.length} gemas verificadas en la base de datos.`);
      } else {
        addLog(`⚠️ Error inyectando dataset: ${data.error}`);
      }
    } catch (e: any) {
      addLog(`❌ Error en carga instantánea: ${e.message}`);
    }

    setRunning(false);
  };

  const startProxyIngestion = async () => {
    setRunning(true);
    setLogs([]);

    addLog('🚀 Iniciando Ingesta por Proxy Serverless (CORS Free)...');

    for (const region of REGIONS) {
      addLog(`📍 Consultando ${region.name} a través del Proxy Serverless...`);

      try {
        const res = await fetch('/api/admin/fetch-osm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bbox: region.bbox, regionName: region.name })
        });

        const data = await res.json();

        if (res.ok && data.spots && data.spots.length > 0) {
          addLog(`   📦 Recuperadas ${data.spots.length} gemas de ${region.name}. Insertando en Supabase...`);

          const bulkRes = await fetch('/api/admin/bulk-spots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spots: data.spots })
          });

          if (bulkRes.ok) {
            setTotalCount(prev => prev + data.spots.length);
            addLog(`   ✅ Guardadas ${data.spots.length} gemas de ${region.name} en Supabase.`);
          }
        } else {
          addLog(`   ⚠️ No se encontraron nuevos nodos o la API externa estuvo saturada.`);
        }
      } catch (err: any) {
        addLog(`   ❌ Error en ${region.name}: ${err.message || err}`);
      }

      await new Promise(r => setTimeout(r, 1500));
    }

    addLog('🎉 PROCESO FINALIZADO');
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center font-sans">
      <div className="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                <span>Panel de Ingesta Masiva MapAI</span>
                <MapPin className="w-4 h-4 text-emerald-400" />
              </h1>
              <p className="text-xs text-slate-400">Poblado automatizado con Proxy Serverless y Dataset Curado</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 block font-mono">Gemas en Sesión</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">{totalCount}</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={runCuratedSeed}
            disabled={running}
            className="py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Carga Instantánea (Dataset Curado 17+ Gemas)</span>
          </button>

          <button
            onClick={startProxyIngestion}
            disabled={running}
            className="py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {running ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>Ingesta Masiva OSM vía Proxy</span>
          </button>
        </div>

        {/* Consola de Progreso en Vivo */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 h-64 overflow-y-auto font-mono text-xs space-y-1.5 custom-scrollbar">
          {logs.length === 0 ? (
            <p className="text-slate-600 text-center py-20">Selecciona una acción superior para comenzar a poblar la base de datos.</p>
          ) : (
            logs.map((log, index) => (
              <p key={index} className={log.includes('✅') ? 'text-emerald-400 font-bold' : log.includes('⚠️') ? 'text-amber-400' : log.includes('📍') ? 'text-sky-300 font-bold' : 'text-slate-300'}>
                {log}
              </p>
            ))
          )}
        </div>

      </div>
    </div>
  );
}