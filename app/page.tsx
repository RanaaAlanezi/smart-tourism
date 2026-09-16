"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Search, Sparkles, ArrowLeft, MapPin } from "lucide-react";
import { Navbar } from "@/lib/components/Navbar";
import { DestinationCard } from "@/lib/components/DestinationCard";
import { MapExplorer } from "@/lib/components/MapExplorer";
import { getLandmarks } from "@/lib/landmarks";
import { Landmark } from "@/lib/types";
import { getCityTemperature } from "@/lib/weather";
import { FilterCategory, FILTER_LABELS, CATEGORY_ICON } from "@/lib/categories";
import { useFavorites } from "@/lib/favorites";

const TYPE_TILES: FilterCategory[] = ["historical", "natural", "beach", "urban", "cultural"];

const AI_SUGGESTIONS = [
  "أبغى أماكن تاريخية في العلا",
  "وجهة مناسبة للعائلة",
  "أماكن طبيعية وأجواء باردة",
];

export default function Home() {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
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
      (l) => l.name?.includes(q) || l.city?.includes(q) || l.summary?.includes(q)
    );
  }, [landmarks, query]);

  const favoriteLandmarks = useMemo(
    () => landmarks.filter((l) => favoriteIds.has(l.id)),
    [landmarks, favoriteIds]
  );

  const spotlightLandmark = landmarks[spotlight % Math.max(landmarks.length, 1)];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden min-h-[600px] flex flex-col md:min-h-[700px]">
        <Image
          src="/hero.png"
          alt="الدرعية عند الغروب وأفق الرياض"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(5,16,12,0.25) 0%, rgba(5,16,12,0.2) 40%, rgba(5,16,12,0.88) 84%, rgba(5,16,12,0.97) 100%)",
          }}
        />

        <Navbar transparent />

        <div className="relative flex flex-1 flex-col items-center justify-center px-6 pt-16 text-center">
          <div className="relative w-full max-w-2xl">
            <div className="flex flex-col gap-3 rounded-2xl bg-white/95 p-2.5 shadow-xl backdrop-blur sm:flex-row">
              <Link
                href={query ? `/explore?q=${encodeURIComponent(query)}` : "/explore"}
                className="rounded-xl px-6 py-2.5 text-center text-sm font-bold shrink-0 order-2 sm:order-1"
                style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
              >
                بحث
              </Link>
              <div className="flex flex-1 items-center gap-2 px-3 order-1 sm:order-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث عن معلم، مدينة، أو تجربة سياحية..."
                  className="w-full bg-transparent py-2 text-center text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
                />
                <Search size={18} className="text-zinc-400 shrink-0" />
              </div>
            </div>

            {/* live results dropdown */}
            {query.trim() && (
              <div
                className="absolute inset-x-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl bg-white p-2 text-right shadow-xl"
                role="listbox"
              >
                {filtered.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-zinc-500">لا توجد نتائج مطابقة لبحثك.</p>
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
        </div>

        {/* spotlight strip */}
        {spotlightLandmark && (
          <div className="relative mx-auto w-full max-w-7xl px-6 pb-8 md:px-10">
            <div className="flex items-end justify-between gap-4 border-t border-white/15 pt-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--brand-gold-light)" }}>
                  <MapPin size={12} />
                  {spotlightLandmark.name} · {spotlightLandmark.city}
                </div>
                <div className="mt-1 text-lg font-bold text-white">{spotlightLandmark.summary}</div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="hidden text-xs font-semibold text-white/60 sm:inline">
                  {String((spotlight % landmarks.length) + 1).padStart(2, "0")}/
                  {String(landmarks.length).padStart(2, "0")}
                </span>
                <button
                  aria-label="السابق"
                  onClick={() =>
                    setSpotlight((s) => (s - 1 + landmarks.length) % Math.max(landmarks.length, 1))
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white hover:bg-white/10"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  aria-label="التالي"
                  onClick={() => setSpotlight((s) => (s + 1) % Math.max(landmarks.length, 1))}
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
        <div className="mx-auto max-w-7xl px-6 pt-12 md:px-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-extrabold md:text-3xl">استكشف حسب النوع</h2>
            <Link href="/explore" className="flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--brand-gold-light)" }}>
              عرض جميع الوجهات
              <ArrowLeft size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {TYPE_TILES.map((category) => {
              const Icon = CATEGORY_ICON[category];
              return (
                <Link
                  key={category}
                  href={`/explore?category=${category}`}
                  className="flex flex-col items-center gap-3 rounded-2xl p-5 text-center transition hover:-translate-y-1"
                  style={{ background: "var(--surface)" }}
                >
                  <Icon size={22} color="var(--brand-gold-light)" />
                  <span className="text-sm font-semibold">{FILTER_LABELS[category]}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* DESTINATIONS */}
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-extrabold md:text-3xl">أشهر الوجهات في السعودية</h2>
            <Link href="/explore" className="flex items-center gap-1 text-sm font-semibold" style={{ color: "var(--brand-gold-light)" }}>
              عرض جميع الوجهات
              <ArrowLeft size={14} />
            </Link>
          </div>

          {loading && <p className="text-sm" style={{ color: "var(--text-muted)" }}>جارٍ التحميل من Firestore...</p>}
          {error && <p className="text-sm text-red-400">خطأ: {error}</p>}
          {!loading && !error && filtered.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>لا توجد نتائج مطابقة.</p>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((landmark) => (
              <DestinationCard
                key={landmark.id}
                landmark={landmark}
                temp={temps[landmark.city]}
                favorited={favoriteIds.has(landmark.id)}
                signedIn={signedIn}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </div>

        {/* استكشف السعودية على الخريطة */}
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div className="order-2 min-w-0 md:order-1">
              <MapExplorer landmarks={landmarks} height={340} />
            </div>
            <div className="order-1 text-center md:order-2 md:text-right">
              <h2 className="text-2xl font-extrabold md:text-3xl">استكشف السعودية على الخريطة</h2>
              <p className="mt-2 mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
                اكتشف مواقع المعالم السياحية في مختلف مناطق المملكة.
              </p>
              <Link
                href="/map"
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold"
                style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
              >
                استكشف الخريطة
              </Link>
            </div>
          </div>
        </div>

        {/* AI teaser */}
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
          <div className="relative overflow-hidden rounded-2xl">
            <Image src="/landmarks/madain-saleh.png" alt="" fill className="object-cover" />
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
                <h2 className="text-2xl font-extrabold text-white md:text-3xl">لست متأكدًا إلى أين تذهب؟</h2>
                <p className="mt-2 max-w-md text-white/75">
                  دع المساعد الذكي يساعدك في اكتشاف وجهتك القادمة.
                </p>
                <Link
                  href="/assistant"
                  className="mt-6 inline-flex rounded-full px-7 py-3 text-sm font-bold"
                  style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
                >
                  اسأل المساعد الذكي
                </Link>
              </div>
              <div className="flex flex-col justify-center gap-2">
                <span className="mb-1 text-xs font-semibold text-white/60">بعض الأسئلة المقترحة:</span>
                {AI_SUGGESTIONS.map((prompt) => (
                  <Link
                    key={prompt}
                    href={`/assistant?q=${encodeURIComponent(prompt)}`}
                    className="flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm text-white/90"
                    style={{ background: "rgba(241,237,225,0.08)", border: "1px solid rgba(241,237,225,0.15)" }}
                  >
                    {prompt}
                    <ArrowLeft size={14} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* وجهاتي المحفوظة — للمستخدمين المسجّلين فقط */}
        {signedIn && favoriteLandmarks.length > 0 && (
          <div className="mx-auto max-w-7xl px-6 pb-12 md:px-10">
            <h2 className="mb-6 text-2xl font-extrabold md:text-3xl">وجهاتي المحفوظة</h2>
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
