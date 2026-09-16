"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, MapPin } from "lucide-react";
import { Landmark } from "@/lib/types";
import { LANDMARK_COORDS, MAP_VIEW, project, SAUDI_BORDER, smoothClosedPath } from "@/lib/landmark-coords";
import { LANDMARK_IMAGES } from "@/lib/landmark-images";
import { CATEGORY_LABEL } from "@/lib/categories";

const BORDER_PATH = smoothClosedPath(SAUDI_BORDER.map(([lon, lat]) => project(lat, lon)));

export function SaudiMap({
  landmarks,
  interactive = true,
  height = 520,
  initialSelectedId,
}: {
  landmarks: Landmark[];
  interactive?: boolean;
  height?: number;
  initialSelectedId?: string;
}) {
  // The map is only ever mounted once `landmarks` has finished loading (see
  // the map/homepage pages), so a lazy initializer is enough here — no
  // effect needed to sync a prop that won't change after mount.
  const [selected, setSelected] = useState<Landmark | null>(() =>
    initialSelectedId ? landmarks.find((l) => l.id === initialSelectedId) ?? null : null
  );

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border"
      style={{
        borderColor: "var(--brand-line)",
        height,
        background: "linear-gradient(160deg,#0A3F3E,#0B5D48)",
      }}
    >
      <svg viewBox={`0 0 ${MAP_VIEW.width} ${MAP_VIEW.height}`} className="h-full w-full">
        <defs>
          <pattern id="map-dots" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.3" fill="rgba(245,242,234,0.09)" />
          </pattern>
        </defs>
        <rect width={MAP_VIEW.width} height={MAP_VIEW.height} fill="url(#map-dots)" />
        <path
          d={BORDER_PATH}
          fill="rgba(245,242,234,0.07)"
          stroke="var(--brand-gold-light)"
          strokeWidth="1.5"
          strokeOpacity="0.55"
        />

        {landmarks.map((l) => {
          const coords = LANDMARK_COORDS[l.id];
          if (!coords) return null;
          const { x, y } = project(coords.lat, coords.lon);
          const isSelected = selected?.id === l.id;
          return (
            <g
              key={l.id}
              transform={`translate(${x},${y})`}
              className={interactive ? "cursor-pointer" : ""}
              onClick={() => interactive && setSelected(l)}
            >
              <circle r={isSelected ? 12 : 9} fill="var(--brand-gold)" opacity="0.28" />
              <circle r="5" fill="var(--brand-gold-light)" stroke="#0A3F3E" strokeWidth="1.5" />
            </g>
          );
        })}
      </svg>

      {!selected && interactive && (
        <div className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-xs text-white/80 backdrop-blur">
          <MapPin size={12} />
          اضغط على أي علامة لعرض التفاصيل
        </div>
      )}

      {selected && (
        <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-white p-4 shadow-xl sm:right-4 sm:left-auto sm:w-72">
          <button
            onClick={() => setSelected(null)}
            aria-label="إغلاق"
            className="absolute left-3 top-3 text-zinc-400 hover:text-zinc-600"
          >
            <X size={16} />
          </button>

          {LANDMARK_IMAGES[selected.id] && (
            <div className="relative mb-3 h-28 w-full overflow-hidden rounded-lg">
              <Image src={LANDMARK_IMAGES[selected.id]} alt={selected.name} fill className="object-cover" />
            </div>
          )}

          <div className="mb-1 text-xs text-zinc-400">
            {selected.city} · {CATEGORY_LABEL[selected.category]}
          </div>
          <div className="mb-3 font-bold leading-snug">{selected.name}</div>

          <Link
            href={`/landmarks/${selected.id}`}
            className="block rounded-lg px-4 py-2 text-center text-sm font-semibold text-white"
            style={{ background: "var(--brand-green)" }}
          >
            عرض المعلم
          </Link>
        </div>
      )}
    </div>
  );
}
