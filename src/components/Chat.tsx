"use client";

import { useEffect, useRef, useState } from "react";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

export default function Chat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hola, soy tu guía de Rutas del Pacífico. Pregúntame por un casado, un canopy o cómo llegar a Tortuguero. Cuando configures OPENAI_API_KEY o GEMINI_API_KEY en .env.local, responderé con IA.",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || pending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setPending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = (await response.json()) as {
        reply?: string;
        error?: string;
        setup?: string;
      };

      const reply =
        data.reply ??
        data.setup ??
        "No pude completar la respuesta. Revisa la configuración de OpenAI o Gemini.";

      setMessages((current) => [
        ...current,
        { role: "assistant", content: reply },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "No hay conexión con el servidor de chat. Cuando el API esté arriba, usará OpenAI o Gemini automáticamente.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open ? (
        <section
          className="pointer-events-auto flex h-[min(32rem,70vh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-teal-900/10 bg-white shadow-2xl shadow-teal-950/20 dark:border-white/10 dark:bg-zinc-950"
          aria-label="Chat de guía turístico"
        >
          <header className="flex items-center justify-between bg-gradient-to-r from-teal-800 to-cyan-700 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Guía IA</p>
              <p className="text-[11px] text-teal-100">OpenAI · Gemini</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-white/15 px-2.5 py-1 text-xs hover:bg-white/25"
            >
              Minimizar
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((message, index) => (
              <p
                key={`${message.role}-${index}`}
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-5 ${
                  message.role === "user"
                    ? "ml-auto bg-teal-700 text-white"
                    : "bg-teal-50 text-teal-950 dark:bg-zinc-900 dark:text-teal-50"
                }`}
              >
                {message.content}
              </p>
            ))}
            {pending ? (
              <p className="text-xs text-zinc-400">Pensando la ruta…</p>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={sendMessage}
            className="flex gap-2 border-t border-zinc-100 p-3 dark:border-zinc-800"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="¿Dónde como un buen casado?"
              className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="rounded-full bg-teal-800 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40"
            >
              Enviar
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-700 to-cyan-600 text-white shadow-lg shadow-teal-900/30 hover:scale-105"
        aria-expanded={open}
        aria-label={open ? "Cerrar chat de IA" : "Abrir chat de IA"}
      >
        {open ? "×" : "✦"}
      </button>
    </div>
  );
}
