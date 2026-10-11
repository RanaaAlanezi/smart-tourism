import { NextRequest, NextResponse } from "next/server";
import { AgeGroup, ChatSource, ChatStreamEvent, Lang, Landmark } from "@/lib/types";
import { afterLastCjk, askQwenStream, ChatMessage, RETRY_TEMPERATURES } from "@/lib/services/aiService";
import { getLandmarks } from "@/lib/landmarks";
import { arabicName, findRelevantLandmarks, landmarksMentionedIn } from "@/lib/landmarkSearch";
import { localizeLandmarks } from "@/lib/landmark-i18n";

const AGE_STYLE: Record<AgeGroup, string> = {
  child: "Explain things in very simple words suitable for a 6-9 year old child, with short sentences and no complex terms.",
  teen: "Explain things in an engaging way suitable for a 13-17 year old teenager, connecting facts to interesting stories.",
  adult: "Explain things precisely and informatively, suitable for an adult, in a helpful and professional register.",
};

// Earlier turns sent back to the model. Enough to follow a conversation
// without letting a long chat crowd the landmark facts out of the small
// model's context window.
const MAX_HISTORY_TURNS = 6;
const MAX_HISTORY_CHARS = 600;

const UNAVAILABLE_MESSAGE: Record<Lang, string> = {
  ar: "تعذّر الوصول إلى المساعد الذكي حالياً. حاول مرة أخرى بعد قليل.",
  en: "The AI assistant can't be reached right now. Please try again shortly.",
};

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

type LandmarkFacts = Pick<Landmark, "name" | "facts" | "keyFacts"> & Partial<Pick<Landmark, "city" | "category" | "tags">>;

// The small local model reliably garbles numbers/names pulled from a
// flowing Arabic prose paragraph (e.g. reads "302 meters" as "302
// months"), but gets them right from short labeled facts — so keyFacts
// go in alongside as the reference for figures. The prose stays the source
// of Arabic wording: translating the English labels on its own, the model
// turns "Nabataean" into "نباتية" and leaves "balconies" untranslated.
// City and category are spelled out as labels for the same reason as the
// numbers: left to infer them, the model moves landmarks between cities.
function describeLandmark(landmark: LandmarkFacts, lang: Lang): string {
  const labels = [
    `Name: ${lang === "en" ? landmark.name : arabicName(landmark.name)}`,
    landmark.city && `City: ${landmark.city}`,
    landmark.category && `Category: ${landmark.category}`,
    landmark.tags?.length && `Tags: ${landmark.tags.join(", ")}`,
  ].filter(Boolean);
  const figures = landmark.keyFacts ? `\n  Exact figures: ${landmark.keyFacts}` : "";
  return `- ${labels.join(" | ")}\n  Facts: ${landmark.facts}${figures}`;
}

// Instructions are written in English on purpose: the local quantized Qwen
// model follows English instructions far more reliably and stays on-topic,
// while still producing fluent Arabic output when explicitly told to.
// Deliberately says nothing about how to write digits: an instruction like
// "write numbers as 0-9" made the model stop mid-answer to reason about
// digits in Chinese in over half of test runs, versus about one in eight
// without it.
function buildSystemPrompt(ageGroup: AgeGroup, singleLandmark: boolean, lang: Lang): string {
  // In English the facts handed over are already in English, so there is no
  // Arabic wording to protect — only the numbers.
  const language =
    lang === "en"
      ? `Some landmarks also have an "Exact figures" line: use it to get numbers and dates exactly right. ` +
        `Write ONLY in English — do not include any Chinese, Arabic, or other language words anywhere in your answer.`
      : `Some landmarks also have an "Exact figures" line: use it only to get numbers and dates exactly right, and take all Arabic names and terms from "Facts" rather than translating that line yourself. ` +
        `Write ONLY in Modern Standard Arabic (فصحى) — do not include any Chinese, English, or other language words anywhere in your answer.`;

  const scope = singleLandmark
    ? `The visitor is reading the page of one landmark, given under "Landmarks" in their message. Answer about that landmark only.`
    : `Each visitor message comes with a "Landmarks" list — the app's own records relevant to the question. ` +
      `Mention ONLY landmarks from that list, with their names written exactly as listed, and never place a landmark in a city other than its "City". ` +
      `When recommending, pick at most 4 landmarks that best fit the question and give each one or two sentences drawn from its facts. ` +
      `For a trip plan, arrange only the listed landmarks into days. ` +
      `If none of the listed landmarks fits what was asked (a city or kind of place that isn't there), say the app has no record of that yet, then offer the closest listed ones.`;

  return (
    `You are the assistant of "Smart Tourism", a guide to travel and landmarks in Saudi Arabia. ${scope} ` +
    `Base your answer only on the facts given; do not invent names, dates, or facts that aren't there. ` +
    `If asked about something the facts don't state (e.g. opening hours, prices, suitability for families or children), say there is no confirmed information on that instead of guessing. ` +
    `Never state a superlative (e.g. "the tallest", "the largest", "the oldest", "the first", "the only") about anything unless that exact claim is written in the facts — superlatives go out of date and are the most common way you get facts wrong. ` +
    `${AGE_STYLE[ageGroup]} Keep the answer short and focused. Write plain text with no markdown symbols such as ** or #. ` +
    language
  );
}

function toSource({ id, name, city, category, image }: Landmark): ChatSource {
  return { id, name, city, category, image };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, ageGroup, landmarkContext } = body as {
    messages: ChatTurn[];
    ageGroup: AgeGroup;
    lang?: Lang;
    landmarkContext?: { name: string; facts: string; keyFacts?: string };
  };

  if (!messages?.length || !ageGroup || !AGE_STYLE[ageGroup]) {
    return NextResponse.json(
      { error: "messages and a valid ageGroup are required" },
      { status: 400 }
    );
  }

  const lang: Lang = body.lang === "en" ? "en" : "ar";
  const history = messages.slice(0, -1);
  const lastQuestion = messages[messages.length - 1].content;

  // Without a specific landmark in focus, ground the model in our real data
  // instead of letting it improvise from general knowledge — and only in
  // the few landmarks the question is about, chosen here rather than by
  // the model (see findRelevantLandmarks).
  let relevant: Landmark[] = [];
  if (!landmarkContext?.name) {
    try {
      relevant = findRelevantLandmarks(await getLandmarks(), lastQuestion, {
        previousQuestions: history.filter((m) => m.role === "user").map((m) => m.content),
        previousAnswer: history.findLast((m) => m.role === "assistant")?.content,
      });
    } catch {
      // Firestore unavailable — fall back to the model's general knowledge.
    }
  }
  // Matched against the Arabic records (the search understands English
  // questions too); handed to the model, and linked under the answer, in
  // the visitor's language.
  relevant = localizeLandmarks(relevant, lang);

  const grounding: LandmarkFacts[] = landmarkContext?.name ? [landmarkContext] : relevant;
  const landmarksBlock = grounding.length
    ? `Landmarks:\n${grounding.map((l) => describeLandmark(l, lang)).join("\n")}\n\n`
    : "";

  const chatMessages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(ageGroup, Boolean(landmarkContext?.name), lang) },
    ...history.slice(-MAX_HISTORY_TURNS).map((m) => ({
      role: m.role,
      content: m.content.slice(0, MAX_HISTORY_CHARS),
    })),
    { role: "user", content: `${landmarksBlock}Question: ${lastQuestion}` },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        let reply = "";
        for (const temperature of RETRY_TEMPERATURES) {
          // Qwen sometimes stops mid-answer, makes an aside in Chinese, then
          // writes the whole answer again (see hasCjk). While `inAside` the
          // pieces are dropped; the restated answer starts on the line after
          // the aside, or straight after its closing colon.
          let inAside = false;
          let asideOver = false;
          // req.signal aborts when the visitor leaves or closes the page, so
          // the model stops generating an answer nobody will read.
          for await (const delta of askQwenStream(chatMessages, { temperature, maxTokens: 700, signal: req.signal })) {
            const aside = afterLastCjk(delta);
            if (aside) {
              if (!inAside) {
                // Tell the page to throw away what it has shown so far.
                inAside = true;
                reply = "";
                send({ type: "reset" });
              }
              asideOver = aside.last === "：" || aside.rest.includes("\n");
              continue;
            }

            let text = delta;
            if (inAside) {
              if (delta.includes("\n")) {
                asideOver = true;
                text = delta.slice(delta.lastIndexOf("\n") + 1);
              }
              if (!asideOver || !text.trim()) continue;
              inAside = false;
              text = text.trimStart();
            }
            reply += text;
            send({ type: "delta", text });
          }

          if (!inAside && reply.trim()) break;
          // The aside never gave way to a usable answer — ask again, with
          // more room to vary (at the same temperature it repeats itself).
          reply = "";
          send({ type: "reset" });
        }
        if (!reply) throw new Error("model output kept drifting out of the requested language");
        send({ type: "done", sources: landmarksMentionedIn(reply, relevant).map(toSource) });
      } catch (err) {
        if (!req.signal.aborted) {
          console.error("chat: model request failed", err);
          send({ type: "error", message: UNAVAILABLE_MESSAGE[lang] });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed by the client disconnecting.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
