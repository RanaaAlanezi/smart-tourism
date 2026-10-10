export interface ChatMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

export interface AskQwenResult {
  content: string;
  model: string;
  provider: string;
}

export interface AskQwenOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

function resolveProvider() {
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

  return { provider, endpoint, model, apiKey };
}

async function callQwen(messages: ChatMessage[], options: AskQwenOptions, stream: boolean) {
  const { provider, endpoint, model, apiKey } = resolveProvider();

  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...(provider === "openrouter" ? { Authorization: `Bearer ${apiKey}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.3,
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      messages,
      stream,
    }),
    signal: options.signal,
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    throw new Error(`${provider} error (${upstream.status}): ${errText}`);
  }

  return { upstream, model, provider };
}

// Single entry point for talking to Qwen, used by every AI feature in the
// app (landmark explanations, the assistant chat). Swap providers with the
// QWEN_PROVIDER env var without touching any calling code.
export async function askQwen(
  messages: ChatMessage[],
  options: AskQwenOptions = {}
): Promise<AskQwenResult> {
  const { upstream, model, provider } = await callQwen(messages, options, false);

  const data = await upstream.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content returned from model");
  }

  return { content, model, provider };
}

// Same as askQwen, but yields the reply piece by piece as the model writes
// it. The local model takes tens of seconds for a full answer, so the chat
// shows it as it arrives instead of a long blank wait.
export async function* askQwenStream(
  messages: ChatMessage[],
  options: AskQwenOptions = {}
): AsyncGenerator<string> {
  const { upstream } = await callQwen(messages, options, true);
  if (!upstream.body) throw new Error("No response body returned from model");

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Server-sent events: one "data: {json}" line per chunk.
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const payload = line.trim().replace(/^data:\s*/, "");
        if (!payload || payload === "[DONE]" || payload.startsWith(":")) continue;
        try {
          const delta: string | undefined = JSON.parse(payload)?.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // Not a JSON data line (e.g. a keep-alive comment) — skip it.
        }
      }
    }
  } finally {
    // Runs when the caller stops reading early too, so the model stops
    // generating the rest of an answer that's been abandoned.
    reader.cancel().catch(() => {});
  }
}

// True when a piece of model output shows the small local Qwen model
// drifting into Chinese mid-answer: CJK characters, fullwidth punctuation,
// or the broken character (U+FFFD) that usually announces them. Once that
// starts the rest of the answer is unusable — removing the characters
// leaves fragments like "و30299" — so callers should discard it and retry.
export function hasCjk(text: string): boolean {
  return /[一-鿿　-〿＀-￯�]/.test(text);
}
