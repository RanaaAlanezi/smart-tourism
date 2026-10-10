"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, ChevronRight, ChevronLeft, Search } from "lucide-react";
import { DestinationCard } from "./DestinationCard";
import { getLandmarks } from "@/lib/landmarks";
import { Landmark, LandmarkCategory } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import { arabicCity, localizeLandmarks } from "@/lib/landmark-i18n";

type RecommendedLandmark = Landmark & { explanation: string; aiFailed?: boolean };
type Step = "location" | "experience" | "time" | "loading" | "results";
type LocationMode = "all" | "city";

// Labels below are [Arabic, English] pairs.
type Pair = [string, string];

interface ExperienceOption {
  key: string;
  emoji: string;
  label: Pair;
  categories: LandmarkCategory[];
}

// Maps the journey's tourism-flavored experience choices onto the existing
// LandmarkCategory scheme — no separate classification system. A few map
// to more than one category (e.g. a "discovery & adventure" mood spans
// both archaeological sites and untouched nature), which is fine: matching
// any of them is still a real, dataset-backed match.
const EXPERIENCE_OPTIONS: ExperienceOption[] = [
  { key: "history", emoji: "🏛️", label: ["تاريخ وثقافة", "History & culture"], categories: ["historical", "cultural"] },
  { key: "nature", emoji: "🌿", label: ["طبيعة وهدوء", "Nature & calm"], categories: ["natural"] },
  { key: "sea", emoji: "🌊", label: ["بحر واسترخاء", "Sea & relaxation"], categories: ["beaches"] },
  { key: "adventure", emoji: "🧭", label: ["استكشاف ومغامرة", "Exploration & adventure"], categories: ["archaeological", "natural"] },
  { key: "city", emoji: "🏙️", label: ["مدينة وحياة", "City life"], categories: ["urban"] },
  { key: "photo", emoji: "📸", label: ["أماكن مميزة للتصوير", "Great photo spots"], categories: ["natural", "beaches", "archaeological"] },
];

const TIME_OPTIONS: { key: string; emoji: string; label: Pair }[] = [
  { key: "short", emoji: "⏱️", label: ["ساعتين – نصف يوم", "Two hours – half a day"] },
  { key: "day", emoji: "☀️", label: ["يوم كامل", "A full day"] },
  { key: "multi", emoji: "🗓️", label: ["أكثر من يوم", "More than a day"] },
];

const FOCUS_OPTIONS: { key: string; emoji: string; label: Pair }[] = [
  { key: "learn", emoji: "📚", label: ["أتعلم", "Learn"] },
  { key: "photo", emoji: "📸", label: ["أصور", "Take photos"] },
  { key: "explore", emoji: "🧭", label: ["أستكشف", "Explore"] },
  { key: "relax", emoji: "🌿", label: ["أسترخي", "Relax"] },
];

const selectedPill = { background: "var(--brand-gold)", color: "var(--brand-green-dark)", borderColor: "var(--brand-gold)" };
const unselectedPill = { borderColor: "var(--brand-line)" };

export function DiscoverJourney() {
  const { lang, t } = useLang();
  const [fetched, setAllLandmarks] = useState<Landmark[]>([]);
  const allLandmarks = useMemo(() => localizeLandmarks(fetched, lang), [fetched, lang]);

  useEffect(() => {
    // Fetched purely to build the city list below from real data — the
    // actual recommendation filtering/scoring happens server-side in
    // /api/recommend against a fresh read, so nothing here is sent to Qwen.
    getLandmarks().then(setAllLandmarks).catch(() => {});
  }, []);

  const cities = useMemo(
    () => [...new Set(allLandmarks.map((l) => l.city))].filter(Boolean).sort((a, b) => a.localeCompare(b, lang)),
    [allLandmarks, lang]
  );

  const [step, setStep] = useState<Step>("location");
  const [locationMode, setLocationMode] = useState<LocationMode>("all");
  const [city, setCity] = useState<string | null>(null);
  const [cityQuery, setCityQuery] = useState("");
  const [experiences, setExperiences] = useState<Set<string>>(new Set());
  const [time, setTime] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [results, setResults] = useState<RecommendedLandmark[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredCities = useMemo(
    () => cities.filter((c) => c.includes(cityQuery.trim())),
    [cities, cityQuery]
  );

  const interests = useMemo(() => {
    const set = new Set<LandmarkCategory>();
    for (const opt of EXPERIENCE_OPTIONS) {
      if (experiences.has(opt.key)) opt.categories.forEach((c) => set.add(c));
    }
    return Array.from(set);
  }, [experiences]);

  function toggleExperience(key: string) {
    setExperiences((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function runDiscovery(overrideCity?: string | null) {
    setStep("loading");
    setError(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interests,
          // The server matches cities by their Arabic name.
          city: overrideCity !== undefined ? overrideCity : locationMode === "city" && city ? arabicCity(city) : null,
          time,
          focus,
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "unknown error");
      setResults(data.recommendations);
    } catch (err) {
      setError(t("تعذر إعداد التوصيات حالياً. حاول مرة أخرى بعد قليل.", "Couldn't prepare recommendations right now. Please try again shortly."));
      setResults(null);
      console.error(err);
    } finally {
      setStep("results");
    }
  }

  function exploreAllInstead() {
    setLocationMode("all");
    setCity(null);
    runDiscovery(null);
  }

  const stepIndex = step === "location" ? 1 : step === "experience" ? 2 : step === "time" ? 3 : null;
  const selectedTimeOption = TIME_OPTIONS.find((t) => t.key === time);

  return (
    <div className="mt-6">
      {stepIndex && (
        <div className="mx-auto mb-2 w-full max-w-xs">
          <div className="flex items-center justify-center text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            {stepIndex} / 3
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--brand-line)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${(stepIndex / 3) * 100}%`, background: "var(--brand-gold)" }}
            />
          </div>
        </div>
      )}

      {step === "location" && (
        <div className="step-fade-in">
          <div className="flex flex-col items-center text-center">
            <span
              className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "var(--surface)" }}
            >
              <Sparkles size={20} color="var(--brand-gold-light)" />
            </span>
            <h2 className="text-xl font-extrabold">{t("اكتشف وجهتك", "Find your destination")}</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              {t("خلّنا نساعدك تلقى أماكن تناسبك في السعودية", "Let us help you find places in Saudi Arabia that suit you")}
            </p>
          </div>

          <h3 className="mt-6 text-center font-bold">{t("وين حاب تستكشف؟", "Where would you like to explore?")}</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={() => {
                setLocationMode("all");
                setCity(null);
              }}
              className="rounded-2xl border p-4 text-start transition"
              style={locationMode === "all" ? selectedPill : { ...unselectedPill, background: "var(--surface)" }}
            >
              <div className="font-bold">📍 {t("كل السعودية", "All of Saudi Arabia")}</div>
              <div
                className="mt-1 text-xs"
                style={{ color: locationMode === "all" ? "var(--brand-green-dark)" : "var(--text-muted)" }}
              >
                {t("خلّ النظام يختار لك من مختلف مناطق المملكة", "Let the system pick from across the Kingdom")}
              </div>
            </button>
            <button
              onClick={() => setLocationMode("city")}
              className="rounded-2xl border p-4 text-start transition"
              style={locationMode === "city" ? selectedPill : { ...unselectedPill, background: "var(--surface)" }}
            >
              <div className="font-bold">📍 {t("اختر مدينة", "Choose a city")}</div>
              <div
                className="mt-1 text-xs"
                style={{ color: locationMode === "city" ? "var(--brand-green-dark)" : "var(--text-muted)" }}
              >
                {t("حدد مدينة معينة", "Pick a specific city")}
              </div>
            </button>
          </div>

          {locationMode === "city" && (
            <div className="mt-4">
              <div
                className="flex items-center gap-2 rounded-xl border px-3 py-2"
                style={{ borderColor: "var(--brand-line)" }}
              >
                <Search size={16} style={{ color: "var(--text-muted)" }} />
                <input
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  placeholder={t("ابحث عن مدينة...", "Search for a city...")}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500"
                />
              </div>
              <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                {filteredCities.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCity(c)}
                    className="rounded-full border px-3 py-1.5 text-sm font-semibold"
                    style={city === c ? selectedPill : unselectedPill}
                  >
                    {c}
                  </button>
                ))}
                {filteredCities.length === 0 && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {t("ما فيه مدينة مطابقة.", "No matching city.")}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setStep("experience")}
              disabled={locationMode === "city" && !city}
              className="flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-bold disabled:opacity-40"
              style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
            >
              {t("التالي", "Next")}
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      )}

      {step === "experience" && (
        <div className="step-fade-in">
          <h3 className="text-center font-bold">{t("وش نوع التجربة اللي تبحث عنها؟", "What kind of experience are you after?")}</h3>
          <p className="mt-1 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            {t("تقدر تختار أكثر من نوع.", "You can choose more than one.")}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {EXPERIENCE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => toggleExperience(opt.key)}
                className="flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition hover:-translate-y-0.5"
                style={experiences.has(opt.key) ? selectedPill : { ...unselectedPill, background: "var(--surface)" }}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="text-sm font-semibold">{t(...opt.label)}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setStep("location")}
              className="flex items-center gap-1.5 rounded-full border px-5 py-2.5 text-sm font-semibold"
              style={{ borderColor: "var(--brand-line)" }}
            >
              <ChevronRight size={16} />
              {t("رجوع", "Back")}
            </button>
            <button
              onClick={() => setStep("time")}
              disabled={experiences.size === 0}
              className="flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-bold disabled:opacity-40"
              style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
            >
              {t("التالي", "Next")}
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      )}

      {step === "time" && (
        <div className="step-fade-in">
          <h3 className="text-center font-bold">{t("كم عندك وقت؟", "How much time do you have?")}</h3>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setTime(opt.key)}
                className="rounded-full border px-4 py-2 text-sm font-semibold"
                style={time === opt.key ? selectedPill : unselectedPill}
              >
                {opt.emoji} {t(...opt.label)}
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-sm font-semibold">
            {t("وش يهمك أكثر؟", "What matters most to you?")}{" "}
            <span className="font-normal" style={{ color: "var(--text-muted)" }}>{t("(اختياري)", "(optional)")}</span>
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {FOCUS_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFocus((prev) => (prev === opt.key ? null : opt.key))}
                className="rounded-full border px-3.5 py-1.5 text-sm font-semibold"
                style={focus === opt.key ? selectedPill : unselectedPill}
              >
                {opt.emoji} {t(...opt.label)}
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setStep("experience")}
              className="flex items-center gap-1.5 rounded-full border px-5 py-2.5 text-sm font-semibold"
              style={{ borderColor: "var(--brand-line)" }}
            >
              <ChevronRight size={16} />
              {t("رجوع", "Back")}
            </button>
            <button
              onClick={() => runDiscovery()}
              disabled={!time}
              className="flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-bold disabled:opacity-40"
              style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
            >
              <Sparkles size={16} />
              {t("اكتشف الوجهات", "Find destinations")}
            </button>
          </div>
        </div>
      )}

      {step === "loading" && (
        <div className="flex flex-col items-center py-12 text-center step-fade-in">
          <span
            className="mb-4 flex h-14 w-14 animate-pulse items-center justify-center rounded-full"
            style={{ background: "var(--surface)" }}
          >
            <Sparkles size={24} color="var(--brand-gold-light)" />
          </span>
          <p className="font-semibold">{t("نبحث لك عن أماكن تناسبك...", "Looking for places that suit you...")}</p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {t("نحلل اختياراتك ونجهز لك اقتراحات مناسبة ✨", "Going through your choices and preparing suggestions ✨")}
          </p>
        </div>
      )}

      {step === "results" && (
        <div className="step-fade-in">
          <div
            className="mx-auto max-w-md rounded-2xl border p-4 text-center"
            style={{ borderColor: "var(--brand-line)", background: "var(--surface)" }}
          >
            <p className="mb-2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              {t("اختياراتك", "Your choices")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
              <span className="rounded-full border px-3 py-1" style={{ borderColor: "var(--brand-line)" }}>
                📍 {locationMode === "city" && city ? city : t("كل السعودية", "All of Saudi Arabia")}
              </span>
              {[...experiences].map((key) => {
                const opt = EXPERIENCE_OPTIONS.find((o) => o.key === key);
                if (!opt) return null;
                return (
                  <span key={key} className="rounded-full border px-3 py-1" style={{ borderColor: "var(--brand-line)" }}>
                    {opt.emoji} {t(...opt.label)}
                  </span>
                );
              })}
              {selectedTimeOption && (
                <span className="rounded-full border px-3 py-1" style={{ borderColor: "var(--brand-line)" }}>
                  {selectedTimeOption.emoji} {t(...selectedTimeOption.label)}
                </span>
              )}
            </div>
          </div>

          {error && <p className="mt-6 text-center text-sm text-red-400">{error}</p>}

          {!error && results && results.length === 0 && (
            <div className="mt-8 text-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {t("ما لقينا أماكن مطابقة تمامًا لاختياراتك.", "We couldn't find places that fully match your choices.")}
              </p>
              {locationMode === "city" && (
                <button
                  onClick={exploreAllInstead}
                  className="mt-4 rounded-full px-6 py-2.5 text-sm font-bold"
                  style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
                >
                  {t("استكشف كل السعودية", "Explore all of Saudi Arabia")}
                </button>
              )}
            </div>
          )}

          {!error && results && results.length > 0 && (
            <>
              <h2 className="mt-6 text-center text-xl font-extrabold">✨ {t("توصياتنا لك", "Our picks for you")}</h2>
              <p className="mt-1 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                {t("بناءً على اختياراتك، اخترنا لك هذه الأماكن:", "Based on your choices, we picked these places:")}
              </p>
              <p className="mt-1 text-center text-sm font-semibold" style={{ color: "var(--brand-gold-light)" }}>
                {t(`وجدنا لك ${results.length} أماكن قد تناسب رحلتك ✨`, `We found ${results.length} places that may suit your trip ✨`)}
              </p>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {results.map((r) => (
                  <DestinationCard key={r.id} landmark={r} aiNote={r.explanation} />
                ))}
              </div>
            </>
          )}

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setStep("location")}
              className="rounded-full border px-5 py-2 text-sm font-semibold"
              style={{ borderColor: "var(--brand-line)" }}
            >
              {t("تعديل الاختيارات", "Change my choices")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
