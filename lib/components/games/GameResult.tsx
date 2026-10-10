"use client";

import { RotateCcw, Trophy } from "lucide-react";
import { useLang } from "@/lib/i18n";

// The end-of-round panel shared by every game.
export function GameResult({
  title,
  detail,
  onRestart,
}: {
  title: string;
  detail: string;
  onRestart: () => void;
}) {
  const { t } = useLang();
  return (
    <div
      className="step-fade-in mt-6 flex flex-col items-center rounded-2xl border p-6 text-center"
      style={{ borderColor: "var(--brand-gold)", background: "var(--surface-2)" }}
    >
      <Trophy size={28} color="var(--brand-gold-light)" />
      <p className="mt-3 text-lg font-extrabold">{title}</p>
      <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
        {detail}
      </p>
      <button
        onClick={onRestart}
        className="mt-4 flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold"
        style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
      >
        <RotateCcw size={15} />
        {t("العب مرة أخرى", "Play again")}
      </button>
    </div>
  );
}
