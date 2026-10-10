"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, RotateCcw, Send, Sparkles } from "lucide-react";
import { Navbar } from "@/lib/components/Navbar";
import { DiscoverJourney } from "@/lib/components/DiscoverJourney";
import { streamChat } from "@/lib/chatClient";
import { AgeGroup, ChatSource } from "@/lib/types";
import { useLang } from "@/lib/i18n";

// Labels and questions below are [Arabic, English] pairs.
const AGE_OPTIONS: { value: AgeGroup; label: [string, string] }[] = [
  { value: "child", label: ["👧 طفل", "👧 Child"] },
  { value: "teen", label: ["🧑 مراهق", "🧑 Teen"] },
  { value: "adult", label: ["👨 بالغ", "👨 Adult"] },
];

const SUGGESTED_QUESTIONS: [string, string][] = [
  ["ما أفضل الأماكن التاريخية في العلا؟", "What are the best historical places in AlUla?"],
  ["أبغى أماكن مناسبة للعائلة.", "I'd like places for a family trip."],
  ["اشرح لي الدرعية بطريقة بسيطة.", "Explain Diriyah to me simply."],
  ["أبغى وجهة طبيعية وهادئة.", "I'd like a quiet nature destination."],
];

// The assistant's round avatar beside its messages.
function AssistantAvatar() {
  return (
    <span
      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{ background: "var(--brand-green)" }}
    >
      <Sparkles size={15} color="var(--brand-gold-light)" />
    </span>
  );
}

interface Message {
  role: "user" | "assistant";
  content: string;
  // Landmarks the answer mentions, linked under it once it's complete.
  sources?: ChatSource[];
}

function AssistantPageInner() {
  const searchParams = useSearchParams();
  const { lang, t } = useLang();
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("adult");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);

  const [mode, setMode] = useState<"chat" | "recommend">("chat");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      let reply = "";
      const sources = await streamChat(
        { messages: nextMessages.map(({ role, content }) => ({ role, content })), ageGroup, lang },
        (replySoFar) => {
          reply = replySoFar;
          setMessages(reply ? [...nextMessages, { role: "assistant", content: reply }] : nextMessages);
        }
      );
      setMessages([...nextMessages, { role: "assistant", content: reply, sources }]);
    } catch (err) {
      // Drop a half-written answer rather than leave it in the conversation
      // as if it were complete.
      setMessages(nextMessages);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoSentRef.current) {
      autoSentRef.current = true;
      sendMessage(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <>
      <Navbar />
      <main className="flex flex-1 w-full flex-col" style={{ background: "var(--background)" }}>
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-8 md:px-10">
          {mode === "chat" && messages.length === 0 && (
            <div className="flex flex-col items-center text-center">
              <span
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "var(--surface)" }}
              >
                <Sparkles size={24} color="var(--brand-gold-light)" />
              </span>
              <h1 className="text-2xl font-extrabold md:text-3xl">{t("كيف يمكنني مساعدتك؟", "How can I help you?")}</h1>
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                {t("اسألني عن الوجهات والمعالم السياحية في السعودية.", "Ask me about destinations and landmarks in Saudi Arabia.")}
              </p>
            </div>
          )}

          {/* mode switcher — chat vs. the "Discover Your Destination" journey */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setMode("chat")}
              className="rounded-full border px-4 py-1.5 text-sm font-semibold"
              style={
                mode === "chat"
                  ? { background: "var(--brand-gold)", color: "var(--brand-green-dark)", borderColor: "var(--brand-gold)" }
                  : { borderColor: "var(--brand-line)" }
              }
            >
              {t("اسأل المساعد", "Ask the assistant")}
            </button>
            <button
              onClick={() => setMode("recommend")}
              className="flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold"
              style={
                mode === "recommend"
                  ? { background: "var(--brand-gold)", color: "var(--brand-green-dark)", borderColor: "var(--brand-gold)" }
                  : { borderColor: "var(--brand-line)" }
              }
            >
              <Sparkles size={14} />
              {t("اكتشف وجهتك", "Find your destination")}
            </button>
          </div>

          {mode === "recommend" && <DiscoverJourney />}

          {/* age selector */}
          {mode === "chat" && (
          <>
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{t("اختر مستوى الشرح:", "Explain it for:")}</span>
            {AGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAgeGroup(opt.value)}
                className="rounded-full border px-4 py-1.5 text-sm font-semibold"
                style={
                  ageGroup === opt.value
                    ? { background: "var(--brand-gold)", color: "var(--brand-green-dark)", borderColor: "var(--brand-gold)" }
                    : { borderColor: "var(--brand-line)" }
                }
              >
                {t(...opt.label)}
              </button>
            ))}
          </div>

          {/* suggested questions */}
          {messages.length === 0 && (
            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTED_QUESTIONS.map((pair) => t(...pair)).map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="glow-tile flex items-center gap-3 rounded-xl border p-3.5 text-start text-sm"
                  style={{ borderColor: "var(--brand-line)", background: "var(--surface)" }}
                >
                  <Sparkles size={14} className="shrink-0" color="var(--brand-gold)" />
                  {q}
                </button>
              ))}
            </div>
          )}

          {messages.length > 0 && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  setMessages([]);
                  setError(null);
                }}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition hover:border-[var(--brand-gold)] disabled:opacity-40"
                style={{ borderColor: "var(--brand-line)", color: "var(--text-muted)" }}
              >
                <RotateCcw size={13} />
                {t("محادثة جديدة", "New conversation")}
              </button>
            </div>
          )}

          {/* messages */}
          <div className="mt-6 flex-1 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`step-fade-in flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && <AssistantAvatar />}
                <div className="max-w-[80%]">
                  <div
                    className="whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-7"
                    style={
                      m.role === "user"
                        ? { background: "var(--brand-green)", color: "white" }
                        : { background: "var(--surface-2)", color: "var(--foreground)" }
                    }
                  >
                    {m.content}
                  </div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.sources.map((source) => (
                        <Link
                          key={source.id}
                          href={`/landmarks/${source.id}`}
                          className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition hover:brightness-110"
                          style={{ borderColor: "var(--brand-line)" }}
                        >
                          <MapPin size={12} color="var(--brand-gold)" />
                          {source.name}
                          <span style={{ color: "var(--text-muted)" }}>· {source.city}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start gap-2.5">
                <AssistantAvatar />
                <div
                  role="status"
                  aria-label={t("جارٍ الكتابة...", "Writing...")}
                  className="flex items-center gap-1.5 rounded-2xl px-4 py-3.5"
                  style={{ background: "var(--surface-2)" }}
                >
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="typing-dot h-2 w-2 rounded-full"
                      style={{ background: "var(--brand-gold-light)", animationDelay: `${dot * 160}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div ref={bottomRef} />
          </div>

          {/* input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="sticky bottom-6 mt-6 flex items-center gap-2 rounded-2xl border bg-[var(--background)] p-2 shadow-sm"
            style={{ borderColor: "var(--brand-line)" }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("اكتب سؤالك هنا...", "Type your question here...")}
              className="w-full bg-transparent px-3 py-2 text-sm outline-none placeholder:text-zinc-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label={t("إرسال", "Send")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-40"
              style={{ background: "var(--brand-green)" }}
            >
              <Send size={16} />
            </button>
          </form>
          </>
          )}
        </div>
      </main>
    </>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={null}>
      <AssistantPageInner />
    </Suspense>
  );
}
