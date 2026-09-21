"use client";

import { MAP_VIEW, project, SAUDI_BORDER, smoothClosedPath } from "@/lib/landmark-coords";
import { Landmark } from "@/lib/types";

const BORDER_PATH = smoothClosedPath(SAUDI_BORDER.map(([lon, lat]) => project(lat, lon)));

const RED_SEA_LABEL = project(20.2, 37.3);
const ARABIAN_GULF_LABEL = project(26.6, 51.6);

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
        <linearGradient id="map-land" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1D5B44" />
          <stop offset="100%" stopColor="#0E3F30" />
        </linearGradient>
        {landmarks.map(
          (l) =>
            l.image && (
              <clipPath key={l.id} id={`pin-clip-${l.id}`}>
                <circle r="15" />
              </clipPath>
            )
        )}
      </defs>

      {/* ocean background */}
      <rect width={MAP_VIEW.width} height={MAP_VIEW.height} fill="url(#map-dots)" />

      {/* landmass */}
      <path d={BORDER_PATH} fill="url(#map-land)" stroke="var(--brand-gold-light)" strokeWidth="2" strokeOpacity="0.75" />

      <text
        x={MAP_VIEW.width / 2}
        y={MAP_VIEW.height / 2 + 10}
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fill="rgba(241,237,225,0.35)"
      >
        المملكة العربية السعودية
      </text>

      <text
        x={RED_SEA_LABEL.x}
        y={RED_SEA_LABEL.y}
        textAnchor="middle"
        fontSize="11"
        fontStyle="italic"
        fill="rgba(150,200,220,0.7)"
      >
        البحر الأحمر
      </text>
      <text
        x={ARABIAN_GULF_LABEL.x}
        y={ARABIAN_GULF_LABEL.y}
        textAnchor="middle"
        fontSize="11"
        fontStyle="italic"
        fill="rgba(150,200,220,0.7)"
      >
        الخليج العربي
      </text>

      {landmarks.map((l) => {
        if (l.latitude == null || l.longitude == null) return null;
        const { x, y } = project(l.latitude, l.longitude);
        const isSelected = selectedId === l.id;
        return (
          <g
            key={l.id}
            transform={`translate(${x},${y})`}
            className={interactive ? "cursor-pointer" : ""}
            onClick={() => interactive && onSelect?.(l)}
          >
            <circle r={isSelected ? 20 : 17} fill="var(--brand-gold)" opacity={isSelected ? 0.35 : 0.2} />
            {l.image ? (
              <>
                <circle r="16" fill="#05100C" />
                <image
                  href={l.image}
                  x={-15}
                  y={-15}
                  width={30}
                  height={30}
                  clipPath={`url(#pin-clip-${l.id})`}
                  preserveAspectRatio="xMidYMid slice"
                />
                <circle
                  r="15.5"
                  fill="none"
                  stroke={isSelected ? "var(--brand-gold-light)" : "#F1EDE1"}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
              </>
            ) : (
              <>
                <circle r="9" fill="var(--brand-gold)" opacity="0.25" />
                <circle r="5" fill="var(--brand-gold-light)" stroke="#05100C" strokeWidth="1.5" />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
