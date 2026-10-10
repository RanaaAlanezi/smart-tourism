"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, Maximize2 } from "lucide-react";
import { MAP_VIEW, project, SAUDI_BORDER, smoothClosedPath, spreadPoints } from "@/lib/landmark-coords";
import { CATEGORY_PIN_COLOR } from "@/lib/categories";
import { Landmark } from "@/lib/types";
import { useLang } from "@/lib/i18n";

const BORDER_PATH = smoothClosedPath(SAUDI_BORDER.map(([lon, lat]) => project(lat, lon)));

const RED_SEA_LABEL = project(20.2, 37.3);
const ARABIAN_GULF_LABEL = project(26.6, 51.6);
const COUNTRY_LABEL = { x: MAP_VIEW.width / 2, y: MAP_VIEW.height / 2 + 10 };

const MIN_ZOOM = 1;
const MAX_ZOOM = 24;
// Map-pin shape, drawn in screen pixels with its TIP at (0,0) — the landmark's
// true position — and a round head above it (radius 9, centre 16px up).
const PIN_PATH = "M0 0 C-2 -5 -9 -10 -9 -16 A9 9 0 1 1 9 -16 C9 -10 2 -5 0 0 Z";
const PIN_HEAD_Y = -16;
const PIN_HEIGHT = 25;
// Pin heads are ~18px wide; they are kept at least this far apart on screen.
const PIN_MIN_SEPARATION_PX = 18;
const DRAG_THRESHOLD_PX = 5;
const ANIMATION_MS = 320;

interface View {
  cx: number;
  cy: number;
  k: number;
}

const HOME_VIEW: View = { cx: MAP_VIEW.width / 2, cy: MAP_VIEW.height / 2, k: 1 };

function clampView(v: View): View {
  const k = Math.min(Math.max(v.k, MIN_ZOOM), MAX_ZOOM);
  const halfW = MAP_VIEW.width / (2 * k);
  const halfH = MAP_VIEW.height / (2 * k);
  return {
    k,
    cx: Math.min(Math.max(v.cx, halfW), MAP_VIEW.width - halfW),
    cy: Math.min(Math.max(v.cy, halfH), MAP_VIEW.height - halfH),
  };
}

interface MapPoint {
  id: string;
  x: number;
  y: number;
  landmark: Landmark;
}

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
  const { t } = useLang();
  // Only landmarks with real, verified coordinates ever get a pin.
  const points = useMemo<MapPoint[]>(
    () =>
      landmarks
        .filter((l) => l.latitude != null && l.longitude != null)
        .map((l) => ({ id: l.id, landmark: l, ...project(l.latitude as number, l.longitude as number) }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    [landmarks]
  );

  const [view, setView] = useState<View>(() => {
    // Deep link (?id=...) starts zoomed onto that landmark.
    const target = selectedId ? points.find((p) => p.id === selectedId) : undefined;
    return target ? clampView({ cx: target.x, cy: target.y, k: 6 }) : HOME_VIEW;
  });
  const viewRef = useRef(view);
  const rafRef = useRef(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 620, h: 520 });
  const [hoverId, setHoverId] = useState<string | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setSize({ w: width, h: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // px on screen per map unit at the current zoom; pins/labels are drawn in
  // screen pixels (scaled by `unit`) so they stay the same size at any zoom.
  const baseScale = Math.min(size.w / MAP_VIEW.width, size.h / MAP_VIEW.height);
  const pxPerUnit = baseScale * view.k;
  const unit = 1 / pxPerUnit;

  // Every landmark keeps its own pin; overlapping ones are nudged just enough
  // to stay individually visible/clickable. Recomputed only when the zoom
  // changes (panning doesn't move pins relative to each other).
  const placed = useMemo(() => spreadPoints(points, PIN_MIN_SEPARATION_PX * unit), [points, unit]);

  const setViewNow = useCallback((v: View) => {
    viewRef.current = v;
    setView(v);
  }, []);

  const animateTo = useCallback(
    (target: View) => {
      cancelAnimationFrame(rafRef.current);
      const from = viewRef.current;
      const to = clampView(target);
      const startedAt = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - startedAt) / ANIMATION_MS, 1);
        const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        setViewNow(
          clampView({
            k: from.k * (to.k / from.k) ** e,
            cx: from.cx + (to.cx - from.cx) * e,
            cy: from.cy + (to.cy - from.cy) * e,
          })
        );
        if (t < 1) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [setViewNow]
  );

  // Zoom keeping the map point under (clientX, clientY) fixed on screen.
  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number, animate: boolean) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const cur = viewRef.current;
      const scale = Math.min(rect.width / MAP_VIEW.width, rect.height / MAP_VIEW.height);
      const offX = clientX - rect.left - rect.width / 2;
      const offY = clientY - rect.top - rect.height / 2;
      const nextK = Math.min(Math.max(cur.k * factor, MIN_ZOOM), MAX_ZOOM);
      const focalX = cur.cx + offX / (scale * cur.k);
      const focalY = cur.cy + offY / (scale * cur.k);
      const next = { k: nextK, cx: focalX - offX / (scale * nextK), cy: focalY - offY / (scale * nextK) };
      if (animate) animateTo(next);
      else setViewNow(clampView(next));
    },
    [animateTo, setViewNow]
  );

  const zoomFromCentre = (factor: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor, true);
  };

  // Ctrl/⌘ + wheel zooms; a plain wheel is left alone so the page still scrolls.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !interactive) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      cancelAnimationFrame(rafRef.current);
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0022), false);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAt, interactive]);

  // ---- drag to pan -------------------------------------------------------
  const dragRef = useRef<{ x: number; y: number; view: View; pointerId: number } | null>(null);
  const movedRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || e.button !== 0) return;
    movedRef.current = false;
    dragRef.current = { x: e.clientX, y: e.clientY, view: viewRef.current, pointerId: e.pointerId };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!movedRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    if (!movedRef.current) {
      movedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      // capture only once it is really a drag, so plain clicks still reach the pins
      e.currentTarget.setPointerCapture(drag.pointerId);
    }
    const scale = baseScale * drag.view.k;
    setViewNow(clampView({ ...drag.view, cx: drag.view.cx - dx / scale, cy: drag.view.cy - dy / scale }));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const handlePinClick = (landmark: Landmark) => {
    if (movedRef.current) return;
    onSelect?.(landmark);
  };

  const viewBox = `${view.cx - MAP_VIEW.width / (2 * view.k)} ${view.cy - MAP_VIEW.height / (2 * view.k)} ${MAP_VIEW.width / view.k} ${MAP_VIEW.height / view.k}`;

  // Southern pins are drawn over northern ones (like a real map, so each pin's
  // head is never hidden by the tip of the one below it); selected / hovered
  // pins are drawn last so they always sit on top.
  const ordered = [...placed].sort((a, b) => {
    const rank = (p: MapPoint) => {
      if (p.id === selectedId) return 2;
      return p.id === hoverId ? 1 : 0;
    };
    return rank(a) - rank(b) || a.y - b.y;
  });

  const controlStyle = { background: "var(--surface)", borderColor: "var(--brand-line)", color: "var(--foreground)" };

  return (
    <div ref={wrapRef} className="relative h-full w-full select-none">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="h-full w-full"
        style={{
          touchAction: view.k > 1.02 ? "none" : "pan-y",
          cursor: interactive && view.k > 1.02 ? "grab" : "default",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={(e) => interactive && zoomAt(e.clientX, e.clientY, 2, true)}
      >
        <defs>
          <pattern id="map-dots" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform={`scale(${unit})`}>
            <circle cx="1.5" cy="1.5" r="1.3" fill="rgba(241,237,225,0.09)" />
          </pattern>
          <linearGradient id="map-land" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1D5B44" />
            <stop offset="100%" stopColor="#0E3F30" />
          </linearGradient>
        </defs>

        {/* ocean background (oversized so panning/zooming never reveals an edge) */}
        <rect x={-MAP_VIEW.width} y={-MAP_VIEW.height} width={MAP_VIEW.width * 3} height={MAP_VIEW.height * 3} fill="url(#map-dots)" />

        {/* landmass */}
        <path
          d={BORDER_PATH}
          fill="url(#map-land)"
          stroke="var(--brand-gold-light)"
          strokeWidth="2"
          strokeOpacity="0.75"
          vectorEffect="non-scaling-stroke"
        />

        {/* geography labels: constant on-screen size at any zoom */}
        {[
          { at: COUNTRY_LABEL, text: t("المملكة العربية السعودية", "Kingdom of Saudi Arabia"), size: 15, weight: 700, fill: "rgba(241,237,225,0.35)", italic: false },
          { at: RED_SEA_LABEL, text: t("البحر الأحمر", "Red Sea"), size: 11, weight: 400, fill: "rgba(150,200,220,0.7)", italic: true },
          { at: ARABIAN_GULF_LABEL, text: t("الخليج العربي", "Arabian Gulf"), size: 11, weight: 400, fill: "rgba(150,200,220,0.7)", italic: true },
        ].map((l) => (
          <g key={l.text} transform={`translate(${l.at.x},${l.at.y}) scale(${unit})`} pointerEvents="none">
            <text textAnchor="middle" fontSize={l.size} fontWeight={l.weight} fontStyle={l.italic ? "italic" : "normal"} fill={l.fill}>
              {l.text}
            </text>
          </g>
        ))}

        {ordered.map((p) => {
          const { landmark } = p;
          const color = CATEGORY_PIN_COLOR[landmark.category];
          const isSelected = landmark.id === selectedId;
          const isHovered = landmark.id === hoverId;
          const showLabel = isSelected || isHovered;
          let pinScale = 1;
          if (isSelected) pinScale = 1.3;
          else if (isHovered) pinScale = 1.15;
          return (
            <g
              key={landmark.id}
              transform={`translate(${p.x},${p.y}) scale(${unit})`}
              className={interactive ? "cursor-pointer" : ""}
              role="button"
              tabIndex={interactive ? 0 : -1}
              aria-label={landmark.name}
              style={{ outline: "none" }}
              onClick={() => interactive && handlePinClick(landmark)}
              onKeyDown={(e) => {
                if (interactive && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelect?.(landmark);
                }
              }}
              onDoubleClick={(e) => e.stopPropagation()}
              onPointerEnter={() => setHoverId(landmark.id)}
              onPointerLeave={() => setHoverId((h) => (h === landmark.id ? null : h))}
            >
              {/* generous invisible hit area over the pin's head */}
              <circle cy={PIN_HEAD_Y + 1} r="12" fill="transparent" />
              {/* soft ground shadow at the true position; a gold ring when selected */}
              {isSelected ? (
                <ellipse rx="11" ry="4.2" fill="rgba(228,200,146,0.18)" stroke="var(--brand-gold-light)" strokeWidth="2" />
              ) : (
                <ellipse rx="6.5" ry="2.4" fill="#000" opacity="0.35" />
              )}
              <g style={{ transform: `scale(${pinScale})`, transformOrigin: "0px 0px", transition: "transform 120ms ease-out" }}>
                <path d={PIN_PATH} fill={color} stroke="#05100C" strokeOpacity="0.6" strokeWidth="1.2" strokeLinejoin="round" />
                <ellipse cx="-3.2" cy="-19.6" rx="2.1" ry="3.6" transform="rotate(25 -3.2 -19.6)" fill="#fff" opacity="0.32" />
                <circle cy={PIN_HEAD_Y} r="4.4" fill="#05100C" opacity="0.3" />
                <circle cy={PIN_HEAD_Y} r="3.6" fill="#F1EDE1" />
              </g>
              {showLabel && (
                <text
                  y={-(PIN_HEIGHT * pinScale) - 5}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="700"
                  fill="#F1EDE1"
                  stroke="#05100C"
                  strokeWidth="4"
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  pointerEvents="none"
                >
                  {landmark.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {interactive && (
        <>
          <div className="absolute left-3 top-3 flex flex-col gap-2">
            <button
              type="button"
              aria-label={t("تكبير", "Zoom in")}
              onClick={() => zoomFromCentre(1.8)}
              disabled={view.k >= MAX_ZOOM - 0.01}
              className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:brightness-125 disabled:opacity-40"
              style={controlStyle}
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              aria-label={t("تصغير", "Zoom out")}
              onClick={() => zoomFromCentre(1 / 1.8)}
              disabled={view.k <= MIN_ZOOM + 0.01}
              className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:brightness-125 disabled:opacity-40"
              style={controlStyle}
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              aria-label={t("إعادة عرض كل المملكة", "Show the whole Kingdom")}
              onClick={() => animateTo(HOME_VIEW)}
              disabled={view.k <= MIN_ZOOM + 0.01}
              className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:brightness-125 disabled:opacity-40"
              style={controlStyle}
            >
              <Maximize2 size={15} />
            </button>
          </div>

          <div
            className="pointer-events-none absolute bottom-3 right-3 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: "rgba(5,16,12,0.65)", color: "var(--foreground)" }}
          >
            {t(`${points.length} معلم على الخريطة`, `${points.length} landmarks on the map`)}
          </div>
          <div
            className="pointer-events-none absolute bottom-3 left-3 hidden rounded-full px-3 py-1 text-[0.7rem] md:block"
            style={{ background: "rgba(5,16,12,0.65)", color: "var(--text-muted)" }}
          >
            {t("اسحبي للتحريك · Ctrl + عجلة الماوس للتكبير", "Drag to move · Ctrl + mouse wheel to zoom")}
          </div>
        </>
      )}
    </div>
  );
}
