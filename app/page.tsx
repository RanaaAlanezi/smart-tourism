"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getLandmarks } from "@/lib/landmarks";
import { Landmark } from "@/lib/types";

const CATEGORY_LABEL: Record<Landmark["category"], string> = {
  heritage: "موقع تراثي",
  nature: "معلم طبيعي",
  "historic-district": "حي تاريخي",
};

export default function Home() {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLandmarks()
      .then(setLandmarks)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return landmarks;
    return landmarks.filter(
      (l) => l.name?.includes(q) || l.city?.includes(q) || l.summary?.includes(q)
    );
  }, [landmarks, query]);

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-2">اكتشف المعالم السياحية السعودية</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-6">
        ابحثي بالاسم أو المدينة، ثم افتحي أي معلم لتحصلي على شرح مخصص لعمرك.
      </p>

      <input
        type="text"
        placeholder="ابحث عن معلم أو مدينة..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border border-black/10 dark:border-white/20 rounded-lg px-4 py-2 mb-6 bg-transparent"
      />

      {loading && <p>جارٍ التحميل من Firestore...</p>}
      {error && <p className="text-red-600">خطأ: {error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-zinc-500">لا توجد نتائج مطابقة.</p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {filtered.map((landmark) => (
          <li key={landmark.id}>
            <Link
              href={`/landmarks/${landmark.id}`}
              className="block border border-black/10 dark:border-white/10 rounded-lg p-4 hover:bg-black/[.03] dark:hover:bg-white/[.05] transition"
            >
              <div className="text-xs text-zinc-500 mb-1">
                {CATEGORY_LABEL[landmark.category]} · {landmark.city}
              </div>
              <div className="font-medium mb-1">{landmark.name}</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                {landmark.summary}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
