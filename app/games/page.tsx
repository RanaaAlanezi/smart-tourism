"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/lib/components/Navbar";
import { GamePicker, GameStage, PointsBadge, gameInfo, useGameSession } from "@/lib/components/games/GamesPanel";
import { getLandmarks } from "@/lib/landmarks";
import { Landmark } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import { localizeLandmarks } from "@/lib/landmark-i18n";

export default function GamesPage() {
  const { lang, t } = useLang();
  // Stored as fetched (Arabic); shown in the visitor's language.
  const [fetched, setLandmarks] = useState<Landmark[]>([]);
  const landmarks = useMemo(() => localizeLandmarks(fetched, lang), [fetched, lang]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session, start, restart, close, timelineReady } = useGameSession(landmarks);

  useEffect(() => {
    getLandmarks()
      .then(setLandmarks)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  const active = session && gameInfo(session.id);

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full" style={{ background: "var(--background)" }}>
        <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold md:text-3xl">{t("العب واكتشف السعودية", "Play and Discover Saudi Arabia")}</h1>
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {t("اختبر معلوماتك عن معالم المملكة واجمع النقاط.", "Test what you know about the Kingdom's landmarks and collect points.")}
              </p>
            </div>
            <div className="min-w-44">
              <PointsBadge />
            </div>
          </div>

          {loading && <p className="mt-8 text-sm" style={{ color: "var(--text-muted)" }}>{t("جارٍ تحميل المعالم...", "Loading landmarks...")}</p>}
          {error && <p className="mt-8 text-sm text-red-400">{t("تعذّر تحميل المعالم. تحقق من اتصالك ثم أعد تحميل الصفحة.", "Couldn't load landmarks. Check your connection and reload the page.")}</p>}

          {!loading && !error && !session && (
            <div className="mt-8">
              <GamePicker onStart={start} timelineReady={timelineReady} />
            </div>
          )}

          {session && active && (
            <section
              className="mt-8 rounded-2xl border p-5 md:p-6"
              style={{ borderColor: "var(--brand-line)", background: "var(--surface)" }}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-extrabold">
                  <active.icon size={18} color="var(--brand-gold)" />
                  {t(...active.title)}
                </h2>
                <button
                  onClick={close}
                  className="flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold"
                  style={{ borderColor: "var(--brand-line)" }}
                >
                  <ArrowRight size={14} />
                  {t("كل الألعاب", "All games")}
                </button>
              </div>
              <GameStage session={session} onRestart={restart} />
            </section>
          )}
        </div>
      </main>
    </>
  );
}
