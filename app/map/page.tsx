"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/lib/components/Navbar";
import { SaudiMap } from "@/lib/components/SaudiMap";
import { getLandmarks } from "@/lib/landmarks";
import { Landmark } from "@/lib/types";
import { FilterCategory, FILTER_LABELS, CATEGORY_GROUP } from "@/lib/categories";

function MapPageInner() {
  const searchParams = useSearchParams();
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<FilterCategory | "all">("all");

  useEffect(() => {
    getLandmarks()
      .then(setLandmarks)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (category === "all" ? landmarks : landmarks.filter((l) => CATEGORY_GROUP[l.category] === category)),
    [landmarks, category]
  );

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full" style={{ background: "var(--background)" }}>
        <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
          <h1 className="text-2xl font-extrabold md:text-3xl">استكشف السعودية على الخريطة</h1>
          <p className="mt-1 mb-6 text-sm text-zinc-500">
            اكتشف مواقع المعالم السياحية في مختلف مناطق المملكة.
          </p>

          <div className="mb-5 flex flex-wrap gap-2">
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

          {loading ? (
            <p className="text-sm text-zinc-500">جارٍ التحميل من Firestore...</p>
          ) : (
            <SaudiMap landmarks={filtered} height={620} initialSelectedId={searchParams.get("id") || undefined} />
          )}
        </div>
      </main>
    </>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <MapPageInner />
    </Suspense>
  );
}
