"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, X } from "lucide-react";
import { POINTS_PER_ANSWER, TimelineRound } from "@/lib/games";
import { useLang } from "@/lib/i18n";
import { GameResult } from "./GameResult";

export function TimelineGame({
  round,
  onScore,
  onRestart,
}: {
  round: TimelineRound;
  onScore: (points: number) => void;
  onRestart: () => void;
}) {
  const { t } = useLang();
  const [order, setOrder] = useState(round.events);
  const [checked, setChecked] = useState(false);

  const correctOrder = [...round.events].sort((a, b) => a.year - b.year);
  const inPlace = (index: number) => order[index].id === correctOrder[index].id;
  const correctCount = order.filter((_, index) => inPlace(index)).length;

  function move(index: number, by: -1 | 1) {
    const next = [...order];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    setOrder(next);
  }

  function check() {
    setChecked(true);
    if (correctCount > 0) onScore(correctCount * POINTS_PER_ANSWER);
  }

  return (
    <div>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {t(
          "رتّب الأحداث من الأقدم في الأعلى إلى الأحدث في الأسفل باستخدام الأسهم.",
          "Use the arrows to put the events in order, oldest at the top and most recent at the bottom."
        )}
      </p>

      <ol className="mt-4 flex flex-col gap-2">
        {order.map((event, index) => {
          let borderColor = "var(--brand-line)";
          if (checked) borderColor = inPlace(index) ? "#8FD16B" : "#F87171";
          return (
            <li
              key={event.id}
              className="flex items-center gap-3 rounded-xl border-2 p-3"
              style={{ borderColor, background: "var(--surface-2)" }}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
              >
                {index + 1}
              </span>
              <span className="flex-1 text-sm font-semibold">{event.text}</span>

              {checked ? (
                <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold">
                  {event.year}
                  {inPlace(index) ? <Check size={16} color="#8FD16B" /> : <X size={16} color="#F87171" />}
                </span>
              ) : (
                <span className="flex shrink-0 gap-1">
                  <button
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={t("تحريك للأعلى", "Move up")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border disabled:opacity-30"
                    style={{ borderColor: "var(--brand-line)" }}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    onClick={() => move(index, 1)}
                    disabled={index === order.length - 1}
                    aria-label={t("تحريك للأسفل", "Move down")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border disabled:opacity-30"
                    style={{ borderColor: "var(--brand-line)" }}
                  >
                    <ArrowDown size={15} />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {!checked && (
        <button
          onClick={check}
          className="mt-4 rounded-full px-5 py-2 text-sm font-semibold"
          style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
        >
          {t("تحقق من الترتيب", "Check the order")}
        </button>
      )}

      {checked && (
        <GameResult
          title={
            correctCount === order.length
              ? t("ممتاز! الترتيب صحيح", "Excellent! The order is right")
              : t("هذه نتيجتك", "Here is your result")
          }
          detail={t(
            `${correctCount} من ${order.length} أحداث في مكانها الصحيح. السنة مكتوبة بجانب كل حدث.`,
            `${correctCount} of ${order.length} events are in the right place. The year is shown beside each one.`
          )}
          onRestart={onRestart}
        />
      )}
    </div>
  );
}
