"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/lib/components/Navbar";
import { SaudiMap } from "@/lib/components/SaudiMap";
import { getLandmarks } from "@/lib/landmarks";
import { Landmark } from "@/lib/types";

function MapPageInner() {
  const searchParams = useSearchParams();
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
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
          <h1 className="text-2xl font-extrabold md:text-3xl">خريطة معالم السعودية</h1>
          <p className="mt-1 mb-6 text-sm text-zinc-500">
            اضغطي على أي علامة لمعرفة المزيد عن المعلم والانتقال لصفحته.
          </p>

          {loading ? (
            <p className="text-sm text-zinc-500">جارٍ التحميل من Firestore...</p>
          ) : (
            <SaudiMap landmarks={landmarks} height={620} initialSelectedId={searchParams.get("id") || undefined} />
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
