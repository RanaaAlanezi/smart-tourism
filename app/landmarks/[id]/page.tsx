"use client";

import { useEffect, useState, use as useUnwrap } from "react";
import Image from "next/image";
import Link from "next/link";
import { Map as MapIcon, Sparkles } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthProvider";
import { getLandmark } from "@/lib/landmarks";
import { AgeGroup, Landmark } from "@/lib/types";
import { Navbar } from "@/lib/components/Navbar";
import { FavoriteButton } from "@/lib/components/FavoriteButton";
import { CATEGORY_LABEL } from "@/lib/categories";
import { useFavorites } from "@/lib/favorites";

const AGE_OPTIONS: { value: AgeGroup; label: string }[] = [
  { value: "child", label: "👧 طفل" },
  { value: "teen", label: "🧑 مراهق" },
  { value: "adult", label: "👨 بالغ" },
];

const SUGGESTED_QUESTIONS = [
  "اشرح لي هذا المكان",
  "ما أهميته التاريخية؟",
  "هل هو مناسب للأطفال؟",
  "ما الذي يمكنني رؤيته هنا؟",
];

interface QaMessage {
  role: "user" | "assistant";
  content: string;
}

export default function LandmarkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = useUnwrap(params);
  const { user } = useAuth();
  const { favoriteIds, toggleFavorite, signedIn } = useFavorites();

  const [landmark, setLandmark] = useState<Landmark | null>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("adult");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [qaMessages, setQaMessages] = useState<QaMessage[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);

  useEffect(() => {
    getLandmark(id).then(setLandmark);
  }, [id]);

  async function handleExplain() {
    if (!landmark) return;
    setLoading(true);
    setError(null);
    setExplanation(null);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landmarkName: landmark.name,
          facts: landmark.facts,
          ageGroup,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "unknown error");

      setExplanation(data.explanation);
      setModel(data.model);

      if (user) {
        await addDoc(collection(db, "interactions"), {
          landmarkId: landmark.id,
          landmarkName: landmark.name,
          ageGroup,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function askAboutLandmark(question: string) {
    if (!landmark || qaLoading) return;
    const next: QaMessage[] = [...qaMessages, { role: "user", content: question }];
    setQaMessages(next);
    setQaLoading(true);
    setQaError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          ageGroup,
          landmarkContext: { name: landmark.name, facts: landmark.facts },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "unknown error");
      setQaMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setQaError(String(err));
    } finally {
      setQaLoading(false);
    }
  }

  if (!landmark) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto px-6 py-10 w-full" style={{ background: "var(--background)" }}>
          جارٍ التحميل...
        </main>
      </>
    );
  }

  const heroImage = landmark.image;
  const favorited = favoriteIds.has(landmark.id);

  const actionButtons = (
    <div className="flex items-center gap-2">
      <FavoriteButton
        active={favorited}
        signedIn={signedIn}
        onToggle={() => toggleFavorite(landmark.id)}
      />
      <Link
        href={`/map?id=${landmark.id}`}
        className="flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-white"
      >
        <MapIcon size={14} />
        عرض على الخريطة
      </Link>
    </div>
  );

  return (
    <>
      <Navbar />
      {heroImage && (
        <div className="relative h-56 w-full overflow-hidden md:h-80">
          <Image src={heroImage} alt={landmark.name} fill priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-3xl items-end justify-between px-6 pb-5">
            <div>
              <h1 className="text-2xl font-bold text-white md:text-3xl">{landmark.name}</h1>
              <p className="text-white/80">
                {landmark.city} · {CATEGORY_LABEL[landmark.category]}
              </p>
            </div>
            {actionButtons}
          </div>
        </div>
      )}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-10 w-full" style={{ background: "var(--background)" }}>
      {!heroImage && (
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-1">{landmark.name}</h1>
            <p style={{ color: "var(--text-muted)" }}>
              {landmark.city} · {CATEGORY_LABEL[landmark.category]}
            </p>
          </div>
          {actionButtons}
        </div>
      )}

      <p className="mb-6 mt-2" style={{ color: "var(--foreground)" }}>{landmark.facts}</p>

      <div className="rounded-lg border p-5" style={{ borderColor: "var(--brand-line)", background: "var(--surface)" }}>
        <h2 className="font-medium mb-3">شرح مخصص حسب العمر (Qwen)</h2>

        <div className="flex gap-2 mb-4">
          {AGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setAgeGroup(opt.value)}
              className="px-3 py-1.5 rounded-full text-sm border"
              style={
                ageGroup === opt.value
                  ? { background: "var(--brand-gold)", color: "var(--brand-green-dark)", borderColor: "var(--brand-gold)" }
                  : { borderColor: "var(--brand-line)" }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleExplain}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-white disabled:opacity-50"
          style={{ background: "var(--brand-green)" }}
        >
          {loading ? "جارٍ توليد الشرح..." : "ولّد الشرح"}
        </button>

        {error && <p className="text-red-400 mt-4 text-sm">خطأ: {error}</p>}

        {explanation && (
          <div className="mt-5 rounded-lg p-4" style={{ background: "var(--surface-2)" }}>
            <p className="whitespace-pre-wrap">{explanation}</p>
            <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>النموذج: {model}</p>
          </div>
        )}
      </div>

      {/* AI Q&A */}
      <div className="mt-6 rounded-lg border p-5" style={{ borderColor: "var(--brand-line)", background: "var(--surface)" }}>
        <h2 className="font-medium mb-3 flex items-center gap-2">
          <Sparkles size={16} style={{ color: "var(--brand-gold)" }} />
          اسأل الذكاء الاصطناعي عن هذا المعلم
        </h2>

        {qaMessages.length === 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mb-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => askAboutLandmark(q)}
                className="rounded-xl border p-2.5 text-right text-sm transition hover:brightness-110"
                style={{ borderColor: "var(--brand-line)" }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {qaMessages.length > 0 && (
          <div className="space-y-3 mb-4">
            {qaMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm"
                  style={
                    m.role === "user"
                      ? { background: "var(--brand-green)", color: "white" }
                      : { background: "var(--surface-2)" }
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {qaLoading && <p className="text-sm" style={{ color: "var(--text-muted)" }}>جارٍ الكتابة...</p>}
          </div>
        )}

        {qaError && <p className="text-red-400 mb-3 text-sm">خطأ: {qaError}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem("q") as HTMLInputElement;
            if (input.value.trim()) {
              askAboutLandmark(input.value.trim());
              input.value = "";
            }
          }}
          className="flex items-center gap-2"
        >
          <input
            name="q"
            type="text"
            placeholder="اسأل سؤالك عن هذا المعلم..."
            className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none placeholder:text-zinc-500"
            style={{ borderColor: "var(--brand-line)", background: "var(--background)" }}
          />
          <button
            type="submit"
            disabled={qaLoading}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--brand-green)" }}
          >
            إرسال
          </button>
        </form>
      </div>
      </main>
    </>
  );
}
