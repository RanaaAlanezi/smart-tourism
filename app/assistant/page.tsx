"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Sparkles } from "lucide-react";
import { Navbar } from "@/lib/components/Navbar";
import { AgeGroup } from "@/lib/types";

const AGE_OPTIONS: { value: AgeGroup; label: string }[] = [
  { value: "child", label: "👧 طفل" },
  { value: "teen", label: "🧑 مراهق" },
  { value: "adult", label: "👨 بالغ" },
];

const SUGGESTED_QUESTIONS = [
  "ما أفضل الأماكن التاريخية في العلا؟",
  "أبغى أماكن مناسبة للعائلة.",
  "اشرح لي الدرعية بطريقة بسيطة.",
  "أبغى وجهة طبيعية وهادئة.",
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

function AssistantPageInner() {
  const searchParams = useSearchParams();
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("adult");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoSentRef = useRef(false);

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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, ageGroup }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "unknown error");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(String(err));
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
          {messages.length === 0 && (
            <div className="flex flex-col items-center text-center">
              <span
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "var(--accent-tint,#E4EEEC)" }}
              >
                <Sparkles size={24} color="var(--brand-green)" />
              </span>
              <h1 className="text-2xl font-extrabold md:text-3xl">كيف يمكنني مساعدتك؟</h1>
              <p className="mt-2 text-sm text-zinc-500">
                اسألني عن الوجهات والمعالم السياحية في السعودية.
              </p>
            </div>
          )}

          {/* age selector */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">اختر مستوى الشرح:</span>
            {AGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAgeGroup(opt.value)}
                className="rounded-full border px-4 py-1.5 text-sm font-semibold"
                style={
                  ageGroup === opt.value
                    ? { background: "var(--brand-green)", color: "white", borderColor: "var(--brand-green)" }
                    : { borderColor: "var(--brand-line)" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* suggested questions */}
          {messages.length === 0 && (
            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-xl border p-3 text-right text-sm transition hover:bg-black/[.03] dark:hover:bg-white/[.05]"
                  style={{ borderColor: "var(--brand-line)" }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* messages */}
          <div className="mt-6 flex-1 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm"
                  style={
                    m.role === "user"
                      ? { background: "var(--brand-green)", color: "white" }
                      : { background: "var(--surface-2,#EFEAE0)", color: "var(--foreground)" }
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl px-4 py-2.5 text-sm text-zinc-500"
                  style={{ background: "var(--surface-2,#EFEAE0)" }}
                >
                  جارٍ الكتابة...
                </div>
              </div>
            )}
            {error && <p className="text-sm text-red-600">خطأ: {error}</p>}
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
              placeholder="اكتب سؤالك هنا..."
              className="w-full bg-transparent px-3 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="إرسال"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-40"
              style={{ background: "var(--brand-green)" }}
            >
              <Send size={16} />
            </button>
          </form>
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
