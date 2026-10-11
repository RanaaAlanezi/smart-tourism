"use client";

import { useEffect, useMemo, useState, use as useUnwrap } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Gamepad2, Map as MapIcon, MapPin, Sparkles } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthProvider";
import { getLandmarks } from "@/lib/landmarks";
import { streamChat } from "@/lib/chatClient";
import { AgeGroup, Landmark } from "@/lib/types";
import { Navbar } from "@/lib/components/Navbar";
import { FavoriteButton } from "@/lib/components/FavoriteButton";
import { NearbyExplorer } from "@/lib/components/NearbyExplorer";
import { GameModal } from "@/lib/components/games/GameModal";
import { GamePicker, PointsBadge, useGameSession } from "@/lib/components/games/GamesPanel";
import { CATEGORY_GRADIENT, categoryLabel, TAG_LABELS } from "@/lib/categories";
import { useLang } from "@/lib/i18n";
import { localizeLandmarks } from "@/lib/landmark-i18n";
import { useFavorites } from "@/lib/favorites";

// Labels and questions below are [Arabic, English] pairs.
const AGE_OPTIONS: { value: AgeGroup; label: [string, string] }[] = [
  { value: "child", label: ["👧 طفل", "👧 Child"] },
  { value: "teen", label: ["🧑 مراهق", "🧑 Teen"] },
  { value: "adult", label: ["👨 بالغ", "👨 Adult"] },
];

const SUGGESTED_QUESTIONS: [string, string][] = [
  ["اشرح لي هذا المكان", "Tell me about this place"],
  ["ما أهميته التاريخية؟", "Why is it historically important?"],
  ["أين يقع هذا المعلم؟", "Where is this landmark?"],
  ["ما الذي يمكنني رؤيته هنا؟", "What can I see here?"],
];

// For landmarks whose record is a single sentence (no key facts yet): the
// questions above would mostly get "no confirmed details", so these stick
// to what such a record can answer.
const BASIC_QUESTIONS: [string, string][] = [
  ["اشرح لي هذا المكان", "Tell me about this place"],
  ["أين يقع هذا المعلم؟", "Where is this landmark?"],
  ["ما نوع هذا المعلم؟", "What kind of landmark is it?"],
  ["ما الذي يمكنني رؤيته هنا؟", "What can I see here?"],
];

interface QaMessage {
  role: "user" | "assistant";
  content: string;
}

const CARD_CLASS = "rounded-2xl border p-5 md:p-6";
const CARD_STYLE = { borderColor: "var(--brand-line)", background: "var(--surface)" };

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1 w-full" style={{ background: "var(--background)" }}>
        {children}
      </main>
    </>
  );
}

// Placeholder in the shape of the page, shown while the landmark loads.
function LandmarkSkeleton() {
  const { t } = useLang();
  return (
    <div className="animate-pulse" aria-label={t("جارٍ تحميل المعلم", "Loading landmark")}>
      <div className="h-64 w-full md:h-96" style={{ background: "var(--surface)" }} />
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-8 md:px-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="h-48 rounded-2xl" style={{ background: "var(--surface)" }} />
        <div className="h-48 rounded-2xl" style={{ background: "var(--surface)" }} />
      </div>
    </div>
  );
}

export default function LandmarkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = useUnwrap(params);
  // Every landmark, not just this one: the games and the nearby map on
  // this page are built from this landmark's neighbours.
  const { lang, t } = useLang();
  // Stored as fetched (Arabic); shown in the visitor's language.
  const [fetched, setLandmarks] = useState<Landmark[] | null>(null);
  const landmarks = useMemo(() => fetched && localizeLandmarks(fetched, lang), [fetched, lang]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    getLandmarks()
      .then(setLandmarks)
      .catch(() => setLoadError(true));
  }, []);

  const landmark = landmarks?.find((l) => l.id === id);

  if (loadError || (landmarks && !landmark)) {
    return (
      <PageShell>
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="text-lg font-extrabold">
            {loadError ? t("تعذّر تحميل المعلم", "Couldn't load this landmark") : t("لم نجد هذا المعلم", "We couldn't find this landmark")}
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            {loadError
              ? t("تحقق من اتصالك بالإنترنت ثم حاول مرة أخرى.", "Check your internet connection and try again.")
              : t("ربما حُذف أو تغيّر رابطه.", "It may have been removed or its link changed.")}
          </p>
          <Link
            href="/explore"
            className="mt-6 inline-block rounded-full px-5 py-2 text-sm font-semibold"
            style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
          >
            {t("استكشف كل المعالم", "Explore all landmarks")}
          </Link>
        </div>
      </PageShell>
    );
  }

  if (!landmarks || !landmark) {
    return (
      <PageShell>
        <LandmarkSkeleton />
      </PageShell>
    );
  }

  // Keyed by landmark, so moving to another landmark's page starts with a
  // clean explanation, conversation and map selection.
  return (
    <PageShell>
      <LandmarkView key={landmark.id} landmark={landmark} landmarks={landmarks} />
    </PageShell>
  );
}

function LandmarkView({ landmark, landmarks }: { landmark: Landmark; landmarks: Landmark[] }) {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const { favoriteIds, toggleFavorite, signedIn } = useFavorites();
  const games = useGameSession(landmarks, landmark);

  const [ageGroup, setAgeGroup] = useState<AgeGroup>("adult");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [qaMessages, setQaMessages] = useState<QaMessage[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);

  async function handleExplain() {
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
          keyFacts: landmark.keyFacts,
          ageGroup,
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "unknown error");

      setExplanation(data.explanation);

      if (user) {
        // Logging the interaction for the dashboard is best-effort: the
        // visitor already has their explanation, so a failed write here
        // (e.g. Firestore rules rejecting it) must not show up as an error.
        addDoc(collection(db, "interactions"), {
          landmarkId: landmark.id,
          landmarkName: landmark.name,
          ageGroup,
          userId: user.uid,
          createdAt: serverTimestamp(),
        }).catch((err) => console.warn("could not log interaction", err));
      }
    } catch (err) {
      console.error("explain failed", err);
      setError(t("تعذّر توليد الشرح حالياً. حاول مرة أخرى بعد قليل.", "Couldn't generate the explanation right now. Please try again shortly."));
    } finally {
      setLoading(false);
    }
  }

  async function askAboutLandmark(question: string) {
    if (qaLoading) return;
    const next: QaMessage[] = [...qaMessages, { role: "user", content: question }];
    setQaMessages(next);
    setQaLoading(true);
    setQaError(null);

    try {
      await streamChat(
        {
          messages: next,
          ageGroup,
          lang,
          landmarkContext: {
            name: landmark.name,
            facts: landmark.facts,
            keyFacts: landmark.keyFacts,
            summary: landmark.summary,
            city: landmark.city,
            region: landmark.region,
            category: landmark.category,
            tags: landmark.tags,
          },
        },
        (replySoFar) => setQaMessages(replySoFar ? [...next, { role: "assistant", content: replySoFar }] : next)
      );
    } catch (err) {
      // Drop a half-written answer rather than leave it in the conversation
      // as if it were complete.
      setQaMessages(next);
      setQaError(err instanceof Error ? err.message : String(err));
    } finally {
      setQaLoading(false);
    }
  }

  const religious = landmark.tags?.includes("religious");
  const goldButton = { background: "var(--brand-gold)", color: "var(--brand-green-dark)", borderColor: "var(--brand-gold)" };

  return (
    <>
      {/* hero */}
      <div
        className="relative h-64 w-full overflow-hidden md:h-96"
        style={landmark.image ? undefined : { background: CATEGORY_GRADIENT[landmark.category] }}
      >
        {landmark.image && (
          <Image src={landmark.image} alt={landmark.name} fill priority sizes="100vw" className="object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1A15] via-black/35 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-6 pb-6 md:px-10">
          <div>
            <nav className="mb-2 flex items-center gap-1 text-xs font-semibold text-white/75">
              <Link href="/explore" className="hover:text-white">{t("استكشف", "Explore")}</Link>
              <ChevronLeft size={13} />
              <span>{landmark.city}</span>
            </nav>
            <h1 className="text-3xl font-extrabold text-white md:text-4xl">{landmark.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="flex items-center gap-1 rounded-full bg-black/45 px-3 py-1 text-white backdrop-blur">
                <MapPin size={12} />
                {landmark.city}
              </span>
              <span className="rounded-full px-3 py-1" style={goldButton}>
                {categoryLabel(landmark.category, lang)}
              </span>
              {religious && (
                <span className="rounded-full bg-black/45 px-3 py-1 text-white backdrop-blur">
                  {TAG_LABELS.religious.emoji} {t(TAG_LABELS.religious.ar, TAG_LABELS.religious.en)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FavoriteButton
              active={favoriteIds.has(landmark.id)}
              signedIn={signedIn}
              onToggle={() => toggleFavorite(landmark.id)}
            />
            {landmark.latitude != null && landmark.longitude != null && (
              <Link
                href={`/map?id=${landmark.id}`}
                className="flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-zinc-800 shadow-sm hover:bg-white"
              >
                <MapIcon size={14} />
                {t("عرض على الخريطة", "Show on map")}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-8 md:px-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* about */}
        <section className={`${CARD_CLASS} lg:col-start-1`} style={CARD_STYLE}>
          <h2 className="text-lg font-extrabold">{t("عن المعلم", "About this landmark")}</h2>
          <p className="mt-3 leading-8" style={{ color: "var(--foreground)" }}>{landmark.facts}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {[
              { label: t("المدينة", "City"), value: landmark.city },
              { label: t("المنطقة", "Region"), value: landmark.region },
              { label: t("النوع", "Type"), value: categoryLabel(landmark.category, lang) },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-3" style={{ background: "var(--surface-2)" }}>
                <dt className="text-xs" style={{ color: "var(--text-muted)" }}>{item.label}</dt>
                <dd className="mt-0.5 font-bold">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* games — beside the content on desktop, right after "about" on mobile */}
        <aside className="lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start">
          <div className={CARD_CLASS} style={CARD_STYLE}>
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <Gamepad2 size={18} color="var(--brand-gold)" />
              {t("العب واكتشف", "Play & Discover")}
            </h2>
            <p className="mb-4 mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              {t("ألعاب عن هذا المعلم والمعالم القريبة منه.", "Games about this landmark and the ones near it.")}
            </p>
            <GamePicker onStart={games.start} timelineReady={games.timelineReady} columns={1} />
            <div className="mt-4">
              <PointsBadge />
            </div>
          </div>
        </aside>

        {/* age-tailored explanation */}
        <section className={`${CARD_CLASS} lg:col-start-1`} style={CARD_STYLE}>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <Sparkles size={18} color="var(--brand-gold)" />
            {t("شرح مخصص حسب العمر", "An explanation for your age")}
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {t("اختر الفئة العمرية ليكتب لك الذكاء الاصطناعي شرحًا يناسبها.", "Choose an age group and the AI will write an explanation to suit it.")}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {AGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAgeGroup(opt.value)}
                className="rounded-full border px-4 py-1.5 text-sm font-semibold"
                style={ageGroup === opt.value ? goldButton : { borderColor: "var(--brand-line)" }}
              >
                {t(...opt.label)}
              </button>
            ))}
            <button
              onClick={handleExplain}
              disabled={loading}
              className="rounded-full px-5 py-1.5 text-sm font-semibold text-white disabled:opacity-50 sm:ms-auto"
              style={{ background: "var(--brand-green)" }}
            >
              {loading ? t("جارٍ توليد الشرح...", "Writing the explanation...") : t("ولّد الشرح", "Explain it")}
            </button>
          </div>

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          {explanation && (
            <div className="step-fade-in mt-5 rounded-xl p-4" style={{ background: "var(--surface-2)" }}>
              <p className="whitespace-pre-wrap leading-8">{explanation}</p>
            </div>
          )}
        </section>

        {/* AI Q&A */}
        <section className={`${CARD_CLASS} lg:col-start-1`} style={CARD_STYLE}>
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <Sparkles size={18} color="var(--brand-gold)" />
            {t("اسأل الذكاء الاصطناعي عن هذا المعلم", "Ask the AI about this landmark")}
          </h2>

          {qaMessages.length === 0 && (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(landmark.keyFacts ? SUGGESTED_QUESTIONS : BASIC_QUESTIONS).map((pair) => t(...pair)).map((q) => (
                <button
                  key={q}
                  onClick={() => askAboutLandmark(q)}
                  className="rounded-xl border p-2.5 text-start text-sm transition hover:brightness-125"
                  style={{ borderColor: "var(--brand-line)", background: "var(--surface-2)" }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {qaMessages.length > 0 && (
            <div className="mt-4 space-y-3">
              {qaMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-7"
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
              {qaLoading && qaMessages[qaMessages.length - 1]?.role === "user" && (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("جارٍ الكتابة...", "Writing...")}</p>
              )}
            </div>
          )}

          {qaError && <p className="mt-3 text-sm text-red-400">{qaError}</p>}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem("q") as HTMLInputElement;
              if (input.value.trim()) {
                askAboutLandmark(input.value.trim());
                input.value = "";
              }
            }}
            className="mt-4 flex items-center gap-2"
          >
            <input
              name="q"
              type="text"
              placeholder={t("اسأل سؤالك عن هذا المعلم...", "Ask your question about this landmark...")}
              className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none placeholder:text-zinc-500"
              style={{ borderColor: "var(--brand-line)", background: "var(--background)" }}
            />
            <button
              type="submit"
              disabled={qaLoading}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--brand-green)" }}
            >
              {t("إرسال", "Send")}
            </button>
          </form>
        </section>

        {/* nearby landmarks */}
        <div className="lg:col-span-2">
          <NearbyExplorer landmarks={landmarks} current={landmark} />
        </div>
      </div>

      {games.session && (
        <GameModal
          session={games.session}
          onRestart={games.restart}
          onClose={games.close}
          currentLandmarkId={landmark.id}
        />
      )}
    </>
  );
}
