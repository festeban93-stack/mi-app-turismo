'use client';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

import React, { useState, useEffect } from 'react';
import { saveTrip } from '@/lib/save-trip';
import { supabase } from '@/lib/supabase';
import { 
  X, 
  Send, 
  Bot, 
  Sparkles, 
  Route, 
  CheckCircle2, 
  BookmarkPlus, 
  Loader2 
} from 'lucide-react';

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  onApplyRouteToMap: (spotsForRoute: any[]) => void;
  onClearRoute: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestedSpots?: any[];
}

export default function AICopilotDrawer({
  isOpen,
  onClose,
  initialPrompt = '',
  onApplyRouteToMap,
  onClearRoute
}: AICopilotDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu Copiloto Turístico IA. Decime qué querés explorar (ej: "Ruta de café y miradores cerca de Sarchí") y te trazo los puntos en el mapa.'
    }
  ]);

  const [routeDays, setRouteDays] = useState<Record<number, number>>({});
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingTripId, setSavingTripId] = useState<string | null>(null);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  if (!isOpen) return null;

  async function handleSendMessage(textToSend?: string) {
    const promptText = textToSend || inputPrompt;
    if (!promptText.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: promptText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    if (!textToSend) setInputPrompt('');
    setLoading(true);

    try {
      const res = await authenticatedFetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: promptText,
          history: updatedMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.reply || 'Servicio no disponible.');

      if (data?.reply) {
        const assistantMsg: Message = {
          role: 'assistant',
          content: data.reply,
          suggestedSpots: data.suggestedSpots || []
        };
        setMessages(prev => [...prev, assistantMsg]);

        if (data.suggestedSpots && data.suggestedSpots.length > 0) {
          onApplyRouteToMap(data.suggestedSpots);
        }
      }
    } catch (err) {
      console.error('Error conversando con el copiloto:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'No fue posible consultar destinos.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAIRouteToMyTrips = async (spots: any[], originalPrompt: string, durationDays: number) => {
    if (!spots || spots.length === 0) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      alert('Debés iniciar sesión para guardar este viaje en tu cuenta.');
      return;
    }

    setSavingTripId(originalPrompt);

    try {
      const tripTitle = `Viaje IA: ${originalPrompt.slice(0, 25)}...`;

      await saveTrip({
        title: tripTitle, durationDays,
        aiPrompt: originalPrompt,
        stops: spots.map((spot, index) => ({
          spot_id: spot.id, day_number: Math.min(durationDays, Math.floor(index * durationDays / spots.length) + 1),
          order_index: index, estimated_cost: 0,
        })),
      });

      setSavedSuccessMsg('¡Viaje guardado en "Mis Viajes"!');
      setTimeout(() => setSavedSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Error guardando viaje de IA: ${err?.message || err}`);
    } finally {
      setSavingTripId(null);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl p-4 flex flex-col justify-between animate-fade-in text-slate-900 dark:text-slate-100 select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold flex items-center gap-1.5">
              <span>Copiloto Turístico IA</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </h3>
            <p className="text-[10px] text-slate-500">Búsqueda y rutas inteligentes</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Historial de Mensajes */}
      <div className="flex-1 overflow-y-auto custom-scrollbar my-3 space-y-3 pr-1">
        {savedSuccessMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs text-center flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{savedSuccessMsg}</span>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-[10px] mt-1">
                🤖
              </div>
            )}

            <div
              className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-none font-medium'
                  : 'bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-bl-none text-slate-800 dark:text-slate-200'
              }`}
            >
              <p>{msg.content}</p>

              {msg.suggestedSpots && msg.suggestedSpots.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Route className="w-3 h-3" />
                      Ruta enfocada en mapa ({msg.suggestedSpots.length} gemas)
                    </span>
                  </div>

                  <label className="block text-xs font-bold">Duración del viaje (días)
                    <input aria-label="Duración de la ruta IA" type="number" min={1} max={30} value={routeDays[index] ?? 2}
                      onChange={e => setRouteDays(prev => ({ ...prev, [index]: Math.max(1, Math.min(30, Number(e.target.value) || 1)) }))}
                      className="w-full rounded-lg border p-2 bg-white text-slate-900" />
                  </label>
                  <button
                    onClick={() => handleSaveAIRouteToMyTrips(msg.suggestedSpots!, messages[index - 1]?.content || 'Ruta IA', routeDays[index] ?? 2)}
                    disabled={savingTripId === messages[index - 1]?.content}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 font-bold text-[10px] shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {savingTripId === messages[index - 1]?.content ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <BookmarkPlus className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                    )}
                    <span>Guardar esta Ruta en Mis Viajes</span>
                  </button>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center flex-shrink-0 text-[10px] mt-1 font-bold">
                U
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            <span>Consultando gemas y trazando mapa...</span>
          </div>
        )}
      </div>

      {/* Input de Mensaje */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="Ej: Ruta de café y miradores en Sarchí..."
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loading}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
