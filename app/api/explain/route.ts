import { NextRequest, NextResponse } from "next/server";
import { AgeGroup } from "@/lib/types";
import { askQwen } from "@/lib/services/aiService";

// Instructions are written in English on purpose: the local quantized Qwen
// model follows English instructions far more reliably and stays on-topic,
// while still producing fluent Arabic output when explicitly told to.
const AGE_PROMPTS: Record<AgeGroup, string> = {
  child:
    "Write a short, fun explanation of this landmark for a 6-9 year old child, in 3-4 very simple sentences. No complex dates or difficult terms. Respond entirely in Modern Standard Arabic (فصحى).",
  teen:
    "Write an engaging explanation of this landmark for a 13-17 year old teenager, connecting it to interesting stories or facts, with some simplified historical detail. One short paragraph (5-6 sentences). Respond entirely in Modern Standard Arabic (فصحى).",
  adult:
    "Write a precise, informative explanation of this landmark for an adult interested in culture and history, including historical context and cultural significance, in a formal register. Up to two paragraphs. Respond entirely in Modern Standard Arabic (فصحى).",
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { landmarkName, facts, keyFacts, ageGroup } = body as {
    landmarkName: string;
    facts: string;
    keyFacts?: string;
    ageGroup: AgeGroup;
  };

  if (!landmarkName || !facts || !ageGroup || !AGE_PROMPTS[ageGroup]) {
    return NextResponse.json(
      { error: "landmarkName, facts and a valid ageGroup are required" },
      { status: 400 }
    );
  }

  // The small local model reliably garbles numbers/names pulled from a
  // flowing Arabic prose paragraph (e.g. reads "302 meters" as "302
  // months"), but gets them right from short labeled facts — so prefer
  // keyFacts for grounding when we have it, falling back to prose facts.
  const factsBlock = keyFacts ? `Facts (use these exactly, do not reinterpret the numbers):\n${keyFacts}` : `Facts: ${facts}`;

  try {
    const result = await askQwen(
      [
        {
          role: "user",
          content:
            `Landmark: ${landmarkName}. ${factsBlock}\n\n${AGE_PROMPTS[ageGroup]} ` +
            `Only use the facts given above — do not add names, dates, or other facts that aren't there. ` +
            `Never state a superlative (e.g. "the tallest", "the largest", "the oldest", "the first", "the only") unless that exact claim is written in the facts above.`,
        },
      ],
      { temperature: 0.2 }
    );
    return NextResponse.json({ explanation: result.content, model: result.model });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
