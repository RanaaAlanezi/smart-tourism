export interface ChatMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

export interface AskQwenResult {
  content: string;
  model: string;
  provider: string;
}

// Single entry point for talking to Qwen, used by every AI feature in the
// app (landmark explanations, the assistant chat). Swap providers with the
// QWEN_PROVIDER env var without touching any calling code.
export async function askQwen(
  messages: ChatMessage[],
  options: { temperature?: number } = {}
): Promise<AskQwenResult> {
  const provider = process.env.QWEN_PROVIDER || "ollama";

  const endpoint =
    provider === "openrouter"
      ? "https://openrouter.ai/api/v1/chat/completions"
      : `${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}/v1/chat/completions`;

  const model =
    provider === "openrouter"
      ? process.env.OPENROUTER_MODEL || "qwen/qwen-2.5-7b-instruct"
      : process.env.OLLAMA_MODEL || "qwen2.5:7b-instruct";

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (provider === "openrouter" && !apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured on the server");
  }

  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...(provider === "openrouter" ? { Authorization: `Bearer ${apiKey}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.3,
      messages,
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    throw new Error(`${provider} error (${upstream.status}): ${errText}`);
  }

  const data = await upstream.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content returned from model");
  }

  return { content, model, provider };
}
