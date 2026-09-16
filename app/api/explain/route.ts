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
  const { landmarkName, facts, ageGroup } = body as {
    landmarkName: string;
    facts: string;
    ageGroup: AgeGroup;
  };

  if (!landmarkName || !facts || !ageGroup || !AGE_PROMPTS[ageGroup]) {
    return NextResponse.json(
      { error: "landmarkName, facts and a valid ageGroup are required" },
      { status: 400 }
    );
  }

  try {
    const result = await askQwen([
      {
        role: "user",
        content: `Landmark: ${landmarkName}. Facts: ${facts}\n\n${AGE_PROMPTS[ageGroup]}`,
      },
    ]);
    return NextResponse.json({ explanation: result.content, model: result.model });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
