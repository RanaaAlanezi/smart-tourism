"use client";

import { useEffect, useMemo, useState } from "react";
import { HeartOff } from "lucide-react";
import { Navbar } from "@/lib/components/Navbar";
import { DestinationCard } from "@/lib/components/DestinationCard";
import { getLandmarks } from "@/lib/landmarks";
import { Landmark } from "@/lib/types";
import { getCityTemperature } from "@/lib/weather";
import { useFavorites } from "@/lib/favorites";

export default function SavedPage() {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [temps, setTemps] = useState<Record<string, number>>({});
  const { favoriteIds, toggleFavorite, loading: favoritesLoading } = useFavorites();

  useEffect(() => {
    getLandmarks()
      .then(setLandmarks)
      .finally(() => setLoading(false));
  }, []);

  const saved = useMemo(() => landmarks.filter((l) => favoriteIds.has(l.id)), [landmarks, favoriteIds]);

  useEffect(() => {
    const cities = [...new Set(saved.map((l) => l.city))];
    cities.forEach((city) => {
      if (city in temps) return;
      getCityTemperature(city).then((t) => {
        if (t !== null) setTemps((prev) => ({ ...prev, [city]: t }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const isLoading = loading || favoritesLoading;

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full" style={{ background: "var(--background)" }}>
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
          <h1 className="text-2xl font-extrabold md:text-3xl">وجهاتي المحفوظة</h1>
          <p className="mt-1 mb-8 text-sm text-zinc-500">
            الوجهات التي حفظتِها لتراجعيها لاحقًا.
          </p>

          {isLoading && <p className="text-sm text-zinc-500">جارٍ التحميل...</p>}

          {!isLoading && saved.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border py-20 text-center" style={{ borderColor: "var(--brand-line)" }}>
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "var(--brand-line)" }}
              >
                <HeartOff size={22} className="text-zinc-500" />
              </span>
              <p className="font-semibold">لم تحفظ أي وجهات بعد</p>
              <p className="max-w-sm text-sm text-zinc-500">
                ابدأ باكتشاف وجهات جديدة واحفظ الأماكن التي تهمك.
              </p>
            </div>
          )}

          {!isLoading && saved.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {saved.map((landmark) => (
                <DestinationCard
                  key={landmark.id}
                  landmark={landmark}
                  temp={temps[landmark.city]}
                  favorited
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
