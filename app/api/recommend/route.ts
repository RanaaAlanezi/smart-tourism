import { NextRequest, NextResponse } from "next/server";
import { LandmarkCategory } from "@/lib/types";
import { getLandmarks } from "@/lib/landmarks";
import { rankLandmarksForDiscovery } from "@/lib/recommendations";
import { askQwen } from "@/lib/services/aiService";

const VALID_CATEGORIES: LandmarkCategory[] = [
  "historical",
  "archaeological",
  "natural",
  "beaches",
  "urban",
  "cultural",
];

const MAX_CANDIDATES = 5;

// Context-only labels for Qwen's phrasing — never used for filtering or
// scoring, since the dataset has no trip-duration/focus field to match
// against (see scoreForDiscovery's doc comment).
const TIME_CONTEXT: Record<string, string> = {
  short: "They only have a couple of hours to half a day available.",
  day: "They have a full day available.",
  multi: "They have more than one day available.",
};

const FOCUS_CONTEXT: Record<string, string> = {
  learn: "They especially want to learn something new.",
  photo: "They especially want great photo opportunities.",
  explore: "They especially want to explore and be active.",
  relax: "They especially want to relax.",
};

const FALLBACK_EXPLANATION = "هذا المكان يطابق اهتماماتك المختارة.";

// The small local Qwen model occasionally "thinks out loud" in Chinese
// before settling on a final Arabic sentence, leaves a stray English word
// behind mid-sentence, or truncates the sentence and pads it with Chinese
// punctuation — when asked to freely compose a new sentence (as opposed to
// /api/explain's longer, more constrained explanations, which don't show
// this). Take the last paragraph — where a self-correction settles — strip
// any residual CJK characters/punctuation, and reject the result outright
// if it still isn't a clean, complete Arabic sentence, rather than ever
// show the user garbled or truncated text.
function sanitizeExplanation(raw: string): string | null {
  const paragraphs = raw
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  let candidate = paragraphs[paragraphs.length - 1] || raw.trim();
  // Strip CJK ideographs, CJK punctuation/symbols, and fullwidth forms
  // (e.g. the fullwidth "，" "。" the model sometimes pads a truncated
  // sentence with).
  candidate = candidate.replace(/[一-鿿　-〿＀-￯]/g, "").trim();
  // Trim a trailing comma (Arabic "،" or ASCII ",") — the model sometimes
  // cuts off mid-clause right after one.
  candidate = candidate.replace(/[,،\s]+$/, "").trim();
  if (!candidate || candidate.length < 20 || /[A-Za-z]{3,}/.test(candidate)) return null;
  return candidate;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { interests, city, time, focus } = body as {
    interests: LandmarkCategory[];
    city?: string | null;
    time?: string;
    focus?: string;
  };

  if (
    !Array.isArray(interests) ||
    interests.length === 0 ||
    !interests.every((c) => VALID_CATEGORIES.includes(c))
  ) {
    return NextResponse.json(
      { error: "interests must be a non-empty array of valid categories" },
      { status: 400 }
    );
  }

  // The app decides which landmarks are eligible — city and category
  // filtering both happen here, against the real dataset. Qwen never sees
  // or picks from the full dataset, only the small pre-filtered candidate
  // list below, and never determines location or category matching itself.
  const landmarks = await getLandmarks();
  const candidates = rankLandmarksForDiscovery(landmarks, { city: city || null, interests }, MAX_CANDIDATES);

  if (!candidates.length) {
    return NextResponse.json({ recommendations: [] });
  }

  const context = [TIME_CONTEXT[time || ""], FOCUS_CONTEXT[focus || ""]].filter(Boolean).join(" ");

  const recommendations = await Promise.all(
    candidates.map(async (landmark) => {
      const tagsLine = landmark.tags?.length ? ` Tags: ${landmark.tags.join(", ")}.` : "";
      try {
        const result = await askQwen(
          [
            {
              role: "user",
              content:
                `Landmark: ${landmark.name}. Facts: ${landmark.keyFacts || landmark.facts}${tagsLine}\n\n` +
                `A visitor of the "Smart Tourism" app is planning a trip in Saudi Arabia and said they are interested in: ${interests.join(", ")}. ${context} ` +
                `Write one short sentence explaining why this landmark matches what they're looking for. ` +
                `Only use the facts and tags given above — do not add names, dates, religious details, or other facts that aren't there. ` +
                `Never state a superlative (e.g. "the tallest", "the largest", "the oldest", "the first", "the only") unless that exact claim is written in the facts above. ` +
                `Write ONLY in Modern Standard Arabic (فصحى) — do not include any Chinese, English, or other language words anywhere in your answer.`,
            },
          ],
          { temperature: 0.2 }
        );
        const cleaned = sanitizeExplanation(result.content);
        if (!cleaned) throw new Error("model output failed Arabic sanity check");
        return { ...landmark, explanation: cleaned, aiFailed: false };
      } catch {
        // Qwen unavailable, or its output didn't pass the sanity check above
        // — either way, the landmark is still a valid, dataset-backed match,
        // so keep it visible with a deterministic fallback line instead of
        // dropping it, showing garbled text, or failing the whole request.
        return { ...landmark, explanation: FALLBACK_EXPLANATION, aiFailed: true };
      }
    })
  );

  return NextResponse.json({ recommendations });
}
