import { places } from "@/data/places";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const catalog = places
  .map(
    (place) =>
      `- ${place.name} (${place.category}, ${place.city}): ${place.highlight}`,
  )
  .join("\n");

const systemPrompt = `Eres el concierge de la app de turismo Rutas del Pacífico, en Costa Rica.
Responde en español, breve y práctico. Usa este catálogo cuando ayude:

${catalog}

Si no hay datos suficientes, da un consejo general de viaje responsable (SINAC, no alimentar fauna, efectivo en sodas).`;

function missingKeyPayload() {
  return Response.json(
    {
      error: "missing_key",
      setup:
        "El chat está listo, pero falta la clave. Crea .env.local con OPENAI_API_KEY (o GEMINI_API_KEY) y reinicia `npm run dev`. El servidor usará OpenAI primero y Gemini como alternativa.",
    },
    { status: 503 },
  );
}

async function replyWithOpenAI(messages: ChatMessage[], apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.7,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim();
}

async function replyWithGemini(messages: ChatMessage[], apiKey: string) {
  const contents = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  return data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
}

export async function POST(request: Request) {
  const body = (await request.json()) as { messages?: ChatMessage[] };
  const messages = (body.messages ?? []).filter(
    (message) => message.role === "user" || message.role === "assistant",
  );

  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!openaiKey && !geminiKey) {
    return missingKeyPayload();
  }

  try {
    const reply = openaiKey
      ? await replyWithOpenAI(messages, openaiKey)
      : await replyWithGemini(messages, geminiKey as string);

    if (!reply) {
      throw new Error("empty_reply");
    }

    return Response.json({ reply, provider: openaiKey ? "openai" : "gemini" });
  } catch (error) {
    if (openaiKey && geminiKey) {
      try {
        const reply = await replyWithGemini(messages, geminiKey);
        if (reply) {
          return Response.json({ reply, provider: "gemini" });
        }
      } catch {
        // both providers failed
      }
    }

    return Response.json(
      {
        error: "provider_error",
        setup: `La IA no respondió (${error instanceof Error ? error.message : "error"}). Verifica el modelo y la clave.`,
      },
      { status: 502 },
    );
  }
}
