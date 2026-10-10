"use client";

import { useEffect, useRef, useState } from "react";
import { MatchRound, POINTS_PER_ANSWER } from "@/lib/games";
import { useLang } from "@/lib/i18n";
import { GameResult } from "./GameResult";

// How long a wrong pair stays marked red.
const WRONG_FLASH_MS = 700;

export function MatchGame({
  round,
  onScore,
  onRestart,
}: {
  round: MatchRound;
  onScore: (points: number) => void;
  onRestart: () => void;
}) {
  const { t } = useLang();
  const [pickedLandmark, setPickedLandmark] = useState<string | null>(null);
  const [pickedCity, setPickedCity] = useState<string | null>(null);
  // Cities whose landmark has been matched (each city has exactly one).
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<{ landmarkId: string; city: string } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const clearWrong = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (clearWrong.current) clearTimeout(clearWrong.current);
  }, []);

  function attempt(landmarkId: string, city: string) {
    setPickedLandmark(null);
    setPickedCity(null);
    if (round.pairs.some((p) => p.landmarkId === landmarkId && p.city === city)) {
      setMatched((prev) => [...prev, city]);
      onScore(POINTS_PER_ANSWER);
      return;
    }
    setMistakes((m) => m + 1);
    setWrong({ landmarkId, city });
    if (clearWrong.current) clearTimeout(clearWrong.current);
    clearWrong.current = setTimeout(() => setWrong(null), WRONG_FLASH_MS);
  }

  function pickLandmark(landmarkId: string) {
    if (pickedCity) attempt(landmarkId, pickedCity);
    else setPickedLandmark(landmarkId === pickedLandmark ? null : landmarkId);
  }

  function pickCity(city: string) {
    if (pickedLandmark) attempt(pickedLandmark, city);
    else setPickedCity(city === pickedCity ? null : city);
  }

  function tileStyle(state: { done: boolean; picked: boolean; wrong: boolean }) {
    if (state.done) return { borderColor: "var(--brand-gold)", background: "var(--surface-2)", opacity: 0.6 };
    if (state.wrong) return { borderColor: "#F87171", background: "var(--surface-2)" };
    if (state.picked) return { borderColor: "var(--brand-gold-light)", background: "var(--brand-green)" };
    return { borderColor: "var(--brand-line)", background: "var(--surface-2)" };
  }

  const tileClass = "rounded-xl border-2 p-3 text-start text-sm font-semibold transition enabled:hover:brightness-125";
  const finished = matched.length === round.pairs.length;

  return (
    <div>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {t(
          `اختر معلمًا ثم المدينة التي يقع فيها. الأخطاء: ${mistakes}`,
          `Pick a landmark, then the city it is in. Mistakes: ${mistakes}`
        )}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold" style={{ color: "var(--brand-gold-light)" }}>{t("المعالم", "Landmarks")}</p>
          {round.pairs.map((pair) => (
            <button
              key={pair.landmarkId}
              onClick={() => pickLandmark(pair.landmarkId)}
              disabled={matched.includes(pair.city)}
              className={tileClass}
              style={tileStyle({
                done: matched.includes(pair.city),
                picked: pickedLandmark === pair.landmarkId,
                wrong: wrong?.landmarkId === pair.landmarkId,
              })}
            >
              {pair.name}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold" style={{ color: "var(--brand-gold-light)" }}>{t("المدن", "Cities")}</p>
          {round.cities.map((city) => (
            <button
              key={city}
              onClick={() => pickCity(city)}
              disabled={matched.includes(city)}
              className={tileClass}
              style={tileStyle({
                done: matched.includes(city),
                picked: pickedCity === city,
                wrong: wrong?.city === city,
              })}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {finished && (
        <GameResult
          title={
            mistakes === 0
              ? t("ممتاز! بدون أي خطأ", "Excellent! Not a single mistake")
              : t("أحسنت! ربطت كل المعالم بمدنها", "Well done! Every landmark is matched to its city")
          }
          detail={t(`عدد الأخطاء: ${mistakes}.`, `Mistakes: ${mistakes}.`)}
          onRestart={onRestart}
        />
      )}
    </div>
  );
}
