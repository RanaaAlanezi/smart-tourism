import { NextRequest, NextResponse } from "next/server";
import { AgeGroup, Lang } from "@/lib/types";
import { askQwen, RETRY_TEMPERATURES, withoutCjkAside } from "@/lib/services/aiService";

// Instructions are written in English on purpose: the local quantized Qwen
// model follows English instructions far more reliably and stays on-topic,
// while still producing fluent Arabic output when explicitly told to.
const AGE_PROMPTS: Record<AgeGroup, string> = {
  child:
    "Write a short, fun explanation of this landmark for a 6-9 year old child, in 3-4 very simple sentences. No complex dates or difficult terms.",
  teen:
    "Write an engaging explanation of this landmark for a 13-17 year old teenager, connecting it to interesting stories or facts, with some simplified historical detail. One short paragraph (5-6 sentences).",
  adult:
    "Write a precise, informative explanation of this landmark for an adult interested in culture and history, including historical context and cultural significance, in a formal register. Up to two paragraphs.",
};

const LANGUAGE_RULE: Record<Lang, string> = {
  ar: "Respond entirely in Modern Standard Arabic (فصحى).",
  en: "Respond entirely in English.",
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { landmarkName, facts, keyFacts, ageGroup } = body as {
    landmarkName: string;
    facts: string;
    keyFacts?: string;
    ageGroup: AgeGroup;
  };
  const lang: Lang = body.lang === "en" ? "en" : "ar";

  if (!landmarkName || !facts || !ageGroup || !AGE_PROMPTS[ageGroup]) {
    return NextResponse.json(
      { error: "landmarkName, facts and a valid ageGroup are required" },
      { status: 400 }
    );
  }

  // The small local model reliably garbles numbers/names pulled from a
  // flowing Arabic prose paragraph (e.g. reads "302 meters" as "302
  // months"), but gets them right from short labeled facts — so keyFacts
  // go in alongside as the reference for figures. The prose stays the
  // source of wording: given only the English labels, models leave words
  // untranslated in an Arabic answer ("civilization النبطية").
  const factsBlock = keyFacts
    ? `Facts: ${facts}\nExact figures (use only to get numbers and dates exactly right; take names and wording from Facts): ${keyFacts}`
    : `Facts: ${facts}`;

  const prompt =
    `Landmark: ${landmarkName}. ${factsBlock}\n\n${AGE_PROMPTS[ageGroup]} ${LANGUAGE_RULE[lang]} ` +
    `Only use the facts given above — do not add names, dates, or other facts that aren't there. ` +
    `Never state a superlative (e.g. "the tallest", "the largest", "the oldest", "the first", "the only") unless that exact claim is written in the facts above.`;

  try {
    // Qwen sometimes breaks off into a Chinese aside and then restates its
    // answer (see hasCjk); keep the restated answer, or ask again if there
    // isn't one.
    for (const temperature of RETRY_TEMPERATURES) {
      const result = await askQwen([{ role: "user", content: prompt }], { temperature });
      const explanation = withoutCjkAside(result.content);
      if (explanation) return NextResponse.json({ explanation, model: result.model });
    }
    throw new Error("model output kept drifting out of the requested language");
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
