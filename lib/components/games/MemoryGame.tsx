"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { MemoryRound, POINTS_PER_ANSWER } from "@/lib/games";
import { useLang } from "@/lib/i18n";
import { GameResult } from "./GameResult";

// How long a wrong pair stays face-up before flipping back.
const FLIP_BACK_MS = 900;

export function MemoryGame({
  round,
  onScore,
  onRestart,
}: {
  round: MemoryRound;
  onScore: (points: number) => void;
  onRestart: () => void;
}) {
  const { t } = useLang();
  // Indexes of the (at most two) cards turned over and not yet matched.
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const flipBack = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (flipBack.current) clearTimeout(flipBack.current);
  }, []);

  function turnOver(index: number) {
    const card = round.cards[index];
    if (open.length === 2 || open.includes(index) || matched.includes(card.landmarkId)) return;

    if (open.length === 0) {
      setOpen([index]);
      return;
    }

    setMoves((m) => m + 1);
    if (round.cards[open[0]].landmarkId === card.landmarkId) {
      setMatched((prev) => [...prev, card.landmarkId]);
      setOpen([]);
      onScore(POINTS_PER_ANSWER);
    } else {
      setOpen([open[0], index]);
      flipBack.current = setTimeout(() => setOpen([]), FLIP_BACK_MS);
    }
  }

  const finished = matched.length === round.pairs;

  return (
    <div>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {t(
          `اقلب بطاقتين في كل مرة، وطابق صورة كل معلم باسمه. المحاولات: ${moves}`,
          `Turn over two cards at a time and match each landmark's photo to its name. Moves: ${moves}`
        )}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {round.cards.map((card, index) => {
          const isMatched = matched.includes(card.landmarkId);
          const faceUp = isMatched || open.includes(index);
          return (
            <button
              key={card.key}
              onClick={() => turnOver(index)}
              disabled={faceUp}
              aria-label={faceUp ? card.name : t("بطاقة مقلوبة", "Face-down card")}
              className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border-2 p-2 text-center text-xs font-bold transition sm:text-sm"
              style={{
                borderColor: isMatched ? "var(--brand-gold)" : "var(--brand-line)",
                background: faceUp ? "var(--surface-2)" : "var(--brand-green)",
              }}
            >
              {!faceUp && <Sparkles size={22} color="var(--brand-gold-light)" />}
              {faceUp && card.kind === "image" && (
                <Image src={card.image} alt={card.name} fill sizes="(max-width: 640px) 33vw, 200px" className="object-cover" />
              )}
              {faceUp && card.kind === "name" && card.name}
            </button>
          );
        })}
      </div>

      {finished && (
        <GameResult
          title={t("أحسنت! طابقت كل المعالم", "Well done! You matched every landmark")}
          detail={t(`أنهيت اللعبة في ${moves} محاولة.`, `You finished in ${moves} moves.`)}
          onRestart={onRestart}
        />
      )}
    </div>
  );
}
