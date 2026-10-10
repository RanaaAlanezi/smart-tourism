"use client";

import { useMemo, useState } from "react";
import { Brain, CircleHelp, Link2, ListOrdered, Trophy } from "lucide-react";
import { Landmark } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import {
  addGamePoints,
  buildMatchRound,
  buildMemoryRound,
  buildQuizRound,
  buildTimelineRound,
  getTimelineEvents,
  levelFor,
  MatchRound,
  MemoryRound,
  POINTS_PER_LEVEL,
  QuizRound,
  TIMELINE_MIN_EVENTS,
  TimelineRound,
  useGamePoints,
} from "@/lib/games";
import { MemoryGame } from "./MemoryGame";
import { QuizGame } from "./QuizGame";
import { MatchGame } from "./MatchGame";
import { TimelineGame } from "./TimelineGame";

export type GameId = "memory" | "quiz" | "match" | "timeline";

// Titles and subtitles as [Arabic, English].
export const GAMES: { id: GameId; title: [string, string]; subtitle: [string, string]; icon: typeof Brain }[] = [
  { id: "memory", title: ["لعبة الذاكرة", "Memory Game"], subtitle: ["طابق صورة كل معلم باسمه", "Match each photo to its name"], icon: Brain },
  { id: "quiz", title: ["اختبار المعلومات", "Knowledge Quiz"], subtitle: ["أسئلة عن معالم السعودية", "Questions about Saudi landmarks"], icon: CircleHelp },
  { id: "match", title: ["مطابقة العناصر", "Matching"], subtitle: ["اربط كل معلم بمدينته", "Link each landmark to its city"], icon: Link2 },
  { id: "timeline", title: ["ترتيب الأحداث", "Timeline"], subtitle: ["رتّب الأحداث على الخط الزمني", "Put the events in order"], icon: ListOrdered },
];

// The game being played and the round dealt for it. `deal` changes on
// every new round, so "play again" remounts the game with fresh state.
export type GameSession = { deal: number } & (
  | { id: "memory"; round: MemoryRound }
  | { id: "quiz"; round: QuizRound }
  | { id: "match"; round: MatchRound }
  | { id: "timeline"; round: TimelineRound }
);

// Deals game rounds from `landmarks` (already in the language being shown).
// With a `focus` landmark (on that landmark's own page) the rounds are
// about it and its surroundings.
export function useGameSession(landmarks: Landmark[], focus?: Landmark) {
  const { lang } = useLang();
  const [session, setSession] = useState<GameSession | null>(null);

  // The timeline needs landmarks with dated key facts, which only some
  // have — the other games work from names, photos and cities alone.
  const timelineReady = useMemo(
    () => new Set(getTimelineEvents(landmarks).map((e) => e.year)).size >= TIMELINE_MIN_EVENTS,
    [landmarks]
  );

  // Rounds are dealt here, in response to a click, rather than while
  // rendering — they're random, and rendering has to stay repeatable.
  function start(id: GameId) {
    const deal = (session?.deal ?? 0) + 1;
    let next: GameSession | null = null;
    if (id === "memory") {
      const round = buildMemoryRound(landmarks, focus, lang);
      if (round) next = { id, round, deal };
    } else if (id === "quiz") {
      const round = buildQuizRound(landmarks, focus, lang);
      if (round) next = { id, round, deal };
    } else if (id === "match") {
      const round = buildMatchRound(landmarks, focus, lang);
      if (round) next = { id, round, deal };
    } else {
      const round = buildTimelineRound(landmarks, focus, lang);
      if (round) next = { id, round, deal };
    }
    setSession(next);
  }

  return {
    session,
    start,
    restart: () => session && start(session.id),
    close: () => setSession(null),
    timelineReady,
  };
}

export function gameInfo(id: GameId) {
  return GAMES.find((g) => g.id === id) ?? GAMES[0];
}

// The player's running points and level.
export function PointsBadge() {
  const { t } = useLang();
  const points = useGamePoints();
  return (
    <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--brand-line)", background: "var(--surface)" }}>
      <div className="flex items-center justify-between gap-4 text-sm font-bold">
        <span className="flex items-center gap-1.5">
          <Trophy size={15} color="var(--brand-gold)" />
          {t(`${points} نقطة`, `${points} points`)}
        </span>
        <span style={{ color: "var(--brand-gold-light)" }}>
          {t(`المستوى ${levelFor(points)}`, `Level ${levelFor(points)}`)}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${points % POINTS_PER_LEVEL}%`, background: "var(--brand-gold)" }}
        />
      </div>
    </div>
  );
}

// The list of games to choose from — a 2-column grid on the games page, a
// single column in the landmark page's sidebar.
export function GamePicker({
  onStart,
  timelineReady,
  columns = 2,
}: {
  onStart: (id: GameId) => void;
  timelineReady: boolean;
  columns?: 1 | 2;
}) {
  const { t } = useLang();
  return (
    <div className={`grid grid-cols-1 gap-3 ${columns === 2 ? "sm:grid-cols-2 sm:gap-4" : ""}`}>
      {GAMES.map((game) => {
        const unavailable = game.id === "timeline" && !timelineReady;
        return (
          <button
            key={game.id}
            onClick={() => onStart(game.id)}
            disabled={unavailable}
            className="group flex items-center gap-3 rounded-2xl border p-4 text-start transition enabled:hover:-translate-y-0.5 enabled:hover:border-[var(--brand-gold)] disabled:opacity-50"
            style={{ borderColor: "var(--brand-line)", background: columns === 2 ? "var(--surface)" : "var(--surface-2)" }}
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--brand-green)" }}
            >
              <game.icon size={20} color="var(--brand-gold-light)" />
            </span>
            <span>
              <span className="block text-sm font-extrabold">{t(...game.title)}</span>
              <span className="mt-0.5 block text-xs" style={{ color: "var(--text-muted)" }}>
                {unavailable ? t("تحتاج معالم بتواريخ موثّقة أكثر", "Needs more landmarks with confirmed dates") : t(...game.subtitle)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// The game currently being played.
export function GameStage({
  session,
  onRestart,
  currentLandmarkId,
}: {
  session: GameSession;
  onRestart: () => void;
  currentLandmarkId?: string;
}) {
  if (session.id === "memory") {
    return <MemoryGame key={session.deal} round={session.round} onScore={addGamePoints} onRestart={onRestart} />;
  }
  if (session.id === "quiz") {
    return (
      <QuizGame
        key={session.deal}
        round={session.round}
        onScore={addGamePoints}
        onRestart={onRestart}
        currentLandmarkId={currentLandmarkId}
      />
    );
  }
  if (session.id === "match") {
    return <MatchGame key={session.deal} round={session.round} onScore={addGamePoints} onRestart={onRestart} />;
  }
  return <TimelineGame key={session.deal} round={session.round} onScore={addGamePoints} onRestart={onRestart} />;
}
