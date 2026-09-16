import { NextRequest, NextResponse } from "next/server";
import { AgeGroup } from "@/lib/types";

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

  // PoC note: OpenRouter's Qwen models require paid credits (no free tier for
  // Qwen there). For this TRL3 PoC we run Qwen locally via Ollama instead,
  // which is functionally the same model swapped to a free local provider.
  // Set QWEN_PROVIDER=openrouter + OPENROUTER_API_KEY to switch back.
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
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...(provider === "openrouter" ? { Authorization: `Bearer ${apiKey}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: `Landmark: ${landmarkName}. Facts: ${facts}\n\n${AGE_PROMPTS[ageGroup]}`,
        },
      ],
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    return NextResponse.json(
      { error: `${provider} error (${upstream.status}): ${errText}` },
      { status: 502 }
    );
  }

  const data = await upstream.json();
  const explanation: string | undefined = data?.choices?.[0]?.message?.content;

  if (!explanation) {
    return NextResponse.json(
      { error: "No explanation returned from model", raw: data },
      { status: 502 }
    );
  }

  return NextResponse.json({ explanation, model });
}
