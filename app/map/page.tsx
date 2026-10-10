"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/lib/components/Navbar";
import { MapExplorer } from "@/lib/components/MapExplorer";
import { getLandmarks } from "@/lib/landmarks";
import { Landmark } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import { localizeLandmarks } from "@/lib/landmark-i18n";

function MapPageInner() {
  const searchParams = useSearchParams();
  const { lang, t } = useLang();
  // Stored as fetched (Arabic); shown in the visitor's language.
  const [fetched, setLandmarks] = useState<Landmark[]>([]);
  const landmarks = useMemo(() => localizeLandmarks(fetched, lang), [fetched, lang]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLandmarks()
      .then(setLandmarks)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full" style={{ background: "var(--background)" }}>
        <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
          <h1 className="text-2xl font-extrabold md:text-3xl">{t("استكشف السعودية على الخريطة", "Explore Saudi Arabia on the Map")}</h1>
          <p className="mt-1 mb-6 text-sm" style={{ color: "var(--text-muted)" }}>
            {t("اكتشف مواقع المعالم السياحية في مختلف مناطق المملكة.", "Find tourist landmarks across the regions of the Kingdom.")}
          </p>

          {loading ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("جارٍ تحميل الوجهات...", "Loading destinations...")}</p>
          ) : (
            <MapExplorer landmarks={landmarks} height={560} initialSelectedId={searchParams.get("id") || undefined} />
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
