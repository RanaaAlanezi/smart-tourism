import { AgeGroup, ChatSource, ChatStreamEvent, Lang, LandmarkContext } from "./types";

export interface ChatRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  ageGroup: AgeGroup;
  // The language to answer in (and to name landmarks in).
  lang: Lang;
  landmarkContext?: LandmarkContext;
}

// Sends a chat request and calls onText with the reply so far each time
// more of it arrives — an empty string means the reply is starting over.
// Resolves with the landmarks the finished reply mentions; throws an Error
// whose message is safe to show the visitor.
export async function streamChat(
  request: ChatRequest,
  onText: (replySoFar: string) => void
): Promise<ChatSource[]> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "unknown error");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let reply = "";
  let sources: ChatSource[] | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as ChatStreamEvent;
      if (event.type === "delta") {
        reply += event.text;
        onText(reply);
      } else if (event.type === "reset") {
        reply = "";
        onText(reply);
      } else if (event.type === "done") {
        sources = event.sources;
      } else {
        throw new Error(event.message);
      }
    }
  }

  // The stream ended without its closing event — the connection dropped
  // mid-answer.
  if (!sources) {
    throw new Error(
      request.lang === "en"
        ? "The connection dropped before the answer was complete. Please try again."
        : "انقطع الاتصال قبل اكتمال الإجابة. حاول مرة أخرى."
    );
  }
  return sources;
}
