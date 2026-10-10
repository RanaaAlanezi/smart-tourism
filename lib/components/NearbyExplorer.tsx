"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Map as MapIcon, MapPin } from "lucide-react";
import { Landmark } from "@/lib/types";
import { CATEGORY_GRADIENT, categoryLabel } from "@/lib/categories";
import { useLang } from "@/lib/i18n";
import { spreadPoints } from "@/lib/landmark-coords";

const VIEW = { width: 640, height: 380 };
const PADDING = 52;
const PIN_RADIUS = 15;
const MAX_PLACES = 10;
// Below this many landmarks a city isn't worth a map of its own, so the
// whole region is shown instead.
const MIN_CITY_PLACES = 3;

// The landmark being viewed plus its neighbours — the rest of its city, or
// of its region when the city has too few — nearest first.
function nearbyPlaces(landmarks: Landmark[], current: Landmark) {
  const inCity = landmarks.filter((l) => l.city === current.city);
  const byRegion = inCity.length < MIN_CITY_PLACES;
  const pool = byRegion ? landmarks.filter((l) => l.region === current.region) : inCity;

  const distance = (l: Landmark) => {
    if (l.id === current.id) return -1;
    if (l.latitude == null || l.longitude == null || current.latitude == null || current.longitude == null) {
      return Infinity;
    }
    return Math.hypot(l.latitude - current.latitude, l.longitude - current.longitude);
  };
  const places = [...pool].sort((a, b) => distance(a) - distance(b)).slice(0, MAX_PLACES);
  return { places, scope: byRegion ? current.region : current.city };
}

// Positions the places on the panel from their real coordinates, scaled so
// the group fills it. Pins that would overlap are nudged apart (see
// spreadPoints), so positions are approximate at this size.
function layoutPins(places: Landmark[]) {
  const located = places
    .map((place, index) => ({ place, number: index + 1 }))
    .filter(({ place }) => place.latitude != null && place.longitude != null);
  if (!located.length) return [];

  const lats = located.map(({ place }) => place.latitude as number);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  // A degree of longitude is shorter than a degree of latitude away from
  // the equator; without this the layout would be stretched sideways.
  const lonScale = Math.cos((midLat * Math.PI) / 180);
  const xs = located.map(({ place }) => (place.longitude as number) * lonScale);
  const ys = lats.map((lat) => -lat);
  const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const spanX = Math.max(Math.max(...xs) - Math.min(...xs), 0.004);
  const spanY = Math.max(Math.max(...ys) - Math.min(...ys), 0.004);
  const scale = Math.min((VIEW.width - 2 * PADDING) / spanX, (VIEW.height - 2 * PADDING) / spanY);

  const points = located.map(({ place, number }, i) => ({
    place,
    number,
    x: VIEW.width / 2 + (xs[i] - midX) * scale,
    y: VIEW.height / 2 + (ys[i] - midY) * scale,
  }));
  const margin = PIN_RADIUS + 6;
  return spreadPoints(points, PIN_RADIUS * 2 + 6).map((p) => ({
    ...p,
    x: Math.min(Math.max(p.x, margin), VIEW.width - margin),
    y: Math.min(Math.max(p.y, margin), VIEW.height - margin),
  }));
}

// A numbered, clickable map of the landmarks around the one being viewed.
export function NearbyExplorer({ landmarks, current }: { landmarks: Landmark[]; current: Landmark }) {
  const { lang, t } = useLang();
  const { places, scope } = useMemo(() => nearbyPlaces(landmarks, current), [landmarks, current]);
  const pins = useMemo(() => layoutPins(places), [places]);
  const [selectedId, setSelectedId] = useState(current.id);

  if (places.length < 2) return null;
  const selected = places.find((p) => p.id === selectedId) ?? current;

  return (
    <section className="rounded-2xl border p-5 md:p-6" style={{ borderColor: "var(--brand-line)", background: "var(--surface)" }}>
      <h2 className="flex items-center gap-2 text-lg font-extrabold">
        <MapIcon size={18} color="var(--brand-gold)" />
        {t(`خريطة معالم ${scope} التفاعلية`, `Interactive map of ${scope}`)}
      </h2>
      <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
        {t("اضغط على أي رقم لعرض المعلم.", "Tap any number to see that landmark.")}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {pins.length > 0 && (
          <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--brand-line)" }}>
            <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} className="block h-auto w-full" role="group" aria-label={t(`خريطة معالم ${scope}`, `Map of ${scope}`)}>
              <defs>
                <radialGradient id="nearby-ground" cx="50%" cy="45%" r="75%">
                  <stop offset="0%" stopColor="#1E5142" />
                  <stop offset="100%" stopColor="#0B231C" />
                </radialGradient>
                <pattern id="nearby-dots" width="22" height="22" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="#F1EDE1" opacity="0.08" />
                </pattern>
              </defs>
              <rect width={VIEW.width} height={VIEW.height} fill="url(#nearby-ground)" />
              <rect width={VIEW.width} height={VIEW.height} fill="url(#nearby-dots)" />

              {pins.map((pin) => {
                const isCurrent = pin.place.id === current.id;
                const isSelected = pin.place.id === selected.id;
                return (
                  <g
                    key={pin.place.id}
                    role="button"
                    tabIndex={0}
                    aria-label={pin.place.name}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedId(pin.place.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(pin.place.id);
                      }
                    }}
                    className="cursor-pointer outline-none"
                    transform={`translate(${pin.x} ${pin.y})`}
                  >
                    {isSelected && <circle r={PIN_RADIUS + 7} fill="#E4C892" opacity="0.25" />}
                    <circle
                      r={PIN_RADIUS}
                      fill={isCurrent ? "#0B5D48" : "#C79A45"}
                      stroke={isSelected ? "#FBF8F2" : "#05100C"}
                      strokeWidth={isSelected ? 3 : 1.5}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="14"
                      fontWeight="800"
                      fill={isCurrent ? "#E4C892" : "#05100C"}
                    >
                      {pin.number}
                    </text>
                  </g>
                );
              })}
            </svg>
            <p className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)", background: "var(--surface-2)" }}>
              {t(
                "المواقع تقريبية بحسب إحداثيات المعالم. الرقم 1 هو المعلم الذي تتصفحه.",
                "Positions are approximate, based on each landmark's coordinates. Number 1 is the landmark you are viewing."
              )}
            </p>
          </div>
        )}

        <div className="flex flex-col overflow-hidden rounded-xl border" style={{ borderColor: "var(--brand-line)", background: "var(--surface-2)" }}>
          <div
            className="relative h-36 w-full"
            style={selected.image ? undefined : { background: CATEGORY_GRADIENT[selected.category] }}
          >
            {selected.image && (
              <Image src={selected.image} alt={selected.name} fill sizes="(max-width: 768px) 100vw, 360px" className="object-cover" />
            )}
          </div>
          <div className="flex flex-1 flex-col p-4">
            <p className="font-extrabold leading-snug">{selected.name}</p>
            <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
              <MapPin size={12} />
              {selected.city} · {categoryLabel(selected.category, lang)}
            </p>
            <p className="mt-2 line-clamp-3 text-sm" style={{ color: "var(--text-muted)" }}>
              {selected.summary}
            </p>
            {selected.id === current.id ? (
              <p className="mt-auto pt-3 text-sm font-semibold" style={{ color: "var(--brand-gold-light)" }}>
                {t("أنت تتصفح هذا المعلم", "You are viewing this landmark")}
              </p>
            ) : (
              <Link
                href={`/landmarks/${selected.id}`}
                className="mt-auto flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold"
                style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)", marginTop: "0.75rem" }}
              >
                {t("عرض المعلم", "View landmark")}
                <ArrowLeft size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {places.map((place, index) => {
          const isSelected = place.id === selected.id;
          return (
            <button
              key={place.id}
              onClick={() => setSelectedId(place.id)}
              className="flex items-center gap-2 rounded-full border py-1 ps-1 pe-3 text-xs font-semibold transition hover:brightness-125"
              style={{
                borderColor: isSelected ? "var(--brand-gold)" : "var(--brand-line)",
                background: isSelected ? "var(--surface-2)" : "transparent",
              }}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold"
                style={{ background: "var(--brand-gold)", color: "var(--brand-green-dark)" }}
              >
                {index + 1}
              </span>
              {place.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
