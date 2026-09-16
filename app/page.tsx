"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Mountain,
  Search,
  Landmark as LandmarkIcon,
  Building2,
  Palette,
  Sparkles,
  Waves,
  Map as MapIcon,
  Thermometer,
} from "lucide-react";
import { Navbar } from "@/lib/components/Navbar";
import { DestinationCard } from "@/lib/components/DestinationCard";
import { SaudiMap } from "@/lib/components/SaudiMap";
import { getLandmarks } from "@/lib/landmarks";
import { Landmark } from "@/lib/types";
import { getCityTemperature } from "@/lib/weather";
import { FilterCategory, FILTER_LABELS } from "@/lib/categories";
import { useFavorites } from "@/lib/favorites";

const TYPE_TILES: { label: string; icon: typeof Mountain; category: FilterCategory }[] = [
  { label: FILTER_LABELS.historical, icon: LandmarkIcon, category: "historical" },
  { label: FILTER_LABELS.natural, icon: Mountain, category: "natural" },
  { label: FILTER_LABELS.beach, icon: Waves, category: "beach" },
  { label: FILTER_LABELS.urban, icon: Building2, category: "urban" },
  { label: FILTER_LABELS.cultural, icon: Palette, category: "cultural" },
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
      <section className="relative overflow-hidden min-h-[560px] flex flex-col md:min-h-[680px]">
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
              "linear-gradient(180deg, rgba(7,62,49,0.15) 0%, rgba(7,62,49,0.15) 45%, rgba(7,62,49,0.85) 82%, rgba(7,62,49,0.96) 100%)",
          }}
        />

        <Navbar transparent />

        <div className="relative mt-auto w-full">
          <div className="mx-auto max-w-7xl px-6 pb-10 pt-16 md:px-10">
            <div className="max-w-2xl">
              {/* search */}
              <div className="mt-8 flex flex-col gap-3 rounded-2xl bg-white/95 p-2.5 shadow-xl backdrop-blur sm:flex-row">
                <div className="flex flex-1 items-center gap-2 px-3">
                  <Search size={18} className="text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ابحث عن وجهات، مدن، أو تجارب..."
                    className="w-full bg-transparent py-2 text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
                  />
                </div>
                <Link
                  href={query ? `/explore?q=${encodeURIComponent(query)}` : "/explore"}
                  className="rounded-xl px-6 py-2.5 text-center text-sm font-bold text-white shrink-0"
                  style={{ background: "var(--brand-green)" }}
                >
                  بحث
                </Link>
              </div>
            </div>

            {/* spotlight strip */}
            {spotlightLandmark && (
              <div className="mt-14 flex items-end justify-between gap-4 border-t border-white/15 pt-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">{spotlightLandmark.name}</span>
                    {temps[spotlightLandmark.city] !== undefined && (
                      <span
                        className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ background: "rgba(245,242,234,0.15)", color: "var(--brand-gold-light)" }}
                      >
                        <Thermometer size={12} />
                        {Math.round(temps[spotlightLandmark.city])}°
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-white/70">{spotlightLandmark.summary}</div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div
                    className="hidden sm:flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: "var(--brand-gold-light)" }}
                  >
                    {landmarks.map((_, i) => (
                      <span key={i} className={i === spotlight % landmarks.length ? "" : "opacity-40"}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    ))}
                  </div>
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
            )}
          </div>
        </div>
      </section>

      <main className="flex-1" style={{ background: "var(--background)" }}>
        {/* استكشف حسب النوع */}
        <div className="mx-auto max-w-7xl px-6 pt-14 md:px-10">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--brand-gold)" }}>
            تصفح حسب النوع
          </span>
          <h2 className="mt-1 mb-6 text-2xl font-extrabold md:text-3xl">استكشف حسب النوع</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {TYPE_TILES.map(({ label, icon: Icon, category }) => (
              <Link
                key={category}
                href={`/explore?category=${category}`}
                className="flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition hover:-translate-y-1 hover:shadow-md"
                style={{ borderColor: "var(--brand-line)" }}
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: "var(--accent-tint, #E4EEEC)" }}
                >
                  <Icon size={20} color="var(--brand-green)" />
                </span>
                <span className="text-sm font-semibold">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* DESTINATIONS */}
        <div className="mx-auto max-w-7xl px-6 py-14 md:px-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--brand-gold)" }}>
                وجهات مميزة
              </span>
              <h2 className="mt-1 text-2xl font-extrabold md:text-3xl">اكتشف أجمل الوجهات في السعودية</h2>
            </div>
            {query && (
              <button
                onClick={() => setQuery("")}
                className="rounded-full border px-5 py-2 text-sm font-semibold"
                style={{ borderColor: "var(--brand-line)", color: "var(--brand-green)" }}
              >
                عرض جميع الوجهات ←
              </button>
            )}
          </div>

          {loading && <p className="text-sm text-zinc-500">جارٍ التحميل من Firestore...</p>}
          {error && <p className="text-sm text-red-600">خطأ: {error}</p>}
          {!loading && !error && filtered.length === 0 && (
            <p className="text-sm text-zinc-500">لا توجد نتائج مطابقة.</p>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((landmark) => (
              <DestinationCard
                key={landmark.id}
                landmark={landmark}
                temp={temps[landmark.city]}
                favorited={favoriteIds.has(landmark.id)}
                onToggleFavorite={signedIn ? toggleFavorite : undefined}
              />
            ))}
          </div>
        </div>

        {/* وجهاتي المحفوظة */}
        {favoriteLandmarks.length > 0 && (
          <div className="mx-auto max-w-7xl px-6 pb-14 md:px-10">
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--brand-gold)" }}>
              خاص بك
            </span>
            <h2 className="mt-1 mb-6 text-2xl font-extrabold md:text-3xl">وجهاتي المحفوظة</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {favoriteLandmarks.map((landmark) => (
                <DestinationCard
                  key={landmark.id}
                  landmark={landmark}
                  temp={temps[landmark.city]}
                  favorited
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </div>
        )}

        {/* استكشف السعودية على الخريطة */}
        <div className="mx-auto max-w-7xl px-6 pb-14 md:px-10">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--brand-gold)" }}>
            نظرة من الأعلى
          </span>
          <h2 className="mt-1 mb-6 text-2xl font-extrabold md:text-3xl">استكشف السعودية على الخريطة</h2>
          <SaudiMap landmarks={landmarks} height={380} />
          <Link
            href="/map"
            className="mt-5 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-white"
            style={{ background: "var(--brand-green)" }}
          >
            <MapIcon size={16} />
            استكشف الخريطة
          </Link>
        </div>

        {/* AI teaser */}
        <div className="mx-auto max-w-7xl px-6 pb-16 md:px-10">
          <div
            className="flex flex-col items-center gap-4 rounded-2xl px-6 py-12 text-center"
            style={{ background: "linear-gradient(135deg,#0A3F3E,#0B5D48)" }}
          >
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "rgba(245,242,234,0.15)" }}
            >
              <Sparkles size={22} color="var(--brand-gold-light)" />
            </span>
            <h2 className="text-2xl font-extrabold text-white md:text-3xl">لست متأكدًا إلى أين تذهب؟</h2>
            <p className="max-w-md text-white/75">
              دع المساعد الذكي يساعدك في اكتشاف وجهتك القادمة.
            </p>
            <Link
              href="/assistant"
              className="mt-2 rounded-full px-7 py-3 text-sm font-bold"
              style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
            >
              اسأل المساعد الذكي
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
