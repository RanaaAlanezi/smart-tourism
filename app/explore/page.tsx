"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Navbar } from "@/lib/components/Navbar";
import { DestinationCard } from "@/lib/components/DestinationCard";
import { getLandmarks } from "@/lib/landmarks";
import { Landmark } from "@/lib/types";
import { getCityTemperature } from "@/lib/weather";
import { FilterCategory, FILTER_LABELS, filterLabel, TAG_LABELS } from "@/lib/categories";
import { useLang } from "@/lib/i18n";
import { localizeLandmarks } from "@/lib/landmark-i18n";
import { useFavorites } from "@/lib/favorites";

function ExplorePageInner() {
  const searchParams = useSearchParams();

  const { lang, t } = useLang();
  // Stored as fetched (Arabic); shown in the visitor's language.
  const [fetched, setLandmarks] = useState<Landmark[]>([]);
  const landmarks = useMemo(() => localizeLandmarks(fetched, lang), [fetched, lang]);
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
      const matchesTag = l.tags?.some(
        (t) => TAG_LABELS[t].ar.includes(q) || TAG_LABELS[t].en.toLowerCase().includes(q.toLowerCase())
      );
      const matchesQuery =
        !q ||
        l.name?.includes(q) ||
        l.nameEn?.toLowerCase().includes(q.toLowerCase()) ||
        l.city?.includes(q) ||
        l.summary?.includes(q) ||
        matchesTag;
      const matchesCategory = category === "all" || l.category === category;
      const matchesCity = city === "all" || l.city === city;
      return matchesQuery && matchesCategory && matchesCity;
    });
  }, [landmarks, query, category, city]);

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full" style={{ background: "var(--background)" }}>
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
          <h1 className="text-2xl font-extrabold md:text-3xl">{t("استكشف السعودية", "Explore Saudi Arabia")}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {t("اكتشف المعالم والتجارب السياحية في مختلف مناطق المملكة.", "Discover landmarks and experiences across the regions of the Kingdom.")}
          </p>

          {/* controls */}
          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div
              className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5"
              style={{ borderColor: "var(--brand-line)" }}
            >
              <Search size={18} className="shrink-0" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("ابحث عن معلم، مدينة، أو تجربة سياحية...", "Search for a landmark, city or experience...")}
                className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500"
              />
            </div>

            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-xl border px-4 py-2.5 text-sm"
              style={{ borderColor: "var(--brand-line)", background: "var(--surface)", color: "var(--foreground)" }}
            >
              <option value="all">{t("كل المدن", "All cities")}</option>
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
                  ? { background: "var(--brand-gold)", color: "var(--brand-green-dark)", borderColor: "var(--brand-gold)" }
                  : { borderColor: "var(--brand-line)" }
              }
            >
              {t("الكل", "All")}
            </button>
            {(Object.keys(FILTER_LABELS) as FilterCategory[]).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="rounded-full border px-4 py-1.5 text-sm font-semibold"
                style={
                  category === c
                    ? { background: "var(--brand-gold)", color: "var(--brand-green-dark)", borderColor: "var(--brand-gold)" }
                    : { borderColor: "var(--brand-line)" }
                }
              >
                {filterLabel(c, lang)}
              </button>
            ))}
          </div>

          {/* results */}
          <div className="mt-8">
            {loading && <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("جارٍ تحميل الوجهات...", "Loading destinations...")}</p>}
            {error && <p className="text-sm text-red-400">{t("تعذّر تحميل الوجهات. تحقق من اتصالك ثم أعد تحميل الصفحة.", "Couldn't load destinations. Check your connection and reload the page.")}</p>}
            {!loading && !error && filtered.length === 0 && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("لا توجد نتائج مطابقة لبحثك.", "No results match your search.")}</p>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
