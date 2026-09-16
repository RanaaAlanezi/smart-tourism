"use client";

import { MAP_VIEW, project, SAUDI_BORDER, smoothClosedPath } from "@/lib/landmark-coords";
import { Landmark } from "@/lib/types";

const BORDER_PATH = smoothClosedPath(SAUDI_BORDER.map(([lon, lat]) => project(lat, lon)));

export function SaudiMap({
  landmarks,
  selectedId,
  onSelect,
  interactive = true,
}: {
  landmarks: Landmark[];
  selectedId?: string | null;
  onSelect?: (landmark: Landmark) => void;
  interactive?: boolean;
}) {
  return (
    <svg viewBox={`0 0 ${MAP_VIEW.width} ${MAP_VIEW.height}`} className="h-full w-full">
      <defs>
        <pattern id="map-dots" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.3" fill="rgba(241,237,225,0.09)" />
        </pattern>
        <radialGradient id="map-shade" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="rgba(199,154,69,0.16)" />
          <stop offset="100%" stopColor="rgba(199,154,69,0)" />
        </radialGradient>
      </defs>
      <rect width={MAP_VIEW.width} height={MAP_VIEW.height} fill="url(#map-dots)" />
      <path
        d={BORDER_PATH}
        fill="url(#map-shade)"
        stroke="var(--brand-gold-light)"
        strokeWidth="1.5"
        strokeOpacity="0.55"
      />
      <text
        x={MAP_VIEW.width / 2}
        y={MAP_VIEW.height / 2 + 10}
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fill="rgba(241,237,225,0.18)"
      >
        المملكة العربية السعودية
      </text>

      {landmarks.map((l) => {
        if (l.latitude === undefined || l.longitude === undefined) return null;
        const { x, y } = project(l.latitude, l.longitude);
        const isSelected = selectedId === l.id;
        return (
          <g
            key={l.id}
            transform={`translate(${x},${y})`}
            className={interactive ? "cursor-pointer" : ""}
            onClick={() => interactive && onSelect?.(l)}
          >
            <circle r={isSelected ? 13 : 9} fill="var(--brand-gold)" opacity={isSelected ? 0.35 : 0.25} />
            <circle r="5" fill="var(--brand-gold-light)" stroke="#05100C" strokeWidth="1.5" />
          </g>
        );
      })}
    </svg>
  );
}
