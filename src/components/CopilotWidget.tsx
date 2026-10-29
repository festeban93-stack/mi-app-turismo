'use client';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

import { useState } from 'react';

interface Place {
  id: string;
  name: string;
  category: string;
  region: string;
  short_description: string;
  ai_story: string;
  tags: string[];
  estimated_price_usd: number;
  rating: number;
  location: any;
}

interface CopilotWidgetProps {
  allPlaces: Place[];
  onFilterPlaces: (matchedIds: string[]) => void;
  onResetFilter: () => void;
}

export default function CopilotWidget({ allPlaces, onFilterPlaces, onResetFilter }: CopilotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: '¡Hola! Soy tu Copiloto de Ruta por IA. Dime qué buscas o dime algo como: "¿Qué hacer en La Fortuna si está lloviendo y tengo $30 USD?"'
    }
  ]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userText = inputMessage;
    setInputMessage('');
    setChatHistory((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await authenticatedFetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          places: allPlaces
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.reply || 'Servicio no disponible.');

      setChatHistory((prev) => [...prev, { sender: 'ai', text: data.response_text }]);

      if (Array.isArray(data.matched_ids) && data.matched_ids.length > 0) {
        onFilterPlaces(data.matched_ids);
      }
    } catch (error) {
      setChatHistory((prev) => [
        ...prev,
        { sender: 'ai', text: 'Ocurrió un error al consultar tu ruta. ¡Intenta de nuevo!' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* BOTÓN FLOTANTE ACTIVADOR */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-30 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-emerald-300 transition-all transform hover:scale-105 active:scale-95"
        >
          <span className="text-lg">🤖</span>
          <span className="text-sm">Copiloto IA</span>
        </button>
      )}

      {/* VENTANA DEL CHAT */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 md:right-6 w-[calc(100vw-2rem)] md:w-96 h-[500px] z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
          {/* ENCABEZADO */}
          <div className="bg-slate-800 p-3.5 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="font-bold text-sm text-emerald-300">Copiloto de Ruta IA</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onResetFilter}
                className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300"
                title="Restablecer mapa completo"
              >
                Reset Mapa
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white font-bold px-1.5 text-lg"
              >
                ✕
              </button>
            </div>
          </div>

          {/* MENSAJES */}
          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 text-xs">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl max-w-[88%] leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white self-end rounded-br-none'
                    : 'bg-slate-800 text-slate-200 border border-slate-700 self-start rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="bg-slate-800 border border-slate-700 text-emerald-400 p-2.5 rounded-xl self-start text-xs flex items-center gap-2">
                <span className="animate-spin">🌀</span> Calculando la mejor ruta...
              </div>
            )}
          </div>

          {/* FORMULARIO DE ENTRADA */}
          <form onSubmit={handleSendMessage} className="p-3 bg-slate-800/80 border-t border-slate-700 flex gap-2">
            <input
              type="text"
              placeholder="Ej: ¿Qué hacer con $30 si llueve?"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}
