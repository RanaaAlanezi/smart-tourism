"use client";

import Link from "next/link";
import Image from "next/image";
import { Thermometer } from "lucide-react";
import { Landmark } from "@/lib/types";
import { CATEGORY_LABEL, CATEGORY_GRADIENT } from "@/lib/categories";
import { FavoriteButton } from "./FavoriteButton";

export function DestinationCard({
  landmark,
  temp,
  variant = "compact",
  favorited = false,
  signedIn = true,
  onToggleFavorite,
}: {
  landmark: Landmark;
  temp?: number;
  variant?: "compact" | "full";
  favorited?: boolean;
  signedIn?: boolean;
  onToggleFavorite?: (id: string) => void;
}) {
  const image = landmark.image;

  return (
    <Link
      href={`/landmarks/${landmark.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:bg-white/5"
      style={{ borderColor: "var(--brand-line)" }}
    >
      <div
        className="relative flex h-36 items-end overflow-hidden p-4"
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
        <span className="relative rounded-full bg-white/90 px-3 py-1 text-[0.7rem] font-semibold text-zinc-800">
          {CATEGORY_LABEL[landmark.category]}
        </span>
        {temp !== undefined && (
          <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
            <Thermometer size={12} />
            {Math.round(temp)}°
          </span>
        )}
        {onToggleFavorite && (
          <div className="absolute top-3 right-3">
            <FavoriteButton
              active={favorited}
              signedIn={signedIn}
              onToggle={() => onToggleFavorite(landmark.id)}
            />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 text-xs text-zinc-400">{landmark.city}</div>
        <div className="mb-1.5 font-bold leading-snug">{landmark.name}</div>
        <p className="line-clamp-2 text-sm text-zinc-500">{landmark.summary}</p>

        {variant === "full" && (
          <span
            className="mt-4 inline-flex w-fit items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{ background: "var(--brand-green)", color: "white" }}
          >
            عرض التفاصيل
          </span>
        )}
      </div>
    </Link>
  );
}
