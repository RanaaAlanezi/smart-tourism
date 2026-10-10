"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Brain,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  Gamepad2,
  Link2,
  ListOrdered,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/lib/components/Navbar";
import { DestinationCard } from "@/lib/components/DestinationCard";
import { MapExplorer } from "@/lib/components/MapExplorer";
import { CountUp, Reveal } from "@/lib/components/Motion";
import { getLandmarks } from "@/lib/landmarks";
import { Landmark } from "@/lib/types";
import { getCityTemperature } from "@/lib/weather";
import { FilterCategory, filterLabel, CATEGORY_ICON, CATEGORY_PIN_COLOR } from "@/lib/categories";
import { useLang } from "@/lib/i18n";
import { localizeLandmarks } from "@/lib/landmark-i18n";
import { useFavorites } from "@/lib/favorites";

const TYPE_TILES: FilterCategory[] = ["historical", "archaeological", "natural", "beaches", "urban", "cultural"];

// Text below is written as [Arabic, English] pairs.
type Pair = [string, string];

// One-tap searches under the hero's search box.
const QUICK_SEARCHES: Pair[] = [
  ["العلا", "AlUla"],
  ["الدرعية", "Diriyah"],
  ["جدة", "Jeddah"],
  ["أبها", "Abha"],
  ["الرياض", "Riyadh"],
];

const GAME_TILES: { title: Pair; subtitle: Pair; icon: typeof Brain }[] = [
  { title: ["لعبة الذاكرة", "Memory Game"], subtitle: ["طابق الصورة بالاسم", "Match photo to name"], icon: Brain },
  { title: ["اختبار المعلومات", "Knowledge Quiz"], subtitle: ["أسئلة عن المعالم", "Questions about landmarks"], icon: CircleHelp },
  { title: ["مطابقة العناصر", "Matching"], subtitle: ["اربط المعلم بمدينته", "Link landmark to city"], icon: Link2 },
  { title: ["ترتيب الأحداث", "Timeline"], subtitle: ["رتّب الخط الزمني", "Order the events"], icon: ListOrdered },
];

// How many featured destinations the homepage shows before sending the
// visitor to Explore for the rest.
const FEATURED_ON_HOME = 8;

// How long each landmark stays in the hero's spotlight before the next.
const SPOTLIGHT_MS = 6000;

const AI_SUGGESTIONS: Pair[] = [
  ["أبغى أماكن تاريخية في العلا", "Historical places in AlUla"],
  ["وجهة مناسبة للعائلة", "A destination for a family trip"],
  ["أماكن طبيعية وأجواء باردة", "Nature spots with cool weather"],
];

export default function Home() {
  const { lang, t } = useLang();
  // Stored as fetched (Arabic); shown in the visitor's language.
  const [fetched, setLandmarks] = useState<Landmark[]>([]);
  const landmarks = useMemo(() => localizeLandmarks(fetched, lang), [fetched, lang]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spotlight, setSpotlight] = useState(0);
  const [temps, setTemps] = useState<Record<string, number>>({});
  const { favoriteIds, toggleFavorite, signedIn } = useFavorites();

  useEffect(() => {
    getLandmarks()
      .then(setLandmarks)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const cities = [...new Set(landmarks.map((l) => l.city))];
    cities.forEach((city) => {
      if (city in temps) return;
      getCityTemperature(city).then((t) => {
        if (t !== null) setTemps((prev) => ({ ...prev, [city]: t }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landmarks]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return landmarks;
    return landmarks.filter(
      (l) =>
        l.name?.includes(q) ||
        l.nameEn?.toLowerCase().includes(q.toLowerCase()) ||
        l.city?.includes(q) ||
        l.summary?.includes(q)
    );
  }, [landmarks, query]);

  const favoriteLandmarks = useMemo(
    () => landmarks.filter((l) => favoriteIds.has(l.id)),
    [landmarks, favoriteIds]
  );

  // The homepage only ever showcases the curated "featured" subset — with
  // 90+ landmarks now in Firestore (most bulk-imported and still missing
  // photos/coordinates), showing everything here would flood the homepage
  // with unverified placeholder cards. A live search still searches
  // everything, since that's what a search box implies.
  const featuredLandmarks = useMemo(() => landmarks.filter((l) => l.featured), [landmarks]);
  const destinationsToShow = query.trim() ? filtered : featuredLandmarks.slice(0, FEATURED_ON_HOME);

  const spotlightLandmark =
    featuredLandmarks[spotlight % Math.max(featuredLandmarks.length, 1)];

  // Moves the spotlight on by itself. Restarting on every change means a
  // manual next/previous click also gets its full time on screen.
  useEffect(() => {
    if (featuredLandmarks.length < 2) return;
    const timer = setTimeout(
      () => setSpotlight((s) => (s + 1) % featuredLandmarks.length),
      SPOTLIGHT_MS
    );
    return () => clearTimeout(timer);
  }, [spotlight, featuredLandmarks.length]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<FilterCategory, number>> = {};
    for (const l of landmarks) counts[l.category] = (counts[l.category] || 0) + 1;
    return counts;
  }, [landmarks]);

  const stats = [
    { label: t("معلم سياحي", "Landmarks"), value: landmarks.length },
    { label: t("مدينة", "Cities"), value: new Set(landmarks.map((l) => l.city)).size },
    { label: t("منطقة", "Regions"), value: new Set(landmarks.map((l) => l.region)).size },
    { label: t("ألعاب تفاعلية", "Interactive games"), value: GAME_TILES.length },
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden min-h-[640px] flex flex-col md:min-h-[760px]">
        {/* hero-clean.jpg is hero.png with its painted-in headline removed —
            the headline is real text below, so it can be correct, animated
            and readable at every screen size. */}
        <Image
          src="/hero-clean.jpg"
          alt={t("الدرعية عند الغروب وأفق الرياض", "Diriyah at sunset with the Riyadh skyline")}
          fill
          priority
          sizes="100vw"
          className="hero-zoom object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(5,16,12,0.6) 0%, rgba(5,16,12,0.42) 38%, rgba(5,16,12,0.86) 80%, rgba(5,16,12,0.98) 100%)",
          }}
        />

        <Navbar transparent />

        <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-10 pt-28 text-center">
          <span
            className="fade-up mb-5 flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold backdrop-blur"
            style={{ borderColor: "rgba(228,200,146,0.45)", background: "rgba(5,16,12,0.45)", color: "var(--brand-gold-light)" }}
          >
            <Sparkles size={13} />
            {t("دليلك الذكي لمعالم المملكة", "Your smart guide to the Kingdom's landmarks")}
          </span>
          <h1
            className="fade-up text-4xl font-black leading-tight text-white drop-shadow-lg sm:text-5xl md:text-7xl"
            style={{ animationDelay: "120ms" }}
          >
            {t("اكتشف السعودية", "Discover Saudi Arabia")}{" "}
            <span style={{ color: "var(--brand-gold-light)" }}>{t("بذكاء", "Smartly")}</span>
          </h1>
          <p
            className="fade-up mt-4 text-base font-medium text-white/85 drop-shadow md:text-xl"
            style={{ animationDelay: "240ms" }}
          >
            {t("وجهات مميزة، تجارب فريدة، وقصص ملهمة", "Remarkable destinations, unique experiences and inspiring stories")}
          </p>

          <div className="fade-up relative mt-8 w-full max-w-2xl" style={{ animationDelay: "360ms" }}>
            <div className="flex flex-col gap-3 rounded-2xl bg-white/95 p-2.5 shadow-xl backdrop-blur sm:flex-row">
              <Link
                href={query ? `/explore?q=${encodeURIComponent(query)}` : "/explore"}
                className="rounded-xl px-6 py-2.5 text-center text-sm font-bold shrink-0 order-2 sm:order-1"
                style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
              >
                {t("بحث", "Search")}
              </Link>
              <div className="flex flex-1 items-center gap-2 px-3 order-1 sm:order-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("ابحث عن معلم، مدينة، أو تجربة سياحية...", "Search for a landmark, city or experience...")}
                  className="w-full bg-transparent py-2 text-center text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
                />
                <Search size={18} className="text-zinc-400 shrink-0" />
              </div>
            </div>

            {/* live results dropdown */}
            {query.trim() && (
              <div
                className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl bg-white p-2 text-start shadow-xl"
                role="listbox"
              >
                {filtered.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-zinc-500">{t("لا توجد نتائج مطابقة لبحثك.", "No results match your search.")}</p>
                ) : (
                  filtered.slice(0, 6).map((l) => (
                    <Link
                      key={l.id}
                      href={`/landmarks/${l.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-black/[.04]"
                    >
                      <span className="font-semibold text-zinc-800">{l.name}</span>
                      <span className="text-xs text-zinc-400">{l.city}</span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          <div
            className="fade-up mt-4 flex flex-wrap items-center justify-center gap-2 text-xs"
            style={{ animationDelay: "480ms" }}
          >
            <span className="font-semibold text-white/60">{t("الأكثر بحثًا:", "Popular:")}</span>
            {QUICK_SEARCHES.map((pair) => t(...pair)).map((term) => (
              <Link
                key={term}
                href={`/explore?q=${encodeURIComponent(term)}`}
                className="rounded-full border border-white/25 bg-white/10 px-3 py-1 font-semibold text-white backdrop-blur transition hover:border-[var(--brand-gold)] hover:bg-white/20"
              >
                {term}
              </Link>
            ))}
          </div>

          <div
            className="fade-up mt-7 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "600ms" }}
          >
            <Link
              href="/explore"
              className="flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold shadow-lg transition hover:scale-105"
              style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
            >
              <Compass size={16} />
              {t("ابدأ الاستكشاف", "Start exploring")}
            </Link>
            <Link
              href="/games"
              className="flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 py-3 text-sm font-bold text-white backdrop-blur transition hover:scale-105 hover:bg-white/20"
            >
              <Gamepad2 size={16} />
              {t("العب واكتشف", "Play & discover")}
            </Link>
          </div>

          {/* Kept invisible (but in place, so nothing jumps) until the
              landmarks arrive — counting up from "0 landmarks" would read
              as a real number for the seconds the data takes to load. */}
          <dl
            className="mt-9 grid grid-cols-2 gap-x-10 gap-y-4 transition-opacity duration-700 sm:grid-cols-4"
            style={{ opacity: landmarks.length ? 1 : 0 }}
            aria-hidden={!landmarks.length}
          >
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse">
                <dt className="mt-0.5 text-xs font-semibold text-white/70">{stat.label}</dt>
                <dd className="text-3xl font-black md:text-4xl" style={{ color: "var(--brand-gold-light)" }}>
                  <CountUp value={stat.value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* spotlight strip */}
        {spotlightLandmark && (
          <div className="relative mx-auto w-full max-w-7xl px-6 pb-8 md:px-10">
            <div className="h-px w-full overflow-hidden bg-white/15">
              <div
                key={spotlightLandmark.id}
                className="spotlight-progress h-full w-full"
                style={{ background: "var(--brand-gold)", animationDuration: `${SPOTLIGHT_MS}ms` }}
              />
            </div>
            <div className="flex items-end justify-between gap-4 pt-5">
              <Link
                key={spotlightLandmark.id}
                href={`/landmarks/${spotlightLandmark.id}`}
                className="step-fade-in group flex min-w-0 items-center gap-4"
              >
                {spotlightLandmark.image && (
                  <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-white/20">
                    <Image
                      src={spotlightLandmark.image}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover transition group-hover:scale-110"
                    />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--brand-gold-light)" }}>
                    <MapPin size={12} />
                    {spotlightLandmark.name} · {spotlightLandmark.city}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-base font-bold text-white md:text-lg">
                    {spotlightLandmark.summary}
                  </span>
                </span>
              </Link>
              <div className="flex shrink-0 items-center gap-3">
                <span className="hidden text-xs font-semibold text-white/60 sm:inline">
                  {String((spotlight % featuredLandmarks.length) + 1).padStart(2, "0")}/
                  {String(featuredLandmarks.length).padStart(2, "0")}
                </span>
                <button
                  aria-label={t("السابق", "Previous")}
                  onClick={() =>
                    setSpotlight((s) => (s - 1 + featuredLandmarks.length) % Math.max(featuredLandmarks.length, 1))
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white hover:bg-white/10"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  aria-label={t("التالي", "Next")}
                  onClick={() => setSpotlight((s) => (s + 1) % Math.max(featuredLandmarks.length, 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white hover:bg-white/10"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <main className="flex-1" style={{ background: "var(--background)" }}>
        {/* استكشف حسب النوع */}
        <Reveal className="mx-auto max-w-7xl px-6 pt-12 md:px-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-extrabold md:text-3xl">{t("استكشف حسب النوع", "Explore by type")}</h2>
            <Link href="/explore" className="flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--brand-gold-light)" }}>
              {t("عرض جميع الوجهات", "View all destinations")}
              <ArrowLeft size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {TYPE_TILES.map((category) => {
              const Icon = CATEGORY_ICON[category];
              return (
                <Link
                  key={category}
                  href={`/explore?category=${category}`}
                  className="glow-tile flex flex-col items-center gap-2 rounded-2xl border p-5 text-center"
                  style={{ background: "var(--surface)", borderColor: "var(--brand-line)" }}
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: `${CATEGORY_PIN_COLOR[category]}22` }}
                  >
                    <Icon size={22} color={CATEGORY_PIN_COLOR[category]} />
                  </span>
                  <span className="text-sm font-bold">{filterLabel(category, lang)}</span>
                  {/* Keeps its line while loading, so the tiles don't jump. */}
                  <span className="min-h-4 text-xs" style={{ color: "var(--text-muted)" }}>
                    {categoryCounts[category] ? t(`${categoryCounts[category]} معلم`, `${categoryCounts[category]} landmarks`) : ""}
                  </span>
                </Link>
              );
            })}
          </div>
        </Reveal>

        {/* DESTINATIONS */}
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-extrabold md:text-3xl">{t("أشهر الوجهات في السعودية", "Top destinations in Saudi Arabia")}</h2>
            <Link href="/explore" className="flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--brand-gold-light)" }}>
              {t("عرض جميع الوجهات", "View all destinations")}
              <ArrowLeft size={14} />
            </Link>
          </div>

          {loading && (
            <div className="grid animate-pulse grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-label={t("جارٍ تحميل الوجهات", "Loading destinations")}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-2xl" style={{ background: "var(--surface)" }} />
              ))}
            </div>
          )}
          {error && <p className="text-sm text-red-400">{t("تعذّر تحميل الوجهات. تحقق من اتصالك ثم أعد تحميل الصفحة.", "Couldn't load destinations. Check your connection and reload the page.")}</p>}
          {!loading && !error && destinationsToShow.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("لا توجد نتائج مطابقة.", "No matching results.")}</p>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {destinationsToShow.map((landmark, index) => (
              <Reveal key={landmark.id} delayMs={(index % 4) * 90} className="flex flex-col [&>a]:flex-1">
                <DestinationCard
                  landmark={landmark}
                  temp={temps[landmark.city]}
                  favorited={favoriteIds.has(landmark.id)}
                  signedIn={signedIn}
                  onToggleFavorite={toggleFavorite}
                />
              </Reveal>
            ))}
          </div>

          {!loading && !error && landmarks.length > destinationsToShow.length && (
            <div className="mt-10 flex justify-center">
              <Link
                href="/explore"
                className="flex items-center gap-2 rounded-full border px-7 py-3 text-sm font-bold transition hover:scale-105 hover:border-[var(--brand-gold)]"
                style={{ borderColor: "var(--brand-line)", background: "var(--surface)" }}
              >
                {t(`استكشف كل الوجهات (${landmarks.length})`, `Explore all ${landmarks.length} destinations`)}
                <ArrowLeft size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* العب واكتشف */}
        <Reveal className="mx-auto max-w-7xl px-6 py-12 md:px-10">
          <div
            className="grid gap-8 rounded-2xl border p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-center md:p-10"
            style={{ borderColor: "var(--brand-line)", background: "linear-gradient(135deg, var(--surface) 0%, #0B3A2E 100%)" }}
          >
            <div>
              <span
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: "var(--brand-green)" }}
              >
                <Gamepad2 size={22} color="var(--brand-gold-light)" />
              </span>
              <h2 className="text-2xl font-extrabold md:text-3xl">{t("العب واكتشف", "Play & Discover")}</h2>
              <p className="mt-2 max-w-md text-sm" style={{ color: "var(--text-muted)" }}>
                {t(
                  "اختبر معلوماتك عن معالم المملكة بأربع ألعاب تفاعلية، واجمع النقاط لترتفع في المستويات.",
                  "Test what you know about the Kingdom's landmarks in four interactive games, and collect points to level up."
                )}
              </p>
              <Link
                href="/games"
                className="mt-6 inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold transition hover:scale-105"
                style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
              >
                {t("ابدأ اللعب", "Start playing")}
                <ArrowLeft size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {GAME_TILES.map((game) => (
                <Link
                  key={game.title[0]}
                  href="/games"
                  className="glow-tile flex flex-col gap-2 rounded-2xl border p-4"
                  style={{ borderColor: "var(--brand-line)", background: "var(--surface-2)" }}
                >
                  <game.icon size={22} color="var(--brand-gold-light)" />
                  <span className="text-sm font-extrabold">{t(...game.title)}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t(...game.subtitle)}</span>
                </Link>
              ))}
            </div>
          </div>
        </Reveal>

        {/* استكشف السعودية على الخريطة */}
        <Reveal className="mx-auto max-w-7xl px-6 py-12 md:px-10">
          {/* The map gets the wider column and no filter list here — with
              both side panels in half the page width it was left a sliver. */}
          <div className="grid gap-8 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] md:items-center">
            <div className="order-2 min-w-0 md:order-1">
              <MapExplorer landmarks={landmarks} height={340} showFilters={false} />
            </div>
            <div className="order-1 text-center md:order-2 md:text-start">
              <h2 className="text-2xl font-extrabold md:text-3xl">{t("استكشف السعودية على الخريطة", "Explore Saudi Arabia on the map")}</h2>
              <p className="mt-2 mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
                {t("اكتشف مواقع المعالم السياحية في مختلف مناطق المملكة.", "Find tourist landmarks across the regions of the Kingdom.")}
              </p>
              <Link
                href="/map"
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition hover:scale-105"
                style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
              >
                {t("استكشف الخريطة", "Open the map")}
              </Link>
            </div>
          </div>
        </Reveal>

        {/* AI teaser */}
        <Reveal className="mx-auto max-w-7xl px-6 py-12 md:px-10">
          <div className="relative overflow-hidden rounded-2xl">
            <Image src="/landmarks/madain-saleh.png" alt="" fill sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover" />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(120deg, rgba(5,16,12,0.95) 30%, rgba(5,16,12,0.55) 100%)" }}
            />
            <div className="relative grid gap-8 p-8 md:grid-cols-2 md:p-12">
              <div>
                <span
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: "rgba(241,237,225,0.15)" }}
                >
                  <Sparkles size={22} color="var(--brand-gold-light)" />
                </span>
                <h2 className="text-2xl font-extrabold text-white md:text-3xl">{t("لست متأكدًا إلى أين تذهب؟", "Not sure where to go?")}</h2>
                <p className="mt-2 max-w-md text-white/75">
                  {t("دع المساعد الذكي يساعدك في اكتشاف وجهتك القادمة.", "Let the AI assistant help you find your next destination.")}
                </p>
                <Link
                  href="/assistant"
                  className="mt-6 inline-flex rounded-full px-7 py-3 text-sm font-bold transition hover:scale-105"
                  style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
                >
                  {t("اسأل المساعد الذكي", "Ask the AI assistant")}
                </Link>
              </div>
              <div className="flex flex-col justify-center gap-2">
                <span className="mb-1 text-xs font-semibold text-white/60">{t("بعض الأسئلة المقترحة:", "Some suggested questions:")}</span>
                {AI_SUGGESTIONS.map((pair) => t(...pair)).map((prompt) => (
                  <Link
                    key={prompt}
                    href={`/assistant?q=${encodeURIComponent(prompt)}`}
                    className="flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm text-white/90 transition hover:-translate-x-1 hover:brightness-150"
                    style={{ background: "rgba(241,237,225,0.08)", border: "1px solid rgba(241,237,225,0.15)" }}
                  >
                    {prompt}
                    <ArrowLeft size={14} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* وجهاتي المحفوظة — للمستخدمين المسجّلين فقط */}
        {signedIn && favoriteLandmarks.length > 0 && (
          <div className="mx-auto max-w-7xl px-6 pb-12 md:px-10">
            <h2 className="mb-6 text-2xl font-extrabold md:text-3xl">{t("وجهاتي المحفوظة", "My saved destinations")}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {favoriteLandmarks.map((landmark) => (
                <DestinationCard
                  key={landmark.id}
                  landmark={landmark}
                  temp={temps[landmark.city]}
                  favorited
                  signedIn={signedIn}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
