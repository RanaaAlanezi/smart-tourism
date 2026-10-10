"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, X } from "lucide-react";
import { POINTS_PER_ANSWER, QuizRound } from "@/lib/games";
import { useLang } from "@/lib/i18n";
import { GameResult } from "./GameResult";

export function QuizGame({
  round,
  onScore,
  onRestart,
  currentLandmarkId,
}: {
  round: QuizRound;
  onScore: (points: number) => void;
  onRestart: () => void;
  // Set on a landmark's own page, where a "learn more" link back to that
  // same page would only reload it and lose the game.
  currentLandmarkId?: string;
}) {
  const { t } = useLang();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const total = round.questions.length;
  if (index >= total) {
    return (
      <GameResult
        title={
          correctCount === total
            ? t("ممتاز! كل إجاباتك صحيحة", "Excellent! Every answer was right")
            : t("انتهى الاختبار", "Quiz complete")
        }
        detail={t(
          `أجبت إجابة صحيحة عن ${correctCount} من ${total} أسئلة.`,
          `You got ${correctCount} of ${total} questions right.`
        )}
        onRestart={onRestart}
      />
    );
  }

  const question = round.questions[index];
  const answered = selected !== null;

  function choose(option: string) {
    if (answered) return;
    setSelected(option);
    if (option === question.answer) {
      setCorrectCount((c) => c + 1);
      onScore(POINTS_PER_ANSWER);
    }
  }

  function next() {
    setSelected(null);
    setIndex((i) => i + 1);
  }

  return (
    <div key={question.id} className="step-fade-in">
      <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
        {t(`السؤال ${index + 1} من ${total}`, `Question ${index + 1} of ${total}`)}
      </p>
      <h3 className="mt-2 text-lg font-extrabold">{question.prompt}</h3>

      {question.image && (
        <div className="relative mt-4 h-48 overflow-hidden rounded-xl sm:h-64">
          <Image
            src={question.image}
            alt={t("صورة المعلم", "Photo of the landmark")}
            fill
            sizes="(max-width: 768px) 100vw, 700px"
            className="object-cover"
          />
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {question.options.map((option) => {
          const isAnswer = option === question.answer;
          const isWrongPick = answered && option === selected && !isAnswer;
          let borderColor = "var(--brand-line)";
          if (answered && isAnswer) borderColor = "#8FD16B";
          if (isWrongPick) borderColor = "#F87171";
          return (
            <button
              key={option}
              onClick={() => choose(option)}
              disabled={answered}
              className="flex items-center justify-between gap-2 rounded-xl border-2 p-3 text-start text-sm font-semibold transition enabled:hover:brightness-125"
              style={{ borderColor, background: "var(--surface-2)" }}
            >
              {option}
              {answered && isAnswer && <Check size={16} color="#8FD16B" />}
              {isWrongPick && <X size={16} color="#F87171" />}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {question.landmarkId === currentLandmarkId ? (
            <span />
          ) : (
            <Link
              href={`/landmarks/${question.landmarkId}`}
              className="text-sm font-semibold underline underline-offset-4"
              style={{ color: "var(--brand-gold-light)" }}
            >
              {t("تعرّف أكثر على هذا المعلم", "Learn more about this landmark")}
            </Link>
          )}
          <button
            onClick={next}
            className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold"
            style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
          >
            {index + 1 === total ? t("عرض النتيجة", "See result") : t("السؤال التالي", "Next question")}
            <ArrowLeft size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
