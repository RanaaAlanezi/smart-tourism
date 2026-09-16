"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Navbar } from "@/lib/components/Navbar";
import { DestinationCard } from "@/lib/components/DestinationCard";
import { getLandmarks } from "@/lib/landmarks";
import { Landmark } from "@/lib/types";
import { getCityTemperature } from "@/lib/weather";
import { FilterCategory, FILTER_LABELS, CATEGORY_GROUP } from "@/lib/categories";
import { useFavorites } from "@/lib/favorites";

function ExplorePageInner() {
  const searchParams = useSearchParams();

  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [temps, setTemps] = useState<Record<string, number>>({});
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState<FilterCategory | "all">(
    (searchParams.get("category") as FilterCategory) || "all"
  );
  const [city, setCity] = useState<string>("all");
  const { favoriteIds, toggleFavorite, signedIn } = useFavorites();

  useEffect(() => {
    getLandmarks()
      .then(setLandmarks)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const cities = [...new Set(landmarks.map((l) => l.city))];
    cities.forEach((c) => {
      if (c in temps) return;
      getCityTemperature(c).then((t) => {
        if (t !== null) setTemps((prev) => ({ ...prev, [c]: t }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landmarks]);

  const cities = useMemo(() => [...new Set(landmarks.map((l) => l.city))], [landmarks]);

  const filtered = useMemo(() => {
    const q = query.trim();
    return landmarks.filter((l) => {
      const matchesQuery = !q || l.name?.includes(q) || l.city?.includes(q) || l.summary?.includes(q);
      const matchesCategory = category === "all" || CATEGORY_GROUP[l.category] === category;
      const matchesCity = city === "all" || l.city === city;
      return matchesQuery && matchesCategory && matchesCity;
    });
  }, [landmarks, query, category, city]);

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full" style={{ background: "var(--background)" }}>
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
          <h1 className="text-2xl font-extrabold md:text-3xl">استكشف السعودية</h1>
          <p className="mt-1 text-sm text-zinc-500">
            اكتشف المعالم والتجارب السياحية في مختلف مناطق المملكة.
          </p>

          {/* controls */}
          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div
              className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5"
              style={{ borderColor: "var(--brand-line)" }}
            >
              <Search size={18} className="text-zinc-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن معلم، مدينة، أو تجربة سياحية..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
              />
            </div>

            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-xl border px-4 py-2.5 text-sm"
              style={{ borderColor: "var(--brand-line)", background: "var(--background)" }}
            >
              <option value="all">كل المدن</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* category chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setCategory("all")}
              className="rounded-full border px-4 py-1.5 text-sm font-semibold"
              style={
                category === "all"
                  ? { background: "var(--brand-green)", color: "white", borderColor: "var(--brand-green)" }
                  : { borderColor: "var(--brand-line)" }
              }
            >
              الكل
            </button>
            {(Object.keys(FILTER_LABELS) as FilterCategory[]).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="rounded-full border px-4 py-1.5 text-sm font-semibold"
                style={
                  category === c
                    ? { background: "var(--brand-green)", color: "white", borderColor: "var(--brand-green)" }
                    : { borderColor: "var(--brand-line)" }
                }
              >
                {FILTER_LABELS[c]}
              </button>
            ))}
          </div>

          {/* results */}
          <div className="mt-8">
            {loading && <p className="text-sm text-zinc-500">جارٍ التحميل من Firestore...</p>}
            {error && <p className="text-sm text-red-600">خطأ: {error}</p>}
            {!loading && !error && filtered.length === 0 && (
              <p className="text-sm text-zinc-500">لا توجد نتائج مطابقة لبحثك.</p>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((landmark) => (
                <DestinationCard
                  key={landmark.id}
                  landmark={landmark}
                  temp={temps[landmark.city]}
                  variant="full"
                  favorited={favoriteIds.has(landmark.id)}
                  signedIn={signedIn}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExplorePageInner />
    </Suspense>
  );
}
