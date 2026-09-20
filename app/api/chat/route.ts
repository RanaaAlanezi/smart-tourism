import { NextRequest, NextResponse } from "next/server";
import { AgeGroup } from "@/lib/types";
import { askQwen } from "@/lib/services/aiService";
import { getLandmarks } from "@/lib/landmarks";

const AGE_STYLE: Record<AgeGroup, string> = {
  child: "Explain things in very simple words suitable for a 6-9 year old child, with short sentences and no complex terms.",
  teen: "Explain things in an engaging way suitable for a 13-17 year old teenager, connecting facts to interesting stories.",
  adult: "Explain things precisely and informatively, suitable for an adult, in a helpful and professional register.",
};

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, ageGroup, landmarkContext } = body as {
    messages: ChatTurn[];
    ageGroup: AgeGroup;
    landmarkContext?: { name: string; facts: string; keyFacts?: string };
  };

  if (!messages?.length || !ageGroup || !AGE_STYLE[ageGroup]) {
    return NextResponse.json(
      { error: "messages and a valid ageGroup are required" },
      { status: 400 }
    );
  }

  // The small local model reliably garbles numbers/names pulled from a
  // flowing Arabic prose paragraph (e.g. reads "302 meters" as "302
  // months"), but gets them right from short labeled facts — so prefer
  // keyFacts for grounding when we have it, falling back to prose facts.
  let landmarkBlock = landmarkContext?.name
    ? `Landmark: ${landmarkContext.name}. Facts: ${landmarkContext.keyFacts || landmarkContext.facts}\n\n`
    : "";

  // Without a specific landmark in focus, ground the model in our real data
  // instead of letting it improvise from general knowledge — this matters a
  // lot for a small local model, which otherwise drifts into generic or
  // fabricated answers on cross-landmark questions (e.g. comparisons).
  if (!landmarkContext?.name) {
    try {
      const landmarks = await getLandmarks();
      if (landmarks.length) {
        const digest = landmarks
          .map((l) => `- ${l.name} (${l.city}): ${l.keyFacts || l.facts}`)
          .join("\n");
        landmarkBlock = `Known landmarks in the Smart Tourism app:\n${digest}\n\n`;
      }
    } catch {
      // Firestore unavailable — fall back to the model's general knowledge.
    }
  }

  const history = messages.slice(0, -1);
  const lastQuestion = messages[messages.length - 1].content;

  const historyText = history.length
    ? "Previous conversation:\n" +
      history.map((m) => `${m.role === "user" ? "Q" : "A"}: ${m.content}`).join("\n") +
      "\n\n"
    : "";

  const prompt =
    `${landmarkBlock}${historyText}` +
    `A visitor of the "Smart Tourism" app asked a question about Saudi Arabia travel and landmarks. ` +
    `${AGE_STYLE[ageGroup]} Base your answer only on the facts given above when they cover the topic; do not invent names, dates, or facts that aren't there. ` +
    `Never state a superlative (e.g. "the tallest", "the largest", "the oldest", "the first", "the only") about anything unless that exact claim is written in the facts above — superlatives go out of date and are the most common way you get facts wrong. ` +
    `Write ONLY in Modern Standard Arabic (فصحى) — do not include any Chinese, English, or other language words anywhere in your answer.\n\n` +
    `Question: ${lastQuestion}`;

  try {
    const result = await askQwen([{ role: "user", content: prompt }], { temperature: 0.2 });
    return NextResponse.json({ reply: result.content, model: result.model });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
