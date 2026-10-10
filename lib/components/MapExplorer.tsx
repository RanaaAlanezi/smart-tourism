"use client";

import { useMemo, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { SaudiMap } from "./SaudiMap";
import { MapDetailPanel } from "./MapDetailPanel";
import { Landmark as LandmarkType } from "@/lib/types";
import { FilterCategory, FILTER_LABELS, filterLabel, CATEGORY_ICON, CATEGORY_PIN_COLOR } from "@/lib/categories";
import { useLang } from "@/lib/i18n";

export function MapExplorer({
  landmarks,
  height = 520,
  showFilters = true,
  initialSelectedId,
}: {
  landmarks: LandmarkType[];
  height?: number;
  showFilters?: boolean;
  initialSelectedId?: string;
}) {
  const { lang, t } = useLang();
  const [category, setCategory] = useState<FilterCategory | "all">("all");
  // Held by id rather than as the landmark itself, so the detail panel
  // follows a language switch instead of keeping the old language's copy.
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const selected = landmarks.find((l) => l.id === selectedId) ?? null;

  const filtered = useMemo(
    () => (category === "all" ? landmarks : landmarks.filter((l) => l.category === category)),
    [landmarks, category]
  );

  return (
    <div
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border md:flex-row"
      style={{ borderColor: "var(--brand-line)", height: "auto" }}
    >
      {showFilters && (
        <div
          className="flex min-w-0 shrink-0 gap-2 overflow-x-auto border-b p-3 md:w-40 md:flex-col md:overflow-visible md:border-b-0 md:border-e"
          style={{ borderColor: "var(--brand-line)", background: "var(--surface)" }}
        >
          <button
            onClick={() => setCategory("all")}
            className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap"
            style={
              category === "all"
                ? { background: "var(--brand-gold)", color: "var(--brand-green-dark)" }
                : { color: "var(--foreground)" }
            }
          >
            <LayoutGrid size={16} />
            {t("الكل", "All")}
          </button>
          {(Object.keys(FILTER_LABELS) as FilterCategory[]).map((c) => {
            const Icon = CATEGORY_ICON[c];
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap"
                style={
                  category === c
                    ? { background: "var(--brand-gold)", color: "var(--brand-green-dark)" }
                    : { color: "var(--foreground)" }
                }
              >
                <Icon size={16} style={category === c ? undefined : { color: CATEGORY_PIN_COLOR[c] }} />
                {filterLabel(c, lang)}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative flex-1" style={{ height, background: "linear-gradient(160deg,#05100C,#0B5D48)" }}>
        <SaudiMap landmarks={filtered} selectedId={selected?.id} onSelect={(landmark) => setSelectedId(landmark?.id ?? null)} />
      </div>

      <div
        className="shrink-0 border-t md:w-72 md:border-t-0 md:border-s"
        style={{ borderColor: "var(--brand-line)", background: "var(--surface)", minHeight: 180 }}
      >
        <MapDetailPanel landmark={selected} />
      </div>
    </div>
  );
}
