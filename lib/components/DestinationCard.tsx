"use client";

import Link from "next/link";
import Image from "next/image";
import { Thermometer, MapPin, ArrowLeft, Sparkles } from "lucide-react";
import { Landmark } from "@/lib/types";
import { CATEGORY_LABEL, CATEGORY_GRADIENT } from "@/lib/categories";
import { FavoriteButton } from "./FavoriteButton";

export function DestinationCard({
  landmark,
  temp,
  favorited = false,
  signedIn = true,
  onToggleFavorite,
  aiNote,
}: {
  landmark: Landmark;
  temp?: number;
  favorited?: boolean;
  signedIn?: boolean;
  onToggleFavorite?: (id: string) => void;
  // Optional short AI-generated line (e.g. "why this matches your
  // interests") shown below the summary — only used by the personalized
  // recommendations feature, absent everywhere else.
  aiNote?: string;
}) {
  const image = landmark.image;

  return (
    <Link
      href={`/landmarks/${landmark.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border transition hover:-translate-y-1"
      style={{ borderColor: "var(--brand-line)", background: "var(--surface)" }}
    >
      <div
        className="relative flex h-36 items-end overflow-hidden p-3"
        style={image ? undefined : { background: CATEGORY_GRADIENT[landmark.category] }}
      >
        {image && (
          <>
            <Image
              src={image}
              alt={landmark.name}
              fill
              sizes="(max-width: 768px) 100vw, 25vw"
              className="object-cover transition group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
          </>
        )}
        {onToggleFavorite && (
          <div className="absolute top-3 left-3">
            <FavoriteButton
              active={favorited}
              signedIn={signedIn}
              onToggle={() => onToggleFavorite(landmark.id)}
            />
          </div>
        )}
        {temp !== undefined && (
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            <Thermometer size={12} />
            {Math.round(temp)}°
          </span>
        )}
        <span className="relative rounded-full bg-white/90 px-3 py-1 text-[0.7rem] font-semibold text-zinc-800">
          {CATEGORY_LABEL[landmark.category]}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1.5 font-bold leading-snug">{landmark.name}</div>
        <div className="mb-2 flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
          <MapPin size={12} />
          {landmark.city}
        </div>
        <p className="mb-3 line-clamp-2 text-sm" style={{ color: "var(--text-muted)" }}>
          {landmark.summary}
        </p>

        {aiNote && (
          <p className="mb-3 flex items-start gap-1.5 text-xs leading-relaxed" style={{ color: "var(--brand-gold-light)" }}>
            <Sparkles size={12} className="mt-0.5 shrink-0" />
            <span>{aiNote}</span>
          </p>
        )}

        <span
          className="mt-auto inline-flex w-fit items-center gap-1 text-sm font-semibold"
          style={{ color: "var(--brand-gold-light)" }}
        >
          عرض التفاصيل
          <ArrowLeft size={14} />
        </span>
      </div>
    </Link>
  );
}
