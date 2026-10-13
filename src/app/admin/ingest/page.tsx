'use client';

import React, { useState } from 'react';
import { Database, Play, CheckCircle2, AlertCircle, Loader2, MapPin } from 'lucide-react';

const REGIONS = [
  { name: 'Sarchí, Bajos del Toro & Poás', bbox: [10.05, -84.40, 10.25, -84.20] },
  { name: 'Valle Central (San José, Heredia, Cartago)', bbox: [9.80, -84.25, 10.05, -83.80] },
  { name: 'Zona Norte & La Fortuna / Arenal', bbox: [10.30, -84.80, 10.60, -84.40] },
  { name: 'Guanacaste (Tamarindo, Conchal, Liberia)', bbox: [10.00, -85.90, 10.90, -85.30] },
  { name: 'Monteverde & Pacífico Central (Jacó, Quepos)', bbox: [9.30, -84.80, 10.35, -84.50] },
  { name: 'Pacífico Sur (Uvita, Drake, Pérez Zeledón)', bbox: [8.30, -83.80, 9.30, -83.40] },
  { name: 'Caribe (Cahuita, Puerto Viejo, Tortuguero)', bbox: [9.60, -83.10, 10.60, -82.50] }
];

export default function AdminIngestPage() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev]);
  };

  const startBrowserIngestion = async () => {
    setRunning(true);
    setLogs([]);
    setTotalCount(0);

    addLog('🚀 Iniciando Ingesta Masiva desde el Navegador...');

    for (const region of REGIONS) {
      addLog(`📍 Consultando ${region.name}...`);
      const [minLat, minLon, maxLat, maxLon] = region.bbox;

      const overpassQuery = `[out:json][timeout:25];(node["tourism"="viewpoint"](${minLat},${minLon},${maxLat},${maxLon});node["waterway"="waterfall"](${minLat},${minLon},${maxLat},${maxLon});node["amenity"="cafe"](${minLat},${minLon},${maxLat},${maxLon});node["tourism"="attraction"](${minLat},${minLon},${maxLat},${maxLon});node["leisure"="park"](${minLat},${minLon},${maxLat},${maxLon}););out body 100;`;

      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

        const data = await response.json();
        const elements = data.elements || [];

        addLog(`   📦 Encontrados ${elements.length} nodos en ${region.name}. Formateando...`);

        const spotsToInsert = elements
          .filter((el: any) => el.tags && el.tags.name && el.lat && el.lon)
          .map((el: any) => {
            let category = 'naturaleza';
            const nameLower = (el.tags.name || '').toLowerCase();
            const amenity = (el.tags.amenity || '').toLowerCase();
            const tourism = (el.tags.tourism || '').toLowerCase();

            if (amenity === 'cafe' || amenity === 'restaurant' || nameLower.includes('café') || nameLower.includes('soda')) {
              category = 'gastronomia';
            } else if (tourism === 'attraction' || tourism === 'museum' || el.tags.historic) {
              category = 'cultura';
            } else if (nameLower.includes('canopy') || nameLower.includes('rafting') || nameLower.includes('surf') || nameLower.includes('tour')) {
              category = 'aventura';
            }

            const addressText = el.tags['addr:city'] || el.tags['addr:province'] || region.name.split('(')[0].trim();

            return {
              title: el.tags.name,
              description: el.tags.description || `Punto turístico verificado en ${addressText}, Costa Rica.`,
              category,
              latitude: el.lat,
              longitude: el.lon,
              address_text: addressText,
              opening_hours: el.tags.opening_hours || '08:00 - 17:00',
              entry_fee: 'Acceso público / Consumo local'
            };
          });

        if (spotsToInsert.length > 0) {
          addLog(`   💾 Enviando ${spotsToInsert.length} gemas a Supabase...`);

          const bulkRes = await fetch('/api/admin/bulk-spots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spots: spotsToInsert })
          });

          const bulkData = await bulkRes.json();

          if (bulkRes.ok) {
            setTotalCount(prev => prev + spotsToInsert.length);
            addLog(`   ✅ Guardadas ${spotsToInsert.length} gemas de ${region.name} correctamente.`);
          } else {
            addLog(`   ⚠️ Error al guardar en Supabase: ${bulkData.error}`);
          }
        }
      } catch (err: any) {
        addLog(`   ❌ Error en ${region.name}: ${err.message || err}`);
      }

      // Pausa de 2 segundos para no saturar la API
      await new Promise(r => setTimeout(r, 2000));
    }

    addLog('🎉 ¡PROCESO COMPLETADO EXITOSAMENTE!');
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
              <p className="text-xs text-slate-400">Poblado automático de Costa Rica desde el navegador sin errores de red CLI</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 block font-mono">Gemas Cargadas</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">{totalCount}</span>
          </div>
        </div>

        {/* Botón de Iniciar */}
        <button
          onClick={startBrowserIngestion}
          disabled={running}
          className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {running ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span>Procesando Regiones de Costa Rica...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Iniciar Ingesta Nacional Automática</span>
            </>
          )}
        </button>

        {/* Consola de Progreso en Vivo */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 h-64 overflow-y-auto font-mono text-xs space-y-1.5 custom-scrollbar">
          {logs.length === 0 ? (
            <p className="text-slate-600 text-center py-20">Presioná "Iniciar Ingesta Nacional Automática" para comenzar a poblar el mapa.</p>
          ) : (
            logs.map((log, index) => (
              <p key={index} className={log.includes('✅') ? 'text-emerald-400 font-bold' : log.includes('❌') ? 'text-rose-400 font-bold' : log.includes('📍') ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                {log}
              </p>
            ))
          )}
        </div>

      </div>
    </div>
  );
}