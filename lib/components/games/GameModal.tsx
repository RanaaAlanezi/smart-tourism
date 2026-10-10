"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { GameSession, GameStage, gameInfo } from "./GamesPanel";

// Plays a game in a dialog over the current page (used on landmark pages,
// where the game shouldn't push the landmark's content away).
export function GameModal({
  session,
  onRestart,
  onClose,
  currentLandmarkId,
}: {
  session: GameSession;
  onRestart: () => void;
  onClose: () => void;
  currentLandmarkId?: string;
}) {
  const { t } = useLang();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Keep the page behind the dialog from scrolling.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const game = gameInfo(session.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      style={{ background: "rgba(5,16,12,0.82)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t(...game.title)}
        onClick={(e) => e.stopPropagation()}
        className="step-fade-in my-4 w-full max-w-3xl rounded-2xl border p-5 shadow-2xl md:p-6"
        style={{ borderColor: "var(--brand-line)", background: "var(--surface)" }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-extrabold">
            <game.icon size={18} color="var(--brand-gold)" />
            {t(...game.title)}
          </h2>
          <button
            onClick={onClose}
            aria-label={t("إغلاق اللعبة", "Close game")}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "var(--surface-2)" }}
          >
            <X size={16} />
          </button>
        </div>
        <GameStage session={session} onRestart={onRestart} currentLandmarkId={currentLandmarkId} />
      </div>
    </div>
  );
}
