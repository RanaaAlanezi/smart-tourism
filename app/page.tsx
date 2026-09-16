"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Mountain,
  Search,
  Star,
  Building2,
  Building,
  Trophy,
  Thermometer,
} from "lucide-react";
import { Navbar } from "@/lib/components/Navbar";
import { getLandmarks } from "@/lib/landmarks";
import { Landmark } from "@/lib/types";
import { LANDMARK_IMAGES } from "@/lib/landmark-images";
import { getCityTemperature } from "@/lib/weather";

const CATEGORY_LABEL: Record<Landmark["category"], string> = {
  heritage: "موقع تراثي",
  nature: "معلم طبيعي",
  "historic-district": "حي تاريخي",
  urban: "معلم حضري",
};

const CATEGORY_GRADIENT: Record<Landmark["category"], string> = {
  heritage: "linear-gradient(135deg,#0B5D48,#0E7A5C)",
  nature: "linear-gradient(135deg,#0E4D63,#147A87)",
  "historic-district": "linear-gradient(135deg,#7A4A1E,#B8873B)",
  urban: "linear-gradient(135deg,#1F2937,#C08A34)",
};

const QUICK_CATEGORIES: {
  label: string;
  icon: typeof Star;
  category: Landmark["category"] | "all";
}[] = [
  { label: "أشهر الوجهات", icon: Star, category: "all" },
  { label: "المدن السياحية", icon: Building2, category: "historic-district" },
  { label: "الثقافة والتراث", icon: Trophy, category: "heritage" },
  { label: "الطبيعة والمناظر الخلابة", icon: Mountain, category: "nature" },
  { label: "معالم حضرية حديثة", icon: Building, category: "urban" },
];

export default function Home() {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Landmark["category"] | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spotlight, setSpotlight] = useState(0);
  const [temps, setTemps] = useState<Record<string, number>>({});

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
    return landmarks.filter((l) => {
      const matchesQuery =
        !q || l.name?.includes(q) || l.city?.includes(q) || l.summary?.includes(q);
      const matchesCategory = category === "all" || l.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [landmarks, query, category]);

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
              <button
                className="rounded-xl px-6 py-2.5 text-sm font-bold text-white shrink-0"
                style={{ background: "var(--brand-green)" }}
              >
                بحث
              </button>
            </div>

            {/* quick categories */}
            <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {QUICK_CATEGORIES.map(({ label, icon: Icon, category: cat }) => (
                <button
                  key={label}
                  onClick={() => setCategory(cat)}
                  className="flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-center transition"
                  style={{
                    background:
                      category === cat ? "rgba(245,242,234,0.18)" : "rgba(245,242,234,0.08)",
                  }}
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ background: "var(--brand-gold-light)" }}
                  >
                    <Icon size={16} color="var(--brand-green-dark)" />
                  </span>
                  <span className="text-[0.72rem] font-medium leading-tight text-white/90">
                    {label}
                  </span>
                </button>
              ))}
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

      {/* DESTINATIONS */}
      <main className="flex-1" style={{ background: "var(--background)" }}>
        <div className="mx-auto max-w-7xl px-6 py-14 md:px-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--brand-gold)" }}
              >
                وجهات مميزة
              </span>
              <h2 className="mt-1 text-2xl font-extrabold md:text-3xl">
                اكتشف أجمل الوجهات في السعودية
              </h2>
            </div>
            {(query || category !== "all") && (
              <button
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
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
              <Link
                key={landmark.id}
                href={`/landmarks/${landmark.id}`}
                className="group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:bg-white/5"
                style={{ borderColor: "var(--brand-line)" }}
              >
                <div
                  className="relative flex h-36 items-end overflow-hidden p-4"
                  style={
                    LANDMARK_IMAGES[landmark.id]
                      ? undefined
                      : { background: CATEGORY_GRADIENT[landmark.category] }
                  }
                >
                  {LANDMARK_IMAGES[landmark.id] && (
                    <>
                      <Image
                        src={LANDMARK_IMAGES[landmark.id]}
                        alt={landmark.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        className="object-cover transition group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                    </>
                  )}
                  <span className="relative rounded-full bg-white/90 px-3 py-1 text-[0.7rem] font-semibold text-zinc-800">
                    {CATEGORY_LABEL[landmark.category]}
                  </span>
                  {temps[landmark.city] !== undefined && (
                    <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                      <Thermometer size={12} />
                      {Math.round(temps[landmark.city])}°
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-1 text-xs text-zinc-400">{landmark.city}</div>
                  <div className="mb-1.5 font-bold leading-snug">{landmark.name}</div>
                  <p className="line-clamp-2 text-sm text-zinc-500">{landmark.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
